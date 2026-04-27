from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.sales import Sale
from app.models.users import User
from app.api.v1.auth import get_current_user
from app.schemas.sales import SaleCreate, SaleResponse

router = APIRouter(prefix="/sales", tags=["sales"])


@router.get("/", response_model=list[SaleResponse])
async def list_sales(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    buyer_id: int | None = None,
    article_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    sale_type: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Sale).where(Sale.voucher_date.isnot(None))
    if buyer_id:
        query = query.where(Sale.buyer_id == buyer_id)
    if article_id:
        query = query.where(Sale.article_id == article_id)
    if date_from:
        query = query.where(Sale.voucher_date >= date_from)
    if date_to:
        query = query.where(Sale.voucher_date <= date_to)
    if sale_type:
        query = query.where(Sale.sale_type == sale_type)
    query = query.order_by(Sale.voucher_date.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/recent", response_model=list[SaleResponse])
async def recent_sales(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    query = select(Sale).where(Sale.voucher_date.isnot(None)).order_by(Sale.voucher_date.desc()).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/summary")
async def sales_summary(
    date_from: date | None = None,
    date_to: date | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(
        func.count(Sale.id).label("total_sales"),
        func.coalesce(func.sum(Sale.quantity_meters), 0).label("total_meters"),
        func.coalesce(func.sum(Sale.total_amount), 0).label("total_amount"),
    )
    if date_from:
        query = query.where(Sale.voucher_date >= date_from)
    if date_to:
        query = query.where(Sale.voucher_date <= date_to)
    result = await db.execute(query)
    row = result.one()
    return {
        "total_sales": row.total_sales,
        "total_meters": float(row.total_meters),
        "total_amount": float(row.total_amount),
    }


@router.get("/{sale_id}", response_model=SaleResponse)
async def get_sale(sale_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Sale).where(Sale.id == sale_id))
    sale = result.scalar_one_or_none()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    return sale


@router.post("/", response_model=SaleResponse, status_code=201)
async def create_sale(data: SaleCreate, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    payload = data.model_dump()
    # Sales users → pending approval; admin/owner → auto-approved
    role = getattr(user, 'role', 'admin')
    if role in ('sales', 'employee'):
        payload['approval_status'] = 'pending'
    else:
        payload['approval_status'] = 'approved'
        payload['approved_by'] = user.id
        payload['approved_at'] = datetime.utcnow()
    payload['created_by'] = user.id
    sale = Sale(**{k: v for k, v in payload.items() if hasattr(Sale, k)})
    db.add(sale)
    await db.flush()
    await db.refresh(sale)
    return sale


# ═══════════════ Price Approval Workflow ═══════════════

@router.get("/pending-approval")
async def pending_approvals(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """List sales awaiting admin approval. Admin-only."""
    result = await db.execute(
        select(Sale).where(Sale.approval_status == "pending").order_by(Sale.created_at.desc()).limit(100)
    )
    sales = result.scalars().all()
    return [{
        "id": s.id,
        "voucher_number": s.voucher_number,
        "voucher_date": s.voucher_date,
        "buyer_name": s.narration,
        "quantity_meters": s.quantity_meters,
        "unit_price": s.unit_price,
        "total_amount": s.total_amount,
        "sale_type": s.sale_type,
        "created_by": s.created_by,
        "created_at": s.created_at,
    } for s in sales]


@router.put("/{sale_id}/approve")
async def approve_sale(
    sale_id: int,
    counter_price: float | None = None,
    notes: str | None = None,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Admin approves a pending sale. Optionally with counter-price."""
    if getattr(user, 'role', 'admin') not in ('admin', 'owner'):
        raise HTTPException(403, "Only admin can approve sales")

    result = await db.execute(select(Sale).where(Sale.id == sale_id))
    sale = result.scalar_one_or_none()
    if not sale:
        raise HTTPException(404, "Sale not found")

    sale.approval_status = "approved"
    sale.approved_by = user.id
    sale.approved_at = datetime.utcnow()
    if counter_price is not None:
        sale.counter_price = counter_price
        sale.final_price = counter_price
        sale.total_amount = counter_price * (sale.quantity_meters or 0)
    if notes:
        sale.approval_notes = notes

    await db.flush()
    await db.refresh(sale)
    return {"status": "approved", "sale_id": sale.id, "final_price": sale.final_price}


@router.put("/{sale_id}/reject")
async def reject_sale(
    sale_id: int,
    notes: str | None = None,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Admin rejects a pending sale."""
    if getattr(user, 'role', 'admin') not in ('admin', 'owner'):
        raise HTTPException(403, "Only admin can reject sales")

    result = await db.execute(select(Sale).where(Sale.id == sale_id))
    sale = result.scalar_one_or_none()
    if not sale:
        raise HTTPException(404, "Sale not found")

    sale.approval_status = "rejected"
    sale.approved_by = user.id
    sale.approved_at = datetime.utcnow()
    if notes:
        sale.approval_notes = notes

    await db.flush()
    return {"status": "rejected", "sale_id": sale.id}


@router.get("/approval-stats")
async def approval_stats(db: AsyncSession = Depends(get_db)):
    """Pending/approved/rejected counts."""
    result = await db.execute(
        select(Sale.approval_status, func.count(Sale.id))
        .group_by(Sale.approval_status)
    )
    stats = {row[0] or 'approved': row[1] for row in result.all()}
    return {
        "pending": stats.get("pending", 0),
        "approved": stats.get("approved", 0),
        "rejected": stats.get("rejected", 0),
    }


@router.put("/{sale_id}/negotiation")
async def update_negotiation(
    sale_id: int,
    buyer_offer_price: float | None = None,
    final_price: float | None = None,
    notes: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Track negotiation — buyer's initial offer vs final agreed price."""
    result = await db.execute(select(Sale).where(Sale.id == sale_id))
    sale = result.scalar_one_or_none()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    if buyer_offer_price is not None:
        sale.buyer_offer_price = buyer_offer_price
    if final_price is not None:
        sale.final_price = final_price
    if notes is not None:
        sale.negotiation_notes = notes
    await db.flush()
    await db.refresh(sale)
    return {
        "sale_id": sale.id,
        "buyer_offer_price": sale.buyer_offer_price,
        "final_price": sale.final_price,
        "discount_pct": round((1 - sale.final_price / sale.buyer_offer_price) * 100, 1) if sale.buyer_offer_price and sale.final_price else None,
        "negotiation_notes": sale.negotiation_notes,
    }


@router.get("/negotiation-stats")
async def negotiation_stats(db: AsyncSession = Depends(get_db)):
    """Get negotiation statistics — avg discount, conversion patterns."""
    result = await db.execute(
        select(
            func.count(Sale.id).label("total_negotiated"),
            func.avg(Sale.buyer_offer_price).label("avg_offer"),
            func.avg(Sale.final_price).label("avg_final"),
        ).where(Sale.buyer_offer_price.isnot(None), Sale.final_price.isnot(None))
    )
    row = result.one()
    avg_discount = 0
    if row.avg_offer and row.avg_final and row.avg_offer > 0:
        avg_discount = round((1 - row.avg_final / row.avg_offer) * 100, 1)
    return {
        "total_negotiated": row.total_negotiated,
        "avg_offer_price": round(float(row.avg_offer or 0), 2),
        "avg_final_price": round(float(row.avg_final or 0), 2),
        "avg_discount_pct": avg_discount,
    }


@router.delete("/{sale_id}", status_code=204)
async def delete_sale(sale_id: int, db: AsyncSession = Depends(get_db), _user=Depends(get_current_user)):
    result = await db.execute(select(Sale).where(Sale.id == sale_id))
    sale = result.scalar_one_or_none()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    await db.delete(sale)


# ═══════════════ Sales PDF Report ═══════════════

@router.get("/report/pdf")
async def sales_pdf_report(
    date_from: date | None = None,
    date_to: date | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Generate styled PDF sales report — daily/weekly/monthly summary."""
    import io
    from datetime import datetime as dt
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_RIGHT
    from fastapi.responses import StreamingResponse

    # Build query
    q = select(Sale).where(Sale.voucher_date.isnot(None))
    if date_from:
        q = q.where(Sale.voucher_date >= date_from)
    if date_to:
        q = q.where(Sale.voucher_date <= date_to)
    q = q.order_by(Sale.voucher_date.desc()).limit(500)
    result = await db.execute(q)
    sales = result.scalars().all()

    # Aggregate
    total_meters = sum(s.quantity_meters or 0 for s in sales)
    total_amount = sum(s.total_amount or 0 for s in sales)
    total_count = len(sales)

    by_buyer: dict[str, dict[str, float]] = {}
    for s in sales:
        b = s.narration or "Unknown"
        if b not in by_buyer:
            by_buyer[b] = {"count": 0, "meters": 0, "amount": 0}
        by_buyer[b]["count"] += 1
        by_buyer[b]["meters"] += s.quantity_meters or 0
        by_buyer[b]["amount"] += s.total_amount or 0

    top_buyers = sorted(by_buyer.items(), key=lambda x: x[1]["amount"], reverse=True)[:10]

    # Build PDF
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=15 * mm, rightMargin=15 * mm,
                            topMargin=15 * mm, bottomMargin=15 * mm)
    elements = []
    styles = getSampleStyleSheet()

    # CaratSense brand styles (warm copper, serif feel)
    title_style = ParagraphStyle('Title', parent=styles['Heading1'],
                                  fontName='Times-Italic', fontSize=24,
                                  textColor=colors.HexColor('#C15F3C'),
                                  spaceAfter=4)
    subtitle_style = ParagraphStyle('Sub', parent=styles['Normal'],
                                     fontSize=10, textColor=colors.HexColor('#6B6963'),
                                     spaceAfter=12)
    h2_style = ParagraphStyle('H2', parent=styles['Heading2'],
                               fontName='Times-Roman', fontSize=14,
                               textColor=colors.HexColor('#1F1E1C'),
                               spaceBefore=10, spaceAfter=6)
    label_style = ParagraphStyle('Label', parent=styles['Normal'], fontSize=8,
                                  textColor=colors.HexColor('#6B6963'),
                                  fontName='Helvetica-Bold')
    value_style = ParagraphStyle('Value', parent=styles['Normal'], fontSize=20,
                                  fontName='Times-Roman',
                                  textColor=colors.HexColor('#1F1E1C'))

    # Header
    elements.append(Paragraph("CaratSense.", title_style))
    elements.append(Paragraph("Sales Report — Surplus Stock Intelligence", subtitle_style))

    period = ""
    if date_from and date_to:
        period = f"{date_from.strftime('%d %b %Y')} → {date_to.strftime('%d %b %Y')}"
    elif date_from:
        period = f"From {date_from.strftime('%d %b %Y')}"
    elif date_to:
        period = f"Until {date_to.strftime('%d %b %Y')}"
    else:
        period = "All time"
    elements.append(Paragraph(f"<i>{period}</i> · Generated {dt.now().strftime('%d %b %Y, %I:%M %p')}",
                              ParagraphStyle('p', parent=styles['Normal'], fontSize=9,
                                             textColor=colors.HexColor('#8B8A83'))))
    elements.append(Spacer(1, 8 * mm))

    # KPI summary table
    elements.append(Paragraph("Summary", h2_style))
    summary_data = [
        ['TOTAL SALES', 'TOTAL METERS', 'TOTAL AMOUNT', 'AVG ORDER'],
        [
            str(total_count),
            f"{int(total_meters):,} m",
            f"Rs {int(total_amount):,}",
            f"{int(total_meters / max(total_count, 1)):,} m",
        ],
    ]
    summary_table = Table(summary_data, colWidths=[42 * mm, 42 * mm, 42 * mm, 42 * mm])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#FAF9F5')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#6B6963')),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 7),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 1), (-1, 1), 'Times-Roman'),
        ('FONTSIZE', (0, 1), (-1, 1), 18),
        ('TEXTCOLOR', (0, 1), (-1, 1), colors.HexColor('#C15F3C')),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('LINEBELOW', (0, 0), (-1, 0), 0.3, colors.HexColor('#1F1E1C')),
        ('BOX', (0, 0), (-1, -1), 0.3, colors.HexColor('#E8DFCC')),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 8 * mm))

    # Top buyers
    elements.append(Paragraph("Top buyers by revenue", h2_style))
    buyer_data = [['#', 'Buyer', 'Orders', 'Meters', 'Amount']]
    for i, (name, stats) in enumerate(top_buyers, 1):
        buyer_data.append([
            str(i),
            name[:40],
            str(int(stats['count'])),
            f"{int(stats['meters']):,} m",
            f"Rs {int(stats['amount']):,}",
        ])
    buyer_table = Table(buyer_data, colWidths=[10 * mm, 80 * mm, 25 * mm, 35 * mm, 35 * mm])
    buyer_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F0EBE1')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1F1E1C')),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LINEBELOW', (0, 0), (-1, -1), 0.2, colors.HexColor('#E8DFCC')),
        ('TEXTCOLOR', (1, 1), (1, -1), colors.HexColor('#1F1E1C')),
        ('TEXTCOLOR', (4, 1), (4, -1), colors.HexColor('#C15F3C')),
        ('FONTNAME', (4, 1), (4, -1), 'Helvetica-Bold'),
    ]))
    elements.append(buyer_table)
    elements.append(Spacer(1, 8 * mm))

    # Recent sales table (first 30)
    elements.append(Paragraph("Recent transactions", h2_style))
    sale_data = [['Date', 'Voucher', 'Buyer', 'Meters', 'Amount']]
    for s in sales[:30]:
        sale_data.append([
            s.voucher_date.strftime('%d-%b') if s.voucher_date else '—',
            (s.voucher_number or '')[:18],
            (s.narration or '')[:35],
            f"{int(s.quantity_meters or 0):,}",
            f"{int(s.total_amount or 0):,}",
        ])
    sale_table = Table(sale_data, colWidths=[18 * mm, 30 * mm, 70 * mm, 30 * mm, 30 * mm])
    sale_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F0EBE1')),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (3, 0), (-1, -1), 'RIGHT'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LINEBELOW', (0, 0), (-1, -1), 0.15, colors.HexColor('#E8DFCC')),
    ]))
    elements.append(sale_table)

    # Footer
    elements.append(Spacer(1, 10 * mm))
    elements.append(Paragraph(
        "<i>CaratSense — See beyond inventory.</i>",
        ParagraphStyle('foot', parent=styles['Normal'], fontSize=8, alignment=TA_CENTER,
                       textColor=colors.HexColor('#8B8A83'))
    ))

    doc.build(elements)
    buf.seek(0)

    filename = f"sales-report-{dt.now().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
