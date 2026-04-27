"""Profitability & Liquidation Metrics."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.sales import Sale
from app.models.purchases import Purchase
from app.models.buyers import Buyer
from app.models.articles import Article

router = APIRouter(prefix="/profitability", tags=["profitability"])


@router.get("/buyer-ranking")
async def buyer_profitability(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Rank buyers by estimated profitability — not just volume."""
    result = await db.execute(
        select(
            Sale.buyer_id,
            Buyer.name,
            func.count(Sale.id).label("total_orders"),
            func.coalesce(func.sum(Sale.quantity_meters), 0).label("total_meters"),
            func.coalesce(func.sum(Sale.total_amount), 0).label("total_revenue"),
            func.coalesce(func.avg(Sale.unit_price), 0).label("avg_price"),
            func.coalesce(func.avg(Sale.final_price), 0).label("avg_final_price"),
            func.coalesce(func.avg(Sale.buyer_offer_price), 0).label("avg_offer_price"),
        )
        .join(Buyer, Sale.buyer_id == Buyer.id)
        .where(Sale.buyer_id.isnot(None))
        .group_by(Sale.buyer_id, Buyer.name)
        .order_by(func.sum(Sale.total_amount).desc())
        .limit(limit)
    )

    buyers = []
    for r in result.all():
        # Margin estimate: if we have offer vs final price, use that
        margin_pct = 0
        if r.avg_offer_price and r.avg_final_price and r.avg_offer_price > 0:
            margin_pct = round(((r.avg_final_price - r.avg_offer_price) / r.avg_offer_price) * 100, 1)

        buyers.append({
            "buyer_id": r.buyer_id,
            "name": r.name,
            "total_orders": r.total_orders,
            "total_meters": float(r.total_meters),
            "total_revenue": float(r.total_revenue),
            "avg_price_per_meter": round(float(r.avg_price), 2) if r.avg_price else 0,
            "margin_pct": margin_pct,
            "profitability_score": round(float(r.total_revenue) * max(1 + margin_pct / 100, 0.5) / 1000, 1),
        })

    return buyers


@router.get("/loss-detection")
async def loss_detection(db: AsyncSession = Depends(get_db)):
    """Detect stock sold at potential loss — heavy discounts or below-cost indicators."""
    # Sales where final_price < buyer_offer (buyer got better deal)
    result = await db.execute(
        select(
            Sale.id,
            Sale.voucher_number,
            Sale.voucher_date,
            Buyer.name.label("buyer_name"),
            Article.article_code,
            Sale.quantity_meters,
            Sale.buyer_offer_price,
            Sale.final_price,
        )
        .join(Buyer, Sale.buyer_id == Buyer.id, isouter=True)
        .join(Article, Sale.article_id == Article.id, isouter=True)
        .where(
            Sale.buyer_offer_price.isnot(None),
            Sale.final_price.isnot(None),
            Sale.final_price < Sale.buyer_offer_price,
        )
        .order_by((Sale.buyer_offer_price - Sale.final_price).desc())
        .limit(20)
    )

    losses = []
    for r in result.all():
        discount_pct = round((1 - r.final_price / r.buyer_offer_price) * 100, 1) if r.buyer_offer_price > 0 else 0
        losses.append({
            "sale_id": r.id,
            "voucher": r.voucher_number,
            "date": str(r.voucher_date) if r.voucher_date else None,
            "buyer": r.buyer_name,
            "article": r.article_code,
            "meters": float(r.quantity_meters) if r.quantity_meters else 0,
            "offer_price": float(r.buyer_offer_price),
            "final_price": float(r.final_price),
            "discount_pct": discount_pct,
        })

    return {"losses": losses, "total_flagged": len(losses)}


@router.get("/summary")
async def profitability_summary(db: AsyncSession = Depends(get_db)):
    """Overall profitability metrics."""
    # Total revenue
    rev = await db.execute(
        select(
            func.coalesce(func.sum(Sale.total_amount), 0),
            func.count(Sale.id),
        )
    )
    revenue = rev.one()

    # Total purchase cost
    cost = await db.execute(
        select(func.coalesce(func.sum(Purchase.total_amount), 0))
    )
    total_cost = cost.scalar()

    # Average negotiation discount
    neg = await db.execute(
        select(
            func.avg(Sale.buyer_offer_price),
            func.avg(Sale.final_price),
            func.count(Sale.id),
        ).where(Sale.buyer_offer_price.isnot(None), Sale.final_price.isnot(None))
    )
    neg_row = neg.one()
    avg_discount = 0
    if neg_row[0] and neg_row[1] and neg_row[0] > 0:
        avg_discount = round((1 - neg_row[1] / neg_row[0]) * 100, 1)

    return {
        "total_revenue": float(revenue[0]),
        "total_sales_count": revenue[1],
        "total_purchase_cost": float(total_cost or 0),
        "estimated_margin": float(revenue[0]) - float(total_cost or 0),
        "negotiated_sales": neg_row[2],
        "avg_negotiation_discount": avg_discount,
    }
