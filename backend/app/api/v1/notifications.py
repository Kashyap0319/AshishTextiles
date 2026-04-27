"""Notifications API — aggregates alerts from across the system."""
from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.stock import StockEntry
from app.models.buyers import Buyer
from app.models.offers import Offer
from app.models.followups import FollowUp

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/")
async def get_notifications(db: AsyncSession = Depends(get_db)):
    """Get all active notifications/alerts."""
    today = date.today()
    notifications = []

    # 1. Critical aging stock (90+ days)
    critical = await db.execute(
        select(func.count(StockEntry.id), func.coalesce(func.sum(StockEntry.meters), 0))
        .where(StockEntry.status == "available", StockEntry.aging_days > 90)
    )
    cr = critical.one()
    if cr[0] > 0:
        notifications.append({
            "id": "aging_critical",
            "type": "error",
            "title": "Critical Aging Stock",
            "message": f"{cr[0]} items ({float(cr[1]):,.0f}m) are 90+ days old",
            "action": "/stock",
            "count": cr[0],
        })

    # 2. Warning aging stock (60-90 days)
    warning = await db.execute(
        select(func.count(StockEntry.id))
        .where(StockEntry.status == "available", StockEntry.aging_days > 60, StockEntry.aging_days <= 90)
    )
    wc = warning.scalar()
    if wc > 0:
        notifications.append({
            "id": "aging_warning",
            "type": "warning",
            "title": "Aging Stock Warning",
            "message": f"{wc} items between 60-90 days old",
            "action": "/stock",
            "count": wc,
        })

    # 3. Dormant buyers (60+ days, had >1000m)
    cutoff = today - timedelta(days=60)
    dormant = await db.execute(
        select(func.count(Buyer.id))
        .where(Buyer.is_active == True, Buyer.last_purchase_date < cutoff, Buyer.total_purchases_meters > 1000)
    )
    dc = dormant.scalar()
    if dc > 0:
        notifications.append({
            "id": "dormant_buyers",
            "type": "warning",
            "title": "Dormant Buyers",
            "message": f"{dc} high-value buyers inactive for 60+ days",
            "action": "/buyers",
            "count": dc,
        })

    # 4. Pending offers
    pending_offers = await db.execute(
        select(func.count(Offer.id)).where(Offer.status == "pending")
    )
    po = pending_offers.scalar()
    if po > 0:
        notifications.append({
            "id": "pending_offers",
            "type": "info",
            "title": "Pending Offers",
            "message": f"{po} buyer offers awaiting your response",
            "action": "/admin",
            "count": po,
        })

    # 5. Follow-up reminders due
    try:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        due = await db.execute(
            select(func.count(FollowUp.id))
            .where(FollowUp.status == "pending", FollowUp.response_received == False, FollowUp.next_reminder_at <= now)
        )
        fc = due.scalar()
        if fc > 0:
            notifications.append({
                "id": "followup_due",
                "type": "info",
                "title": "Follow-Up Reminders",
                "message": f"{fc} WhatsApp follow-ups need sending",
                "action": "/buyers",
                "count": fc,
            })
    except Exception:
        pass

    # 6. Low stock alert (total < 50,000m)
    total_stock = await db.execute(
        select(func.coalesce(func.sum(StockEntry.meters), 0)).where(StockEntry.status == "available")
    )
    ts = total_stock.scalar()
    if ts < 50000:
        notifications.append({
            "id": "low_stock",
            "type": "warning",
            "title": "Low Stock Alert",
            "message": f"Total available stock is only {float(ts):,.0f}m",
            "action": "/stock",
            "count": 1,
        })

    return {
        "notifications": notifications,
        "total": len(notifications),
        "unread": len(notifications),
    }
