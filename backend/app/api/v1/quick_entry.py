"""Quick Entry mode — minimal fields for warehouse staff."""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.articles import Article
from app.models.stock import StockEntry
from app.models.warehouse import Rack

router = APIRouter(prefix="/quick-entry", tags=["quick-entry"])


class QuickStockEntry(BaseModel):
    article_code: str
    meters: float
    rack_number: str | None = None
    batch_number: str | None = None


class QuickEntryResponse(BaseModel):
    id: int
    article_code: str
    meters: float
    rack_number: str | None
    hall: str | None
    batch_number: str | None
    status: str


@router.post("/stock", response_model=QuickEntryResponse, status_code=201)
async def quick_add_stock(data: QuickStockEntry, db: AsyncSession = Depends(get_db)):
    """Minimal stock entry — just article code, meters, and optionally rack."""
    # Find or create article
    result = await db.execute(select(Article).where(Article.article_code == data.article_code))
    article = result.scalar_one_or_none()
    if not article:
        article = Article(article_code=data.article_code)
        db.add(article)
        await db.flush()

    # Find hall from rack
    hall = None
    if data.rack_number:
        rack_result = await db.execute(select(Rack).where(Rack.rack_number == data.rack_number))
        rack = rack_result.scalar_one_or_none()
        if rack:
            hall = rack.hall

    entry = StockEntry(
        article_id=article.id,
        batch_number=data.batch_number,
        meters=data.meters,
        pieces=1,
        rack_number=data.rack_number,
        hall=hall,
        status="available",
        received_date=date.today(),
        aging_days=0,
    )
    db.add(entry)
    await db.flush()
    await db.refresh(entry)

    # ── Update rack current_meters ──
    if data.rack_number:
        rack_result2 = await db.execute(select(Rack).where(Rack.rack_number == data.rack_number))
        rack_obj = rack_result2.scalar_one_or_none()
        if rack_obj:
            rack_obj.current_meters = (rack_obj.current_meters or 0) + data.meters
            await db.flush()

    return QuickEntryResponse(
        id=entry.id,
        article_code=data.article_code,
        meters=entry.meters,
        rack_number=entry.rack_number,
        hall=hall,
        batch_number=entry.batch_number,
        status=entry.status,
    )


@router.get("/articles/search")
async def search_articles(q: str, db: AsyncSession = Depends(get_db)):
    """Typeahead search for article codes."""
    result = await db.execute(
        select(Article.article_code, Article.quality_category)
        .where(Article.article_code.ilike(f"%{q.replace('%', '').replace('_', '')}%"))
        .limit(10)
    )
    return [{"code": r[0], "quality": r[1]} for r in result.all()]


@router.get("/racks/search")
async def search_racks(q: str, db: AsyncSession = Depends(get_db)):
    """Typeahead search for rack numbers."""
    result = await db.execute(
        select(Rack.rack_number, Rack.hall, Rack.assigned_article)
        .where(Rack.rack_number.ilike(f"%{q.replace('%', '').replace('_', '')}%"))
        .limit(10)
    )
    return [{"rack": r[0], "hall": r[1], "article": r[2]} for r in result.all()]
