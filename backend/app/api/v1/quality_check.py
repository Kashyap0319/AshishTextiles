"""
Sale Quality Checker Bot — flags sales where mixed quality rolls are present.
From questionnaire: "If POPLIN sale has a roll of LYCRE TWILL, flag it."
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.sales import Sale
from app.models.articles import Article
from app.models.buyers import Buyer

router = APIRouter(prefix="/quality-check", tags=["quality-check"])


@router.get("/sale-flags")
async def check_sales_quality(
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """
    Find sales where different quality categories are mixed.
    Ashishji's rule: Each sale should be one quality only.
    If a POPLIN sale has LYCRE-TWILL rolls, flag it.
    """
    # Group sales by voucher_number + buyer — each should have one quality
    # Get vouchers with multiple distinct quality categories
    result = await db.execute(
        select(
            Sale.voucher_number,
            Sale.buyer_id,
            func.count(func.distinct(Article.quality_category)).label("quality_count"),
            func.array_agg(func.distinct(Article.quality_category)).label("qualities"),
            func.count(Sale.id).label("roll_count"),
            func.coalesce(func.sum(Sale.quantity_meters), 0).label("total_meters"),
        )
        .join(Article, Sale.article_id == Article.id)
        .where(
            Sale.voucher_number.isnot(None),
            Article.quality_category.isnot(None),
        )
        .group_by(Sale.voucher_number, Sale.buyer_id)
        .having(func.count(func.distinct(Article.quality_category)) > 1)
        .order_by(func.count(func.distinct(Article.quality_category)).desc())
        .limit(limit)
    )

    flags = []
    for r in result.all():
        # Get buyer name
        buyer_name = None
        if r.buyer_id:
            buyer = await db.execute(select(Buyer.name).where(Buyer.id == r.buyer_id))
            buyer_name = buyer.scalar()

        flags.append({
            "voucher_number": r.voucher_number,
            "buyer_id": r.buyer_id,
            "buyer_name": buyer_name,
            "quality_count": r.quality_count,
            "qualities": r.qualities if isinstance(r.qualities, list) else [],
            "roll_count": r.roll_count,
            "total_meters": float(r.total_meters),
            "severity": "high" if r.quality_count > 2 else "medium",
        })

    return {
        "flagged_sales": flags,
        "total_flagged": len(flags),
        "message": f"{len(flags)} sales have mixed quality rolls — review recommended",
    }


@router.get("/sale/{voucher_number}")
async def check_single_sale(voucher_number: str, db: AsyncSession = Depends(get_db)):
    """Check a specific sale for quality consistency."""
    result = await db.execute(
        select(
            Sale.id,
            Sale.voucher_date,
            Article.article_code,
            Article.quality_category,
            Article.quality_group,
            Sale.quantity_meters,
        )
        .join(Article, Sale.article_id == Article.id)
        .where(Sale.voucher_number == voucher_number)
        .order_by(Article.quality_category)
    )
    rows = result.all()
    if not rows:
        return {"error": "Sale not found"}

    qualities = set()
    items = []
    for r in rows:
        qualities.add(r.quality_category)
        items.append({
            "sale_id": r.id,
            "date": str(r.voucher_date) if r.voucher_date else None,
            "article": r.article_code,
            "quality": r.quality_category,
            "group": r.quality_group,
            "meters": float(r.quantity_meters) if r.quantity_meters else 0,
        })

    is_mixed = len(qualities) > 1
    return {
        "voucher_number": voucher_number,
        "is_mixed": is_mixed,
        "quality_count": len(qualities),
        "qualities": list(qualities),
        "items": items,
        "recommendation": "REVIEW: Mixed quality rolls detected!" if is_mixed else "OK: Single quality sale",
    }


@router.get("/stock-classification")
async def stock_classification_summary(db: AsyncSession = Depends(get_db)):
    """
    Stock classification from questionnaire:
    Dead Stock, Off-Shade, Mill Seconds, Remnants, Surplus, Manufactured
    Currently all stock is 'available' — this maps aging to classification.
    """
    from app.models.stock import StockEntry

    # Classify based on aging and available data
    total = await db.execute(
        select(func.count(StockEntry.id), func.coalesce(func.sum(StockEntry.meters), 0))
        .where(StockEntry.status == "available")
    )
    t = total.one()

    # Dead stock: >120 days
    dead = await db.execute(
        select(func.count(StockEntry.id), func.coalesce(func.sum(StockEntry.meters), 0))
        .where(StockEntry.status == "available", StockEntry.aging_days > 120)
    )
    d = dead.one()

    # Slow-moving: 90-120 days
    slow = await db.execute(
        select(func.count(StockEntry.id), func.coalesce(func.sum(StockEntry.meters), 0))
        .where(StockEntry.status == "available", StockEntry.aging_days > 90, StockEntry.aging_days <= 120)
    )
    s = slow.one()

    # Surplus: 60-90 days
    surplus = await db.execute(
        select(func.count(StockEntry.id), func.coalesce(func.sum(StockEntry.meters), 0))
        .where(StockEntry.status == "available", StockEntry.aging_days > 60, StockEntry.aging_days <= 90)
    )
    su = surplus.one()

    # Fresh: <60 days
    fresh = await db.execute(
        select(func.count(StockEntry.id), func.coalesce(func.sum(StockEntry.meters), 0))
        .where(StockEntry.status == "available", StockEntry.aging_days <= 60)
    )
    f = fresh.one()

    return {
        "total": {"lots": t[0], "meters": float(t[1])},
        "classifications": [
            {"type": "Dead Stock", "description": ">120 days, needs heavy markdown", "lots": d[0], "meters": float(d[1]), "color": "#dc2626"},
            {"type": "Slow Moving", "description": "90-120 days, needs attention", "lots": s[0], "meters": float(s[1]), "color": "#f59e0b"},
            {"type": "Surplus", "description": "60-90 days, standard surplus", "lots": su[0], "meters": float(su[1]), "color": "#8b5cf6"},
            {"type": "Fresh Stock", "description": "<60 days, recently received", "lots": f[0], "meters": float(f[1]), "color": "#22c55e"},
        ],
    }
