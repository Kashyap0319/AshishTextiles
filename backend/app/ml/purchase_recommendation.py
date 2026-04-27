"""
Purchase Recommendation — analyze what to buy more/less based on:
- Current stock levels per quality group
- Historical sales velocity per quality group
- Stock-to-sales ratio (high = overstocked, low = understocked)
"""
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.articles import Article
from app.models.stock import StockEntry
from app.models.sales import Sale


async def get_purchase_recommendations(db: AsyncSession):
    """Recommend what to buy more/less based on stock vs sales velocity."""

    # Current stock per quality group
    stock_by_group = await db.execute(
        select(
            Article.quality_group,
            func.count(StockEntry.id).label("stock_lots"),
            func.coalesce(func.sum(StockEntry.meters), 0).label("stock_meters"),
        )
        .join(Article, StockEntry.article_id == Article.id)
        .where(StockEntry.status == "available")
        .group_by(Article.quality_group)
    )
    stock_data = {r[0]: {"lots": r[1], "meters": float(r[2])} for r in stock_by_group.all()}

    # Sales velocity per quality group (last 90 days of data)
    sales_by_group = await db.execute(
        select(
            Article.quality_group,
            func.count(Sale.id).label("sale_count"),
            func.coalesce(func.sum(Sale.quantity_meters), 0).label("sold_meters"),
        )
        .join(Article, Sale.article_id == Article.id)
        .where(Sale.quantity_meters.isnot(None))
        .group_by(Article.quality_group)
    )
    sales_data = {r[0]: {"count": r[1], "meters": float(r[2])} for r in sales_by_group.all()}

    # Build recommendations
    all_groups = set(list(stock_data.keys()) + list(sales_data.keys()))
    recommendations = []

    for group in all_groups:
        if not group:
            continue

        stock = stock_data.get(group, {"lots": 0, "meters": 0})
        sales = sales_data.get(group, {"count": 0, "meters": 0})

        stock_m = stock["meters"]
        sold_m = sales["meters"]

        # Calculate stock-to-sales ratio
        # High ratio = too much stock relative to demand
        # Low ratio = selling fast, need more
        if sold_m > 0:
            ratio = stock_m / sold_m
            velocity = sold_m / max(sales["count"], 1)  # avg meters per sale
        else:
            ratio = 999 if stock_m > 0 else 0
            velocity = 0

        # Recommendation logic
        if ratio > 2:
            action = "REDUCE"
            reason = f"Overstocked — {stock_m:,.0f}m in stock but only {sold_m:,.0f}m sold historically"
            priority = "low"
        elif ratio > 1:
            action = "HOLD"
            reason = f"Balanced — stock covers demand"
            priority = "medium"
        elif ratio > 0.3:
            action = "BUY MORE"
            reason = f"Selling fast — only {stock_m:,.0f}m left vs {sold_m:,.0f}m demand"
            priority = "high"
        elif sold_m > 0:
            action = "URGENT BUY"
            reason = f"Almost out — {stock_m:,.0f}m left, high demand ({sold_m:,.0f}m sold)"
            priority = "critical"
        else:
            action = "NO DATA"
            reason = "No sales history for this group"
            priority = "low"

        recommendations.append({
            "quality_group": group,
            "current_stock_meters": stock_m,
            "current_stock_lots": stock["lots"],
            "total_sold_meters": sold_m,
            "total_sales_count": sales["count"],
            "stock_to_sales_ratio": round(ratio, 2) if ratio < 100 else 999,
            "avg_meters_per_sale": round(velocity, 1),
            "action": action,
            "reason": reason,
            "priority": priority,
        })

    # Sort: critical first, then high, medium, low
    priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    recommendations.sort(key=lambda x: (priority_order.get(x["priority"], 4), -x["total_sold_meters"]))

    return {
        "recommendations": recommendations,
        "summary": {
            "total_groups": len(recommendations),
            "urgent_buy": sum(1 for r in recommendations if r["action"] == "URGENT BUY"),
            "buy_more": sum(1 for r in recommendations if r["action"] == "BUY MORE"),
            "hold": sum(1 for r in recommendations if r["action"] == "HOLD"),
            "reduce": sum(1 for r in recommendations if r["action"] == "REDUCE"),
        },
    }
