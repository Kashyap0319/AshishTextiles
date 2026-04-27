from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.stock import StockEntry
from app.schemas.stock import AgingBucket, StockCreate, StockResponse, StockUpdate
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/stock", tags=["stock"])


@router.get("/")
async def list_stock(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    status: str | None = None,
    hall: str | None = None,
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    from app.utils.aging import get_auto_discount, get_aging_flag
    from app.models.articles import Article
    from sqlalchemy import or_
    from app.services.auth_service import sanitize_search
    query = select(StockEntry).join(Article, StockEntry.article_id == Article.id, isouter=True)
    if status:
        query = query.where(StockEntry.status == status)
    if hall:
        query = query.where(StockEntry.hall == hall)
    if search:
        s = sanitize_search(search)
        query = query.where(or_(
            Article.article_code.ilike(f"%{s}%", escape="\\"),
            Article.quality_category.ilike(f"%{s}%", escape="\\"),
            StockEntry.batch_number.ilike(f"%{s}%", escape="\\"),
            StockEntry.rack_number.ilike(f"%{s}%", escape="\\"),
            StockEntry.hall.ilike(f"%{s}%", escape="\\"),
        ))
    query = query.order_by(StockEntry.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    entries = result.scalars().all()

    enriched = []
    for e in entries:
        data = StockResponse.model_validate(e).model_dump()
        aging = e.aging_days or 0
        data["discount_pct"] = get_auto_discount(aging)
        data["aging_flag"] = get_aging_flag(aging)
        enriched.append(data)
    return enriched


@router.get("/aging", response_model=list[AgingBucket])
async def stock_aging(db: AsyncSession = Depends(get_db)):
    bucket = case(
        (StockEntry.aging_days <= 30, "0-30 days"),
        (StockEntry.aging_days <= 60, "31-60 days"),
        (StockEntry.aging_days <= 90, "61-90 days"),
        else_="90+ days",
    )
    query = (
        select(
            bucket.label("label"),
            func.count(StockEntry.id).label("count"),
            func.coalesce(func.sum(StockEntry.meters), 0).label("total_meters"),
        )
        .where(StockEntry.status == "available")
        .group_by(bucket)
    )
    result = await db.execute(query)
    rows = result.all()
    return [AgingBucket(label=r.label, count=r.count, total_meters=r.total_meters) for r in rows]


@router.get("/{stock_id}")
async def get_stock_entry(stock_id: int, db: AsyncSession = Depends(get_db)):
    from app.utils.aging import get_auto_discount, get_aging_flag
    result = await db.execute(select(StockEntry).where(StockEntry.id == stock_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Stock entry not found")
    data = StockResponse.model_validate(entry).model_dump()
    aging = entry.aging_days or 0
    data["discount_pct"] = get_auto_discount(aging)
    data["aging_flag"] = get_aging_flag(aging)
    return data


@router.post("/", response_model=StockResponse, status_code=201)
async def create_stock_entry(data: StockCreate, db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    from app.models.warehouse import Rack

    entry = StockEntry(**data.model_dump())
    db.add(entry)
    await db.flush()
    await db.refresh(entry)

    # Update rack current_meters
    if entry.rack_number:
        rack_result = await db.execute(select(Rack).where(Rack.rack_number == entry.rack_number))
        rack_obj = rack_result.scalar_one_or_none()
        if rack_obj:
            rack_obj.current_meters = (rack_obj.current_meters or 0) + entry.meters
            await db.flush()

    return entry


@router.put("/{stock_id}", response_model=StockResponse)
async def update_stock_entry(stock_id: int, data: StockUpdate, db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    result = await db.execute(select(StockEntry).where(StockEntry.id == stock_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Stock entry not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(entry, key, value)
    await db.flush()
    await db.refresh(entry)
    return entry


@router.delete("/{stock_id}", status_code=204)
async def delete_stock_entry(stock_id: int, db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    from app.models.warehouse import Rack

    result = await db.execute(select(StockEntry).where(StockEntry.id == stock_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Stock entry not found")

    # Decrement rack current_meters
    if entry.rack_number and entry.meters:
        rack_result = await db.execute(select(Rack).where(Rack.rack_number == entry.rack_number))
        rack_obj = rack_result.scalar_one_or_none()
        if rack_obj:
            rack_obj.current_meters = max((rack_obj.current_meters or 0) - entry.meters, 0)
            await db.flush()

    await db.delete(entry)


# ═══════════════ Not-Found Sale Workflow (Ashish's bale reconciliation) ═══════════════
# When rolls go missing during sorting, they get marked into a dummy "NOT FOUND/TRACED" sale.
# When the roll later appears in a real buyer sale, the system auto-prompts transfer.

@router.get("/not-found")
async def get_not_found_bales(db: AsyncSession = Depends(get_db)):
    """Return all bales currently marked as Not Found / Traced."""
    from app.models.sales import Sale
    result = await db.execute(
        select(Sale).where(Sale.narration.ilike("%NOT FOUND%")).order_by(Sale.created_at.desc())
    )
    sales = result.scalars().all()
    return [{
        "id": s.id,
        "voucher_number": s.voucher_number,
        "voucher_date": s.voucher_date,
        "batch_number": s.batch_number,
        "narration": s.narration,
        "quantity_meters": s.quantity_meters,
        "created_at": s.created_at,
    } for s in sales]


@router.post("/not-found")
async def mark_not_found(
    bale_numbers: list[str],
    notes: str | None = None,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Mark a list of bale numbers as Not Found during packing reconciliation."""
    from app.models.sales import Sale
    from datetime import date as dt

    created = []
    for bale in bale_numbers:
        sale = Sale(
            voucher_number=f"NF-{bale[-8:]}",
            voucher_date=dt.today(),
            narration=f"*NOT FOUND/TRACED* {notes or ''}".strip(),
            batch_number=bale,
            quantity_meters=0,
            quantity_pieces=1,
            sale_type="not_found",
            approval_status="approved",
        )
        db.add(sale)
        created.append(bale)
    await db.flush()
    return {"marked_not_found": len(created), "bale_numbers": created}


@router.post("/not-found/{bale}/reconcile")
async def reconcile_bale(
    bale: str,
    target_sale_id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Transfer a bale from not-found to an actual buyer sale."""
    from app.models.sales import Sale

    # Find the not-found entry
    nf_result = await db.execute(
        select(Sale).where(
            Sale.narration.ilike("%NOT FOUND%"),
            Sale.batch_number == bale,
        )
    )
    nf_sale = nf_result.scalar_one_or_none()
    if not nf_sale:
        raise HTTPException(404, f"Bale {bale} not in not-found list")

    # Verify target sale exists
    target_result = await db.execute(select(Sale).where(Sale.id == target_sale_id))
    target = target_result.scalar_one_or_none()
    if not target:
        raise HTTPException(404, f"Target sale {target_sale_id} not found")

    # Delete the not-found entry
    await db.delete(nf_sale)
    await db.flush()

    return {
        "status": "reconciled",
        "bale": bale,
        "moved_to_sale": target_sale_id,
        "buyer": target.narration,
    }


@router.get("/not-found/check/{bale}")
async def check_if_not_found(bale: str, db: AsyncSession = Depends(get_db)):
    """Quick lookup: is this bale marked not-found? Called when creating sales to auto-prompt transfer."""
    from app.models.sales import Sale
    result = await db.execute(
        select(Sale).where(
            Sale.narration.ilike("%NOT FOUND%"),
            Sale.batch_number == bale,
        )
    )
    nf = result.scalar_one_or_none()
    if nf:
        return {
            "is_not_found": True,
            "not_found_sale_id": nf.id,
            "marked_date": nf.voucher_date,
        }
    return {"is_not_found": False}
