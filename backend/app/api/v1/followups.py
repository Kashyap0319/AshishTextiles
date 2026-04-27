"""Auto Follow-Up — track WhatsApp messages, queue reminders."""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.followups import FollowUp
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/followups", tags=["followups"])


class CreateFollowUp(BaseModel):
    buyer_id: int
    buyer_name: str
    article_code: str | None = None
    message_type: str = "match"  # match, offer, reminder
    whatsapp_text: str | None = None


class FollowUpResponse(BaseModel):
    id: int
    buyer_id: int
    buyer_name: str
    article_code: str | None
    message_type: str
    status: str
    reminder_count: int
    next_reminder_at: str | None
    created_at: str | None

    model_config = {"from_attributes": True}


@router.post("/", status_code=201)
async def create_followup(
    data: CreateFollowUp,
    _user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Log a WhatsApp message sent — starts the follow-up clock."""
    now = datetime.now(timezone.utc)
    followup = FollowUp(
        buyer_id=data.buyer_id,
        buyer_name=data.buyer_name,
        article_code=data.article_code,
        message_type=data.message_type,
        message_sent_at=now,
        next_reminder_at=now + timedelta(hours=48),
        whatsapp_text=data.whatsapp_text,
        status="pending",
    )
    db.add(followup)
    await db.flush()
    await db.refresh(followup)
    return {"id": followup.id, "next_reminder_at": str(followup.next_reminder_at)}


@router.post("/{followup_id}/responded")
async def mark_responded(followup_id: int, _user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Mark that buyer responded — stop reminders."""
    result = await db.execute(select(FollowUp).where(FollowUp.id == followup_id))
    fu = result.scalar_one_or_none()
    if not fu:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    fu.response_received = True
    fu.response_at = datetime.now(timezone.utc)
    fu.status = "responded"
    fu.next_reminder_at = None
    await db.flush()
    return {"status": "responded"}


@router.get("/pending")
async def get_pending_reminders(
    _user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all follow-ups that need a reminder (past due, not responded)."""
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(FollowUp)
        .where(
            FollowUp.status == "pending",
            FollowUp.response_received == False,
            FollowUp.next_reminder_at <= now,
        )
        .order_by(FollowUp.next_reminder_at)
    )
    followups = result.scalars().all()

    reminders = []
    for fu in followups:
        # Auto-generate reminder text
        reminder_text = f"🔔 *Reminder #{fu.reminder_count + 1}*\n\nHi, we shared some surplus stock details"
        if fu.article_code:
            reminder_text += f" for *{fu.article_code}*"
        reminder_text += f" {fu.reminder_count * 48 + 48} hours ago.\n\nKya aapko interest hai? Reply kare ya call kare.\n\n_CaratSense_"

        reminders.append({
            "id": fu.id,
            "buyer_id": fu.buyer_id,
            "buyer_name": fu.buyer_name,
            "article_code": fu.article_code,
            "original_message_type": fu.message_type,
            "reminder_count": fu.reminder_count,
            "hours_since_sent": round((now - fu.message_sent_at).total_seconds() / 3600) if fu.message_sent_at else 0,
            "reminder_text": reminder_text,
        })

    return {"pending_reminders": reminders, "total": len(reminders)}


@router.post("/{followup_id}/send-reminder")
async def send_reminder(followup_id: int, _user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Mark reminder as sent, queue next one in 48 hours."""
    result = await db.execute(select(FollowUp).where(FollowUp.id == followup_id))
    fu = result.scalar_one_or_none()
    if not fu:
        raise HTTPException(status_code=404, detail="Follow-up not found")

    fu.reminder_count += 1
    now = datetime.now(timezone.utc)

    # Max 3 reminders, then expire
    if fu.reminder_count >= 3:
        fu.status = "expired"
        fu.next_reminder_at = None
    else:
        fu.next_reminder_at = now + timedelta(hours=48)

    await db.flush()
    return {"status": fu.status, "reminder_count": fu.reminder_count, "next_reminder_at": str(fu.next_reminder_at) if fu.next_reminder_at else None}


@router.get("/stats")
async def followup_stats(_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    total = await db.execute(select(func.count(FollowUp.id)))
    pending = await db.execute(select(func.count(FollowUp.id)).where(FollowUp.status == "pending"))
    responded = await db.execute(select(func.count(FollowUp.id)).where(FollowUp.status == "responded"))
    expired = await db.execute(select(func.count(FollowUp.id)).where(FollowUp.status == "expired"))
    return {
        "total": total.scalar(),
        "pending": pending.scalar(),
        "responded": responded.scalar(),
        "expired": expired.scalar(),
        "response_rate": round(responded.scalar() / max(total.scalar(), 1) * 100, 1),
    }
