"""Generate WhatsApp-ready buyer card data (text + structured data for frontend rendering)."""
from datetime import date

from sqlalchemy import select, func, cast, String, Integer, extract
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.buyers import Buyer
from app.models.sales import Sale
from app.models.articles import Article


async def generate_buyer_card(buyer_id: int, db: AsyncSession) -> dict:
    """Generate a shareable buyer card with purchase history and preferences."""
    result = await db.execute(select(Buyer).where(Buyer.id == buyer_id))
    buyer = result.scalar_one_or_none()
    if not buyer:
        return None

    # Top articles bought
    top_articles = await db.execute(
        select(
            Article.article_code,
            Article.quality_category,
            func.sum(Sale.quantity_meters).label("total_meters"),
            func.count(Sale.id).label("count"),
        )
        .join(Article, Sale.article_id == Article.id)
        .where(Sale.buyer_id == buyer_id)
        .group_by(Article.article_code, Article.quality_category)
        .order_by(func.sum(Sale.quantity_meters).desc())
        .limit(5)
    )
    top_arts = [
        {"article": r[0], "quality": r[1], "meters": float(r[2]), "count": r[3]}
        for r in top_articles.all()
    ]

    # Monthly purchase trend (last 6 months) — PostgreSQL compatible
    year_col = cast(extract("year", Sale.voucher_date), String)
    month_col = func.lpad(cast(extract("month", Sale.voucher_date), String), 2, "0")
    month_label = year_col + "-" + month_col

    try:
        monthly = await db.execute(
            select(
                month_label.label("month"),
                func.sum(Sale.quantity_meters).label("meters"),
                func.count(Sale.id).label("count"),
            )
            .where(Sale.buyer_id == buyer_id, Sale.voucher_date.isnot(None))
            .group_by(month_label)
            .order_by(month_label.desc())
            .limit(6)
        )
        monthly_trend = [
            {"month": r[0], "meters": float(r[1]), "count": r[2]}
            for r in monthly.all()
        ]
    except Exception:
        monthly_trend = []

    # Days since last purchase
    days_since = None
    if buyer.last_purchase_date:
        days_since = (date.today() - buyer.last_purchase_date).days

    # Build summary for frontend AI Insight card
    top_quals = ", ".join(set(a["quality"] for a in top_arts[:3] if a.get("quality")))
    summary = f"{buyer.name} has purchased {buyer.total_purchases_meters:,.0f}m across {buyer.total_purchases_count or 0} orders."
    if top_quals:
        summary += f" Prefers: {top_quals}."
    if days_since and days_since > 60:
        summary += f" ⚠️ Dormant for {days_since} days — consider re-engagement."
    elif days_since:
        summary += f" Last active {days_since} days ago."

    # WhatsApp text format
    whatsapp_text = f"""📋 *{buyer.name}* — Buyer Card
━━━━━━━━━━━━━━━━━━
📦 Total: {buyer.total_purchases_meters:,.0f}m ({buyer.total_purchases_count} orders)
📅 Last Purchase: {buyer.last_purchase_date or 'N/A'}
{'⚠️ Dormant: ' + str(days_since) + ' days' if days_since and days_since > 60 else '✅ Active'}

🔝 *Top Articles:*"""

    for i, art in enumerate(top_arts[:3], 1):
        whatsapp_text += f"\n  {i}. {art['article']} ({art['quality'] or '?'}) — {art['meters']:,.0f}m"

    whatsapp_text += "\n━━━━━━━━━━━━━━━━━━\n_CaratSense Surplus Stock_"

    return {
        "buyer": {
            "id": buyer.id,
            "name": buyer.name,
            "phone": buyer.phone,
            "city": buyer.city,
            "type": buyer.buyer_type,
            "total_meters": buyer.total_purchases_meters,
            "total_orders": buyer.total_purchases_count,
            "last_purchase": str(buyer.last_purchase_date) if buyer.last_purchase_date else None,
            "days_since_purchase": days_since,
            "is_dormant": days_since > 60 if days_since else False,
        },
        "top_articles": top_arts,
        "monthly_trend": monthly_trend,
        "whatsapp_text": whatsapp_text,
        "summary": summary,
    }

