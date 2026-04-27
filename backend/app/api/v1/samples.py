"""
Sample Tracker + Smart Sample Recommendation.
Answers: "Kaunsa kapda ka sample kaunse client ko bheejna hai?"
Uses purchase history + quality preferences to recommend.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.samples import SampleDispatch
from app.models.articles import Article
from app.models.buyers import Buyer
from app.models.sales import Sale
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/samples", tags=["samples"])


class SendSampleRequest(BaseModel):
    article_code: str
    buyer_id: int
    courier_details: str | None = None
    notes: str | None = None


class SampleResponse(BaseModel):
    id: int
    article_code: str | None
    quality_category: str | None
    buyer_name: str | None
    response: str | None
    sent_date: object = None
    purchase_meters: float | None = None

    model_config = {"from_attributes": True}


@router.post("/send", status_code=201)
async def send_sample(
    data: SendSampleRequest,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Log that a sample was sent to a buyer."""
    # Find article
    art_result = await db.execute(select(Article).where(Article.article_code == data.article_code))
    article = art_result.scalar_one_or_none()

    # Find buyer
    buyer_result = await db.execute(select(Buyer).where(Buyer.id == data.buyer_id))
    buyer = buyer_result.scalar_one_or_none()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer not found")

    dispatch = SampleDispatch(
        article_id=article.id if article else None,
        article_code=data.article_code,
        quality_category=article.quality_category if article else None,
        buyer_id=data.buyer_id,
        buyer_name=buyer.name,
        courier_details=data.courier_details,
        notes=data.notes,
        response="no_response",
    )
    db.add(dispatch)
    await db.flush()
    await db.refresh(dispatch)
    return {"id": dispatch.id, "article": data.article_code, "buyer": buyer.name, "status": "sent"}


@router.put("/{sample_id}/response")
async def update_response(
    sample_id: int,
    response: str = Query(..., description="interested, passed, purchased, no_response"),
    purchase_meters: float | None = None,
    notes: str | None = None,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update buyer's response to a sample."""
    result = await db.execute(select(SampleDispatch).where(SampleDispatch.id == sample_id))
    sample = result.scalar_one_or_none()
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")
    sample.response = response
    sample.response_date = datetime.now(timezone.utc)
    if purchase_meters:
        sample.purchase_meters = purchase_meters
    if notes:
        sample.notes = notes
    await db.flush()
    return {"status": response, "sample_id": sample_id}


@router.get("/history")
async def sample_history(
    buyer_id: int | None = None,
    article_code: str | None = None,
    response: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get sample dispatch history."""
    query = select(SampleDispatch).order_by(SampleDispatch.created_at.desc())
    if buyer_id:
        query = query.where(SampleDispatch.buyer_id == buyer_id)
    if article_code:
        query = query.where(SampleDispatch.article_code.ilike(f"%{article_code}%"))
    if response:
        query = query.where(SampleDispatch.response == response)
    query = query.limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/stats")
async def sample_stats(user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Sample conversion stats."""
    total = await db.execute(select(func.count(SampleDispatch.id)))
    purchased = await db.execute(select(func.count(SampleDispatch.id)).where(SampleDispatch.response == "purchased"))
    interested = await db.execute(select(func.count(SampleDispatch.id)).where(SampleDispatch.response == "interested"))
    passed = await db.execute(select(func.count(SampleDispatch.id)).where(SampleDispatch.response == "passed"))
    no_resp = await db.execute(select(func.count(SampleDispatch.id)).where(SampleDispatch.response == "no_response"))
    t = total.scalar()
    return {
        "total_samples_sent": t,
        "purchased": purchased.scalar(),
        "interested": interested.scalar(),
        "passed": passed.scalar(),
        "no_response": no_resp.scalar(),
        "conversion_rate": round(purchased.scalar() / max(t, 1) * 100, 1),
    }


@router.get("/recommend/{article_code}")
async def recommend_buyers_for_sample(
    article_code: str,
    top_n: int = Query(10, ge=1, le=50),
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    SMART RECOMMENDATION: Kaunse buyers ko yeh sample bheejna chahiye?
    Logic:
    1. Find article's quality category/group
    2. Find buyers who bought similar quality in the past
    3. Rank by: purchase volume of that quality + recency
    4. Exclude buyers who already got this sample
    """
    # Get article info
    art_result = await db.execute(select(Article).where(Article.article_code == article_code))
    article = art_result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    quality = article.quality_category
    group = article.quality_group

    # Find buyers who already got this sample (exclude them)
    already_sent = await db.execute(
        select(SampleDispatch.buyer_id).where(SampleDispatch.article_code == article_code)
    )
    exclude_ids = {r[0] for r in already_sent.all()}

    # Find buyers who bought similar quality
    if quality:
        buyer_query = (
            select(
                Sale.buyer_id,
                Buyer.name,
                Buyer.city,
                Buyer.phone,
                func.sum(Sale.quantity_meters).label("quality_meters"),
                func.count(Sale.id).label("quality_orders"),
                func.max(Sale.voucher_date).label("last_purchase"),
            )
            .join(Article, Sale.article_id == Article.id)
            .join(Buyer, Sale.buyer_id == Buyer.id)
            .where(
                Sale.buyer_id.isnot(None),
                Buyer.is_active == True,
            )
        )

        # Match by quality category OR quality group
        from sqlalchemy import or_
        quality_filter = []
        if quality:
            quality_filter.append(Article.quality_category == quality)
        if group:
            quality_filter.append(Article.quality_group == group)
        buyer_query = buyer_query.where(or_(*quality_filter))

        buyer_query = (
            buyer_query
            .group_by(Sale.buyer_id, Buyer.name, Buyer.city, Buyer.phone)
            .order_by(func.sum(Sale.quantity_meters).desc())
            .limit(top_n + len(exclude_ids))
        )

        result = await db.execute(buyer_query)
        recommendations = []
        for r in result.all():
            if r.buyer_id in exclude_ids:
                continue
            if len(recommendations) >= top_n:
                break
            recommendations.append({
                "buyer_id": r.buyer_id,
                "buyer_name": r.name,
                "city": r.city,
                "phone": r.phone,
                "quality_meters_bought": float(r.quality_meters or 0),
                "quality_orders": r.quality_orders,
                "last_purchase": str(r.last_purchase) if r.last_purchase else None,
                "match_reason": f"Bought {float(r.quality_meters or 0):,.0f}m of {quality or group}",
            })

        return {
            "article_code": article_code,
            "quality": quality,
            "quality_group": group,
            "recommended_buyers": recommendations,
            "already_sent_to": len(exclude_ids),
        }

    return {"article_code": article_code, "recommended_buyers": [], "message": "No quality data for matching"}
