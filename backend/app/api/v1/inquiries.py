"""
Demand-Triggered Inquiry Alerts.
Buyers request specific stock → when matching stock arrives, auto-alert.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.inquiries import Inquiry
from app.models.articles import Article
from app.models.stock import StockEntry
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/inquiries", tags=["inquiries"])


class InquiryCreate(BaseModel):
    buyer_name: str
    buyer_phone: str | None = None
    article_code: str | None = None
    quality_category: str | None = None
    color: str | None = None
    min_meters: float | None = 0
    notes: str | None = None


@router.get("/")
async def list_inquiries(
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List all inquiries, optionally filtered by status."""
    q = select(Inquiry).order_by(Inquiry.created_at.desc())
    if status:
        q = q.where(Inquiry.status == status)
    result = await db.execute(q)
    return [{
        "id": i.id, "buyer_name": i.buyer_name, "buyer_phone": i.buyer_phone,
        "article_code": i.article_code, "quality_category": i.quality_category,
        "color": i.color, "min_meters": i.min_meters, "notes": i.notes,
        "status": i.status, "alert_count": i.alert_count,
        "last_alerted_at": i.last_alerted_at, "created_at": i.created_at,
    } for i in result.scalars().all()]


@router.post("/", status_code=201)
async def create_inquiry(
    data: InquiryCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Log a buyer demand. System will auto-match against future stock arrivals."""
    inquiry = Inquiry(
        buyer_name=data.buyer_name.strip().upper(),
        buyer_phone=data.buyer_phone,
        article_code=data.article_code,
        quality_category=data.quality_category,
        color=data.color,
        min_meters=data.min_meters or 0,
        notes=data.notes,
        status="open",
        created_by=user.id,
    )
    db.add(inquiry)
    await db.flush()
    await db.refresh(inquiry)
    return {"id": inquiry.id, "status": "open"}


@router.get("/matches-for-article/{article_code}")
async def matches_for_article(
    article_code: str,
    db: AsyncSession = Depends(get_db),
):
    """When new stock arrives for this article, find all open inquiries that match."""
    # Get article to find its quality
    art_result = await db.execute(select(Article).where(Article.article_code == article_code))
    article = art_result.scalar_one_or_none()
    quality = article.quality_category if article else None

    # Match open inquiries
    q = select(Inquiry).where(Inquiry.status == "open")
    conds = [Inquiry.article_code == article_code]
    if quality:
        conds.append(Inquiry.quality_category == quality)
    q = q.where(or_(*conds))
    result = await db.execute(q)

    matches = []
    for i in result.scalars().all():
        matches.append({
            "inquiry_id": i.id,
            "buyer_name": i.buyer_name,
            "buyer_phone": i.buyer_phone,
            "min_meters": i.min_meters,
            "notes": i.notes,
            "whatsapp_message": (
                f"Hi {i.buyer_name.title()}, you asked about {article_code}"
                f"{f' ({quality})' if quality else ''}. "
                f"We have fresh stock available. Interested?"
            ),
        })
    return {"article": article_code, "matches": matches, "match_count": len(matches)}


@router.post("/{inquiry_id}/mark-alerted")
async def mark_alerted(
    inquiry_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Increment alert counter after sending WhatsApp."""
    result = await db.execute(select(Inquiry).where(Inquiry.id == inquiry_id))
    inq = result.scalar_one_or_none()
    if not inq:
        raise HTTPException(404, "Inquiry not found")
    inq.alert_count = (inq.alert_count or 0) + 1
    inq.last_alerted_at = datetime.utcnow()
    inq.status = "alerted"
    await db.flush()
    return {"status": "alerted", "alert_count": inq.alert_count}


@router.put("/{inquiry_id}/close")
async def close_inquiry(
    inquiry_id: int,
    status: str = Query("fulfilled", pattern="^(fulfilled|closed)$"),
    db: AsyncSession = Depends(get_db),
):
    """Close an inquiry (fulfilled or closed)."""
    result = await db.execute(select(Inquiry).where(Inquiry.id == inquiry_id))
    inq = result.scalar_one_or_none()
    if not inq:
        raise HTTPException(404, "Inquiry not found")
    inq.status = status
    await db.flush()
    return {"status": status}


@router.delete("/{inquiry_id}", status_code=204)
async def delete_inquiry(inquiry_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Inquiry).where(Inquiry.id == inquiry_id))
    inq = result.scalar_one_or_none()
    if not inq:
        raise HTTPException(404, "Inquiry not found")
    await db.delete(inq)


@router.get("/active-alerts")
async def active_alerts(db: AsyncSession = Depends(get_db)):
    """Get all open inquiries with matching stock currently available.
    This is the main alert dashboard — 'buyers waiting for stock we just received'.
    """
    # Get open inquiries
    inq_result = await db.execute(select(Inquiry).where(Inquiry.status == "open"))
    inquiries = inq_result.scalars().all()

    alerts = []
    for inq in inquiries:
        # Check stock for matching article
        stock_q = select(StockEntry).join(Article, StockEntry.article_id == Article.id, isouter=True).where(
            StockEntry.status == "available"
        )
        conds = []
        if inq.article_code:
            conds.append(Article.article_code == inq.article_code)
        if inq.quality_category:
            conds.append(Article.quality_category == inq.quality_category)
        if conds:
            stock_q = stock_q.where(or_(*conds))
            stock_q = stock_q.limit(5)
            stock_result = await db.execute(stock_q)
            matching_stock = stock_result.scalars().all()
            if matching_stock:
                alerts.append({
                    "inquiry": {
                        "id": inq.id, "buyer_name": inq.buyer_name, "buyer_phone": inq.buyer_phone,
                        "wants": inq.article_code or inq.quality_category,
                        "min_meters": inq.min_meters,
                    },
                    "matching_stock_count": len(matching_stock),
                })
    return alerts
