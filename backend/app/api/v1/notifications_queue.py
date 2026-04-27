"""
WhatsApp notification queue.
Auto-generates pending notifications for events:
- New stock arrived → notify buyers with matching inquiries
- Low stock alert → notify owner
- Dormant buyer → notify sales team
- Quality mix detected → notify sales person
"""
from datetime import datetime, timedelta, date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/notification-queue", tags=["notification-queue"])


class QueuedNotification(BaseModel):
    type: str           # 'stock_arrived', 'low_stock', 'dormant_buyer', 'quality_mix', 'inquiry_match'
    target_phone: str | None = None
    target_name: str
    title: str
    message: str
    severity: str       # 'info', 'warning', 'critical'
    triggered_by: str | None = None  # entity that triggered
    whatsapp_link: str | None = None


@router.get("/pending")
async def pending_notifications(db: AsyncSession = Depends(get_db)):
    """Compute all pending notifications across the system in one call.

    This is the master notification engine — runs all checks and returns
    a unified list of WhatsApp messages waiting to be sent.
    """
    from app.models.inquiries import Inquiry
    from app.models.stock import StockEntry
    from app.models.articles import Article
    from app.models.buyers import Buyer
    from app.models.sales import Sale

    notifications: list[dict] = []

    # ─── 1. Inquiry matches (buyer asked, stock now available) ───
    inq_result = await db.execute(select(Inquiry).where(Inquiry.status == "open"))
    for inq in inq_result.scalars().all():
        # Check if matching stock exists
        match_q = select(StockEntry).join(Article, isouter=True).where(StockEntry.status == "available")
        if inq.article_code:
            match_q = match_q.where(Article.article_code == inq.article_code)
        elif inq.quality_category:
            match_q = match_q.where(Article.quality_category == inq.quality_category)
        match_q = match_q.limit(1)
        match = (await db.execute(match_q)).scalar_one_or_none()

        if match:
            phone = (inq.buyer_phone or '').replace(' ', '').replace('+', '')
            wa = ""
            text = (
                f"Hi {inq.buyer_name.title()}, you asked about "
                f"{inq.article_code or inq.quality_category}. We have stock available now. Interested?"
            )
            if phone:
                from urllib.parse import quote
                wa = f"https://wa.me/{phone}?text={quote(text)}"

            notifications.append({
                "type": "inquiry_match",
                "target_phone": inq.buyer_phone,
                "target_name": inq.buyer_name,
                "title": "Stock matches buyer inquiry",
                "message": text,
                "severity": "info",
                "triggered_by": f"Inquiry #{inq.id}",
                "whatsapp_link": wa,
                "created_at": inq.created_at,
            })

    # ─── 2. Dormant buyers (60+ days, were active before) ───
    cutoff = date.today() - timedelta(days=60)
    dormant_q = await db.execute(
        select(Buyer).where(
            Buyer.last_purchase_date < cutoff,
            Buyer.last_purchase_date.isnot(None),
            Buyer.is_active == True,
            Buyer.total_purchases_meters > 1000,  # Was actually buying
        ).limit(10)
    )
    for b in dormant_q.scalars().all():
        days_dormant = (date.today() - b.last_purchase_date).days if b.last_purchase_date else 0
        notifications.append({
            "type": "dormant_buyer",
            "target_phone": b.phone,
            "target_name": b.name,
            "title": "Re-engage dormant buyer",
            "message": (
                f"{b.name} hasn't purchased in {days_dormant} days. "
                f"Past volume: {int(b.total_purchases_meters or 0)}m. Send WhatsApp."
            ),
            "severity": "warning",
            "triggered_by": f"Buyer #{b.id}",
            "whatsapp_link": (
                f"https://wa.me/{(b.phone or '').replace(' ', '').replace('+', '')}"
                f"?text=Hi%20{b.name},%20we%20have%20fresh%20stock%20available.%20Time%20to%20revisit?"
                if b.phone else None
            ),
        })

    # ─── 3. Quality mix detected in recent sales (last 7 days) ───
    recent_cutoff = date.today() - timedelta(days=7)
    mix_q = await db.execute(
        select(Sale.voucher_number, Sale.narration, func.count(func.distinct(Article.quality_category)).label('q_count'))
        .join(Article, Sale.article_id == Article.id, isouter=True)
        .where(Sale.voucher_date >= recent_cutoff, Sale.narration.isnot(None))
        .group_by(Sale.voucher_number, Sale.narration)
        .having(func.count(func.distinct(Article.quality_category)) > 1)
        .limit(5)
    )
    for row in mix_q.all():
        notifications.append({
            "type": "quality_mix",
            "target_name": "Sales Team",
            "title": "Mixed quality detected in sale",
            "message": (
                f"Voucher {row.voucher_number} ({row.narration}) has {row.q_count} different qualities. "
                f"Verify rates."
            ),
            "severity": "warning",
            "triggered_by": f"Voucher {row.voucher_number}",
        })

    # ─── 4. Low stock summary (one consolidated alert) ───
    # Only add if < 5 alerts (avoid noise)
    from app.api.v1.dashboard import low_stock_summary
    try:
        low_stock = await low_stock_summary(db=db)
        if low_stock.get("critical", 0) > 0:
            notifications.append({
                "type": "low_stock",
                "target_name": "Owner",
                "title": "Critical low stock",
                "message": (
                    f"{low_stock.get('critical', 0)} fabric category(ies) below 7 days of stock. "
                    f"Reorder urgently."
                ),
                "severity": "critical",
                "triggered_by": "Low stock alerts",
            })
    except Exception:
        pass

    return {
        "total": len(notifications),
        "by_type": {
            "inquiry_match": sum(1 for n in notifications if n['type'] == 'inquiry_match'),
            "dormant_buyer": sum(1 for n in notifications if n['type'] == 'dormant_buyer'),
            "quality_mix": sum(1 for n in notifications if n['type'] == 'quality_mix'),
            "low_stock": sum(1 for n in notifications if n['type'] == 'low_stock'),
        },
        "by_severity": {
            "critical": sum(1 for n in notifications if n['severity'] == 'critical'),
            "warning": sum(1 for n in notifications if n['severity'] == 'warning'),
            "info": sum(1 for n in notifications if n['severity'] == 'info'),
        },
        "notifications": notifications,
    }


@router.get("/digest")
async def daily_digest(db: AsyncSession = Depends(get_db)):
    """One consolidated WhatsApp message — perfect for daily owner update."""
    data = await pending_notifications(db=db)

    summary_lines = ["*CaratSense Daily Digest*", ""]
    if data["by_severity"]["critical"]:
        summary_lines.append(f"🔴 Critical: {data['by_severity']['critical']}")
    if data["by_severity"]["warning"]:
        summary_lines.append(f"🟡 Warning: {data['by_severity']['warning']}")
    if data["by_severity"]["info"]:
        summary_lines.append(f"🔵 Info: {data['by_severity']['info']}")

    summary_lines.append("")
    by_type = data["by_type"]
    if by_type["inquiry_match"]:
        summary_lines.append(f"• {by_type['inquiry_match']} buyer inquiries match new stock")
    if by_type["dormant_buyer"]:
        summary_lines.append(f"• {by_type['dormant_buyer']} dormant buyers to reengage")
    if by_type["quality_mix"]:
        summary_lines.append(f"• {by_type['quality_mix']} mixed-quality sales need review")
    if by_type["low_stock"]:
        summary_lines.append(f"• {by_type['low_stock']} fabrics below safety threshold")

    summary_lines.append("")
    summary_lines.append("View dashboard: caratsense.in/dashboard")

    return {
        "digest_text": "\n".join(summary_lines),
        "total_actions": data["total"],
        "stats": data["by_type"],
    }
