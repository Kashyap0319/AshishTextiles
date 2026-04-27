from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.articles import Article
from app.models.buyers import Buyer
from app.models.sales import Sale
from app.models.purchases import Purchase
from app.models.stock import StockEntry

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
async def dashboard_summary(db: AsyncSession = Depends(get_db)):
    today = date.today()
    week_ago = today - timedelta(days=7)
    prev_week = today - timedelta(days=14)

    # Total stock
    stock_result = await db.execute(
        select(
            func.count(StockEntry.id).label("total_entries"),
            func.coalesce(func.sum(StockEntry.meters), 0).label("total_meters"),
        ).where(StockEntry.status == "available")
    )
    stock = stock_result.one()

    # Active buyers
    buyer_result = await db.execute(
        select(func.count(Buyer.id)).where(Buyer.is_active == True)
    )
    active_buyers = buyer_result.scalar()

    # Sales this week
    week_sales_result = await db.execute(
        select(
            func.count(Sale.id).label("count"),
            func.coalesce(func.sum(Sale.quantity_meters), 0).label("meters"),
            func.coalesce(func.sum(Sale.total_amount), 0).label("amount"),
        ).where(Sale.voucher_date >= week_ago)
    )
    week_sales = week_sales_result.one()

    # Sales prev week (for trend)
    prev_week_result = await db.execute(
        select(
            func.count(Sale.id).label("count"),
            func.coalesce(func.sum(Sale.quantity_meters), 0).label("meters"),
        ).where(and_(Sale.voucher_date >= prev_week, Sale.voucher_date < week_ago))
    )
    prev_week_sales = prev_week_result.one()

    # Aging stock (>60 days)
    aging_result = await db.execute(
        select(
            func.count(StockEntry.id).label("count"),
            func.coalesce(func.sum(StockEntry.meters), 0).label("meters"),
        ).where(StockEntry.status == "available", StockEntry.aging_days > 60)
    )
    aging = aging_result.one()

    # Aging breakdown
    bucket = case(
        (StockEntry.aging_days <= 30, "0-30"),
        (StockEntry.aging_days <= 60, "31-60"),
        (StockEntry.aging_days <= 90, "61-90"),
        else_="90+",
    )
    aging_breakdown_result = await db.execute(
        select(
            bucket.label("bucket"),
            func.count(StockEntry.id).label("count"),
            func.coalesce(func.sum(StockEntry.meters), 0).label("meters"),
        )
        .where(StockEntry.status == "available")
        .group_by(bucket)
    )
    aging_breakdown = [
        {"bucket": r.bucket, "count": r.count, "meters": float(r.meters)}
        for r in aging_breakdown_result.all()
    ]

    # Compute trends
    sales_trend = 0
    if prev_week_sales.count > 0:
        sales_trend = round(((week_sales.count - prev_week_sales.count) / prev_week_sales.count) * 100, 1)

    return {
        "total_stock_entries": stock.total_entries,
        "total_stock_meters": float(stock.total_meters),
        "active_buyers": active_buyers,
        "sales_this_week": {
            "count": week_sales.count,
            "meters": float(week_sales.meters),
            "amount": float(week_sales.amount),
            "trend": sales_trend,
        },
        "aging_stock": {
            "count": aging.count,
            "meters": float(aging.meters),
        },
        "aging_breakdown": aging_breakdown,
    }


@router.get("/actions")
async def today_actions(db: AsyncSession = Depends(get_db)):
    """Today's Action List — aging stock alerts, dormant buyers, top matches."""
    today = date.today()

    # 1. Critical aging stock (>90 days)
    critical_result = await db.execute(
        select(StockEntry)
        .where(StockEntry.status == "available", StockEntry.aging_days > 90)
        .order_by(StockEntry.aging_days.desc())
        .limit(10)
    )
    critical_stock = []
    for entry in critical_result.scalars().all():
        critical_stock.append({
            "id": entry.id,
            "article_id": entry.article_id,
            "batch": entry.batch_number,
            "meters": entry.meters,
            "aging_days": entry.aging_days,
            "rack": entry.rack_number,
            "hall": entry.hall,
        })

    # 2. Dormant buyers (no purchase in 60+ days, had significant history)
    cutoff = today - timedelta(days=60)
    dormant_result = await db.execute(
        select(Buyer)
        .where(
            Buyer.is_active == True,
            Buyer.last_purchase_date < cutoff,
            Buyer.total_purchases_meters > 1000,
        )
        .order_by(Buyer.total_purchases_meters.desc())
        .limit(10)
    )
    dormant_buyers = []
    for buyer in dormant_result.scalars().all():
        days_since = (today - buyer.last_purchase_date).days if buyer.last_purchase_date else None
        dormant_buyers.append({
            "id": buyer.id,
            "name": buyer.name,
            "total_meters": buyer.total_purchases_meters,
            "last_purchase": str(buyer.last_purchase_date) if buyer.last_purchase_date else None,
            "days_dormant": days_since,
        })

    # 3. Warning aging stock (60-90 days)
    warning_result = await db.execute(
        select(
            func.count(StockEntry.id).label("count"),
            func.coalesce(func.sum(StockEntry.meters), 0).label("meters"),
        ).where(
            StockEntry.status == "available",
            StockEntry.aging_days > 60,
            StockEntry.aging_days <= 90,
        )
    )
    warning = warning_result.one()

    # 4. Top quality categories with aging stock
    quality_aging = await db.execute(
        select(
            Article.quality_group,
            func.count(StockEntry.id).label("count"),
            func.coalesce(func.sum(StockEntry.meters), 0).label("meters"),
        )
        .join(Article, StockEntry.article_id == Article.id)
        .where(StockEntry.status == "available", StockEntry.aging_days > 60)
        .group_by(Article.quality_group)
        .order_by(func.sum(StockEntry.meters).desc())
        .limit(5)
    )
    aging_by_quality = [
        {"quality_group": r[0] or "Unknown", "count": r[1], "meters": float(r[2])}
        for r in quality_aging.all()
    ]

    return {
        "critical_stock": critical_stock,
        "dormant_buyers": dormant_buyers,
        "warning_stock": {"count": warning.count, "meters": float(warning.meters)},
        "aging_by_quality": aging_by_quality,
    }


@router.get("/sales-trend")
async def sales_trend(
    days: int = Query(30, ge=7, le=365),
    db: AsyncSession = Depends(get_db),
):
    """Daily sales trend for chart."""
    today = date.today()
    start = today - timedelta(days=days)

    result = await db.execute(
        select(
            Sale.voucher_date,
            func.count(Sale.id).label("count"),
            func.coalesce(func.sum(Sale.quantity_meters), 0).label("meters"),
        )
        .where(Sale.voucher_date >= start, Sale.voucher_date.isnot(None))
        .group_by(Sale.voucher_date)
        .order_by(Sale.voucher_date)
    )

    return [
        {"date": str(r[0]), "count": r[1], "meters": float(r[2])}
        for r in result.all()
    ]


@router.get("/quality-distribution")
async def quality_distribution(db: AsyncSession = Depends(get_db)):
    """Stock distribution by quality group."""
    result = await db.execute(
        select(
            Article.quality_group,
            func.count(StockEntry.id).label("count"),
            func.coalesce(func.sum(StockEntry.meters), 0).label("meters"),
        )
        .join(Article, StockEntry.article_id == Article.id)
        .where(StockEntry.status == "available")
        .group_by(Article.quality_group)
        .order_by(func.sum(StockEntry.meters).desc())
    )
    return [
        {"quality_group": r[0] or "Unknown", "count": r[1], "meters": float(r[2])}
        for r in result.all()
    ]


@router.get("/supplier-scorecard")
async def supplier_scorecard(
    limit: int = Query(15, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Supplier ranking by total purchase volume, delivery count, and recency."""
    result = await db.execute(
        select(
            Purchase.supplier,
            func.count(Purchase.id).label("total_deliveries"),
            func.coalesce(func.sum(Purchase.quantity_meters), 0).label("total_meters"),
            func.max(Purchase.voucher_date).label("last_delivery"),
        )
        .where(Purchase.supplier.isnot(None))
        .group_by(Purchase.supplier)
        .order_by(func.sum(Purchase.quantity_meters).desc())
        .limit(limit)
    )
    today = date.today()
    suppliers = []
    for r in result.all():
        recency = (today - r.last_delivery).days if r.last_delivery else None
        # Simple score: volume (40%) + frequency (30%) + recency (30%)
        vol_score = min(float(r.total_meters) / 50000, 1.0) * 40
        freq_score = min(r.total_deliveries / 100, 1.0) * 30
        rec_score = (1 - min((recency or 365) / 365, 1.0)) * 30
        score = round(vol_score + freq_score + rec_score, 1)

        suppliers.append({
            "supplier": r.supplier,
            "total_meters": float(r.total_meters),
            "total_deliveries": r.total_deliveries,
            "last_delivery": str(r.last_delivery) if r.last_delivery else None,
            "days_since_delivery": recency,
            "score": score,
        })

    return suppliers


# ═══════════════ Low Stock Threshold Alerts ═══════════════

@router.get("/low-stock-alerts")
async def low_stock_alerts(
    threshold_pct: float = Query(10.0, ge=1, le=50, description="Alert when stock < X% of historical avg"),
    days: int = Query(90, description="Look back days to compute average sales velocity"),
    db: AsyncSession = Depends(get_db),
):
    """Identify fast-moving fabrics whose current stock is below threshold % of typical demand.

    Logic:
    1. For each quality_group, compute total meters sold in last `days`
    2. Compute current available stock per quality_group
    3. Days-of-stock-remaining = current_stock / (sold_per_day)
    4. Flag groups where current stock < threshold_pct × monthly average
    """
    cutoff = date.today() - timedelta(days=days)

    # Sales velocity per article (last `days`)
    sales_q = await db.execute(
        select(
            Article.quality_group,
            func.coalesce(func.sum(Sale.quantity_meters), 0).label('sold_meters'),
            func.count(Sale.id).label('sale_count'),
        )
        .join(Sale, Sale.article_id == Article.id, isouter=True)
        .where(Sale.voucher_date >= cutoff)
        .group_by(Article.quality_group)
    )
    velocity = {row.quality_group or "Unknown": {
        "sold_meters": float(row.sold_meters or 0),
        "sales_count": row.sale_count or 0,
        "per_day": float(row.sold_meters or 0) / max(days, 1),
    } for row in sales_q.all()}

    # Current stock per article
    stock_q = await db.execute(
        select(
            Article.quality_group,
            func.coalesce(func.sum(StockEntry.meters), 0).label('current_meters'),
            func.count(StockEntry.id).label('lot_count'),
        )
        .join(StockEntry, StockEntry.article_id == Article.id, isouter=True)
        .where(StockEntry.status == 'available')
        .group_by(Article.quality_group)
    )

    alerts = []
    for row in stock_q.all():
        group = row.quality_group or "Unknown"
        current = float(row.current_meters or 0)
        v = velocity.get(group, {"per_day": 0, "sold_meters": 0})

        # Skip if no historical sales (can't compute velocity)
        if v["per_day"] <= 0:
            continue

        # Compute days remaining
        days_remaining = current / v["per_day"] if v["per_day"] > 0 else 999
        # Threshold: monthly average × threshold_pct%
        monthly_avg = v["per_day"] * 30
        threshold_meters = monthly_avg * (threshold_pct / 100)

        if current < threshold_meters and current > 0:
            severity = 'critical' if days_remaining < 7 else 'high' if days_remaining < 14 else 'medium'
            alerts.append({
                "quality_group": group,
                "current_meters": round(current, 1),
                "lot_count": row.lot_count,
                "monthly_demand_avg": round(monthly_avg, 1),
                "days_remaining": round(days_remaining, 1),
                "threshold_meters": round(threshold_meters, 1),
                "severity": severity,
                "recommendation": (
                    f"Reorder soon — only {round(days_remaining, 0)} days of stock at current sale rate."
                ),
            })

    # Sort by urgency
    alerts.sort(key=lambda x: x['days_remaining'])
    return {
        "threshold_pct": threshold_pct,
        "lookback_days": days,
        "alert_count": len(alerts),
        "alerts": alerts,
    }


@router.get("/low-stock-summary")
async def low_stock_summary(db: AsyncSession = Depends(get_db)):
    """Quick count of low stock alerts at default threshold for dashboard badge."""
    data = await low_stock_alerts(threshold_pct=10.0, days=90, db=db)
    return {
        "total": data["alert_count"],
        "critical": sum(1 for a in data["alerts"] if a["severity"] == "critical"),
        "high": sum(1 for a in data["alerts"] if a["severity"] == "high"),
        "medium": sum(1 for a in data["alerts"] if a["severity"] == "medium"),
    }
