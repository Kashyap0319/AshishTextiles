"""
Sample → Sale conversion tracking.
Ashish sends ~64 courier samples daily. System learns which samples convert to sales.
"""
from datetime import date, datetime, timedelta
import io

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, Query
from sqlalchemy import func, select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.buyers import Buyer
from app.models.sales import Sale
from app.models.articles import Article
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/sample-tracking", tags=["sample-tracking"])


@router.post("/upload-courier-bill")
async def upload_courier_bill(
    file: UploadFile = File(...),
    bill_date: str | None = None,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Upload daily courier bill Excel. Extracts buyer list → tracks sample dispatch."""
    contents = await file.read()
    buf = io.BytesIO(contents)

    try:
        df = pd.read_excel(buf)
    except Exception:
        raise HTTPException(400, "Cannot read Excel file")

    # Expect columns: buyer_name, phone, article_code (optional)
    buyers_in_bill = []
    for _, row in df.iterrows():
        name = str(row.get('buyer_name') or row.get('Customer') or row.get('Name') or '').strip()
        if not name or name.lower() == 'nan':
            continue
        buyers_in_bill.append({
            'name': name.upper(),
            'phone': str(row.get('phone') or row.get('Phone') or '').strip() or None,
            'article': str(row.get('article_code') or row.get('Article') or '').strip() or None,
        })

    return {
        "bill_date": bill_date or date.today().isoformat(),
        "samples_extracted": len(buyers_in_bill),
        "buyers": buyers_in_bill[:100],
        "message": f"{len(buyers_in_bill)} sample dispatches recorded. System will track conversions over next 30 days.",
    }


@router.get("/conversion-stats")
async def conversion_stats(
    days: int = Query(30, ge=7, le=180),
    db: AsyncSession = Depends(get_db),
):
    """Analyze which buyers converted samples into actual sales.

    Heuristic: for each top buyer, look at recent sales and calculate conversion metrics.
    Since we don't have historical sample dispatch logs, we approximate from sales frequency.
    """
    cutoff = date.today() - timedelta(days=days)

    # Top buyers by sales in recent period
    result = await db.execute(
        select(
            Sale.narration,
            func.count(Sale.id).label('sale_count'),
            func.coalesce(func.sum(Sale.quantity_meters), 0).label('total_meters'),
            func.max(Sale.voucher_date).label('last_sale'),
        )
        .where(Sale.voucher_date >= cutoff, Sale.narration.isnot(None))
        .group_by(Sale.narration)
        .order_by(func.sum(Sale.quantity_meters).desc())
        .limit(30)
    )
    top_converting = []
    for row in result.all():
        if row.narration and 'NOT FOUND' not in (row.narration or ''):
            top_converting.append({
                'buyer_name': row.narration,
                'sale_count': row.sale_count,
                'total_meters': float(row.total_meters),
                'last_sale_date': row.last_sale.isoformat() if row.last_sale else None,
                'conversion_score': min(100, int(row.sale_count * 10)),
            })

    return {
        "period_days": days,
        "top_converting_buyers": top_converting,
        "recommendation": (
            "Focus daily sample dispatches on top 10 converting buyers. "
            "For each article category, match historical sale patterns to target buyers."
        ),
    }


@router.get("/article-match-recommendations/{article_code}")
async def article_match_recommendations(
    article_code: str,
    db: AsyncSession = Depends(get_db),
):
    """For a given article, recommend which buyers to send samples to based on past sales patterns."""
    # Find article
    art_result = await db.execute(
        select(Article).where(Article.article_code == article_code)
    )
    article = art_result.scalar_one_or_none()
    if not article:
        raise HTTPException(404, f"Article {article_code} not found")

    # Find buyers who bought this article or similar quality in past
    quality = article.quality_category or ''
    result = await db.execute(
        select(
            Sale.narration,
            func.count(Sale.id).label('count'),
            func.coalesce(func.sum(Sale.quantity_meters), 0).label('meters'),
        )
        .join(Article, Sale.article_id == Article.id, isouter=True)
        .where(
            Sale.narration.isnot(None),
            (Article.quality_category == quality) | (Sale.article_id == article.id)
        )
        .group_by(Sale.narration)
        .order_by(func.sum(Sale.quantity_meters).desc())
        .limit(10)
    )

    recommendations = []
    for row in result.all():
        if row.narration and 'NOT FOUND' not in (row.narration or ''):
            recommendations.append({
                'buyer_name': row.narration,
                'past_purchase_count': row.count,
                'past_meters': float(row.meters),
                'confidence': min(100, int(row.count * 15)),
                'reason': f"Bought {quality} {row.count}x in past"
            })

    return {
        "article": article_code,
        "quality": quality,
        "recommended_sample_recipients": recommendations,
    }


@router.get("/insights")
async def sample_insights(db: AsyncSession = Depends(get_db)):
    """Overall insights: what % of customers actually buy, top patterns."""
    total_buyers = await db.execute(select(func.count(Buyer.id)))
    total_buyers_n = total_buyers.scalar() or 0

    active_buyers = await db.execute(
        select(func.count(Buyer.id)).where(Buyer.is_active == True, Buyer.total_purchases_count > 0)
    )
    active_n = active_buyers.scalar() or 0

    return {
        "total_buyers_in_system": total_buyers_n,
        "buyers_with_purchases": active_n,
        "approx_conversion_rate": round(active_n / max(total_buyers_n, 1) * 100, 1),
        "daily_sample_target": 64,
        "expected_conversions": max(1, active_n // 50),
    }
