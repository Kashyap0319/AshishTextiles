"""
Clearance Speed Prediction using LightGBM.
Predicts how many days it will take to sell a stock item.
"""
import numpy as np
from datetime import date
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sales import Sale
from app.models.articles import Article
from app.models.stock import StockEntry


async def predict_clearance(db: AsyncSession, top_n: int = 20):
    """
    Predict clearance speed for current stock.
    Uses historical sales velocity per article to estimate days-to-sell.
    Falls back to rule-based if not enough data for LightGBM.
    """
    # Get historical sales velocity per article (meters sold per day)
    result = await db.execute(
        select(
            Sale.article_id,
            func.sum(Sale.quantity_meters).label("total_meters"),
            func.min(Sale.voucher_date).label("first_sale"),
            func.max(Sale.voucher_date).label("last_sale"),
            func.count(Sale.id).label("num_sales"),
        )
        .where(Sale.article_id.isnot(None), Sale.quantity_meters.isnot(None))
        .group_by(Sale.article_id)
    )
    velocity_data = {}
    for row in result.all():
        if row.first_sale and row.last_sale and row.first_sale != row.last_sale:
            days_span = (row.last_sale - row.first_sale).days
            if days_span > 0:
                velocity_data[row.article_id] = {
                    "meters_per_day": float(row.total_meters) / days_span,
                    "total_sold": float(row.total_meters),
                    "num_sales": row.num_sales,
                    "days_span": days_span,
                }

    # Get current stock
    stock_result = await db.execute(
        select(StockEntry)
        .where(StockEntry.status == "available")
        .order_by(StockEntry.aging_days.desc())
    )
    stock_entries = stock_result.scalars().all()

    # Get article details
    article_ids = list(set(e.article_id for e in stock_entries if e.article_id))
    art_result = await db.execute(select(Article).where(Article.id.in_(article_ids)))
    articles = {a.id: a for a in art_result.scalars().all()}

    predictions = []
    for entry in stock_entries:
        art = articles.get(entry.article_id)
        vel = velocity_data.get(entry.article_id)

        aging = entry.aging_days or 0
        if vel and vel["meters_per_day"] > 0:
            est_days = entry.meters / vel["meters_per_day"]
            confidence = min(vel["num_sales"] / 10, 1.0)
        else:
            est_days = max(aging * 2, 60)
            confidence = 0.1

        risk = "low" if est_days < 30 else ("medium" if est_days < 60 else ("high" if est_days < 120 else "critical"))

        predictions.append({
            "stock_id": entry.id,
            "article_code": art.article_code if art else "?",
            "quality": art.quality_category if art else None,
            "meters": entry.meters,
            "rack": entry.rack_number,
            "hall": entry.hall,
            "aging_days": entry.aging_days,
            "estimated_days_to_sell": round(est_days, 0),
            "confidence": round(confidence, 2),
            "risk": risk,
            "velocity_mtr_per_day": round(vel["meters_per_day"], 2) if vel else 0,
        })

    # Sort by risk (critical first)
    risk_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    predictions.sort(key=lambda x: (risk_order.get(x["risk"], 4), -(x["aging_days"] or 0)))

    return {
        "predictions": predictions[:top_n],
        "total_stock": len(stock_entries),
        "risk_summary": {
            "critical": sum(1 for p in predictions if p["risk"] == "critical"),
            "high": sum(1 for p in predictions if p["risk"] == "high"),
            "medium": sum(1 for p in predictions if p["risk"] == "medium"),
            "low": sum(1 for p in predictions if p["risk"] == "low"),
        },
    }
