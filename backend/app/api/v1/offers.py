"""Bidding Portal — public offers + admin accept/reject."""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.offers import Offer
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/offers", tags=["offers"])


class MakeOfferRequest(BaseModel):
    article_code: str
    buyer_name: str
    buyer_phone: str | None = None
    buyer_email: str | None = None
    offer_price_per_meter: float
    meters_wanted: float | None = None
    message: str | None = None


class OfferResponse(BaseModel):
    id: int
    article_code: str
    buyer_name: str
    buyer_phone: str | None
    buyer_email: str | None
    offer_price_per_meter: float
    meters_wanted: float | None
    message: str | None
    status: str
    admin_notes: str | None
    counter_price: float | None
    created_at: object = None

    model_config = {"from_attributes": True}


# PUBLIC — anyone can make an offer
@router.post("/", response_model=OfferResponse, status_code=201)
async def make_offer(data: MakeOfferRequest, db: AsyncSession = Depends(get_db)):
    """Public endpoint — buyer submits a bid on a stock article."""
    if data.offer_price_per_meter <= 0:
        raise HTTPException(status_code=400, detail="Offer price must be positive")
    offer = Offer(**data.model_dump())
    db.add(offer)
    await db.flush()
    await db.refresh(offer)
    return offer


# ADMIN — view and manage offers
@router.get("/", response_model=list[OfferResponse])
async def list_offers(
    status: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    _user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Offer).order_by(Offer.created_at.desc())
    if status:
        query = query.where(Offer.status == status)
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/stats")
async def offer_stats(_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    total = await db.execute(select(func.count(Offer.id)))
    pending = await db.execute(select(func.count(Offer.id)).where(Offer.status == "pending"))
    accepted = await db.execute(select(func.count(Offer.id)).where(Offer.status == "accepted"))
    rejected = await db.execute(select(func.count(Offer.id)).where(Offer.status == "rejected"))
    return {
        "total": total.scalar(),
        "pending": pending.scalar(),
        "accepted": accepted.scalar(),
        "rejected": rejected.scalar(),
    }


@router.put("/{offer_id}/accept")
async def accept_offer(offer_id: int, notes: str | None = None, _user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Offer).where(Offer.id == offer_id))
    offer = result.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    offer.status = "accepted"
    offer.admin_notes = notes
    await db.flush()
    return {"status": "accepted", "offer_id": offer_id}


@router.put("/{offer_id}/reject")
async def reject_offer(offer_id: int, notes: str | None = None, _user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Offer).where(Offer.id == offer_id))
    offer = result.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    offer.status = "rejected"
    offer.admin_notes = notes
    await db.flush()
    return {"status": "rejected", "offer_id": offer_id}


@router.put("/{offer_id}/counter")
async def counter_offer(
    offer_id: int,
    counter_price: float = Query(..., gt=0),
    notes: str | None = None,
    _user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Offer).where(Offer.id == offer_id))
    offer = result.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    offer.status = "countered"
    offer.counter_price = counter_price
    offer.admin_notes = notes
    await db.flush()
    return {"status": "countered", "offer_id": offer_id, "counter_price": counter_price}
