from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.buyers import Buyer
from app.schemas.buyers import BuyerCreate, BuyerResponse, BuyerUpdate
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/buyers", tags=["buyers"])


def normalize_buyer_name(name: str) -> str:
    return name.strip().upper().replace(".", "").replace(",", "")


@router.get("/", response_model=list[BuyerResponse])
async def list_buyers(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    buyer_type: str | None = None,
    is_active: bool | None = None,
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Buyer)
    if buyer_type:
        query = query.where(Buyer.buyer_type == buyer_type)
    if is_active is not None:
        query = query.where(Buyer.is_active == is_active)
    if search:
        from app.services.auth_service import sanitize_search
        query = query.where(Buyer.name.ilike(f"%{sanitize_search(search)}%", escape="\\"))
    query = query.order_by(Buyer.name).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/top", response_model=list[BuyerResponse])
async def top_buyers(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Buyer)
        .where(Buyer.is_active == True)
        .order_by(Buyer.total_purchases_meters.desc())
        .limit(limit)
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/count")
async def count_buyers(is_active: bool | None = None, db: AsyncSession = Depends(get_db)):
    query = select(func.count(Buyer.id))
    if is_active is not None:
        query = query.where(Buyer.is_active == is_active)
    result = await db.execute(query)
    return {"count": result.scalar()}


@router.get("/dormant")
async def dormant_buyers(
    days: int = Query(60, ge=7),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    from datetime import date, timedelta
    cutoff = date.today() - timedelta(days=days)
    query = (
        select(Buyer)
        .where(Buyer.is_active == True, Buyer.last_purchase_date < cutoff)
        .order_by(Buyer.total_purchases_meters.desc())
        .limit(limit)
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/duplicates/find")
async def find_duplicates(
    threshold: int = Query(80, ge=50, le=100),
    db: AsyncSession = Depends(get_db),
):
    from app.services.buyer_service import find_duplicate_buyers
    dupes = await find_duplicate_buyers(db, threshold)
    return {"groups": dupes, "total_groups": len(dupes)}


@router.post("/duplicates/merge")
async def merge_duplicate_buyers(
    keep_id: int = Query(...),
    merge_ids: str = Query(..., description="Comma-separated IDs to merge"),
    db: AsyncSession = Depends(get_db),
):
    from app.services.buyer_service import merge_buyers
    ids = [int(x.strip()) for x in merge_ids.split(",")]
    result = await merge_buyers(db, keep_id, ids)
    return result


@router.get("/{buyer_id}", response_model=BuyerResponse)
async def get_buyer(buyer_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Buyer).where(Buyer.id == buyer_id))
    buyer = result.scalar_one_or_none()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer not found")
    return buyer


@router.get("/{buyer_id}/whatsapp-card")
async def whatsapp_card(buyer_id: int, db: AsyncSession = Depends(get_db)):
    from app.services.whatsapp_card import generate_buyer_card
    card = await generate_buyer_card(buyer_id, db)
    if not card:
        raise HTTPException(status_code=404, detail="Buyer not found")
    return card


@router.post("/", response_model=BuyerResponse, status_code=201)
async def create_buyer(data: BuyerCreate, db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    buyer = Buyer(**data.model_dump())
    buyer.normalized_name = normalize_buyer_name(buyer.name)
    db.add(buyer)
    await db.flush()
    await db.refresh(buyer)
    return buyer


@router.put("/{buyer_id}", response_model=BuyerResponse)
async def update_buyer(buyer_id: int, data: BuyerUpdate, db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    result = await db.execute(select(Buyer).where(Buyer.id == buyer_id))
    buyer = result.scalar_one_or_none()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(buyer, key, value)
    if data.name:
        buyer.normalized_name = normalize_buyer_name(data.name)
    await db.flush()
    await db.refresh(buyer)
    return buyer


@router.delete("/{buyer_id}", status_code=204)
async def delete_buyer(buyer_id: int, db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    result = await db.execute(select(Buyer).where(Buyer.id == buyer_id))
    buyer = result.scalar_one_or_none()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer not found")
    await db.delete(buyer)
