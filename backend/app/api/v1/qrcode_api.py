"""QR Code Engine — generate QR labels for stock items, scan to view history."""
import io
import json

import qrcode
from qrcode.image.pil import PilImage
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Image, Paragraph, Spacer, Table as RLTable, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.stock import StockEntry
from app.models.articles import Article

router = APIRouter(prefix="/qr", tags=["qr"])


def generate_qr_image(data: str, size: int = 200) -> io.BytesIO:
    qr = qrcode.QRCode(version=1, box_size=8, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf


@router.get("/stock/{stock_id}/image")
async def get_qr_image(stock_id: int, db: AsyncSession = Depends(get_db)):
    """Get QR code image (PNG) for a stock entry. Scan opens stock detail page."""
    result = await db.execute(select(StockEntry).where(StockEntry.id == stock_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Stock not found")

    # QR data = JSON with stock info + URL
    qr_data = json.dumps({
        "type": "caratsense_stock",
        "id": stock_id,
        "article": entry.article.article_code if entry.article else "?",
        "meters": entry.meters,
        "batch": entry.batch_number,
        "rack": entry.rack_number,
    })

    buf = generate_qr_image(qr_data)
    return StreamingResponse(buf, media_type="image/png",
                             headers={"Content-Disposition": f'inline; filename="qr_stock_{stock_id}.png"'})


@router.get("/stock/{stock_id}/label")
async def get_qr_label_pdf(stock_id: int, db: AsyncSession = Depends(get_db)):
    """Get printable PDF label with QR code + stock details."""
    result = await db.execute(select(StockEntry).where(StockEntry.id == stock_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Stock not found")

    art = entry.article
    article_code = art.article_code if art else "?"
    quality = art.quality_category if art else "-"

    # Generate QR
    qr_data = json.dumps({"type": "caratsense_stock", "id": stock_id})
    qr_buf = generate_qr_image(qr_data, size=150)

    # Build PDF label (small — 100mm x 60mm)
    pdf_buf = io.BytesIO()
    doc = SimpleDocTemplate(pdf_buf, pagesize=(100*mm, 60*mm),
                            leftMargin=5*mm, rightMargin=5*mm, topMargin=5*mm, bottomMargin=5*mm)
    styles = getSampleStyleSheet()

    qr_img = Image(qr_buf, width=30*mm, height=30*mm)

    info_data = [
        [qr_img, Paragraph(f"<b>{article_code}</b><br/>{quality}<br/>{entry.meters}m<br/>Rack: {entry.rack_number or '-'}<br/>Batch: {entry.batch_number or '-'}", styles['Normal'])],
    ]
    table = RLTable(info_data, colWidths=[35*mm, 55*mm])
    table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
    ]))

    doc.build([table])
    pdf_buf.seek(0)

    return StreamingResponse(pdf_buf, media_type="application/pdf",
                             headers={"Content-Disposition": f'attachment; filename="label_{stock_id}.pdf"'})


@router.get("/batch-labels")
async def batch_labels(
    ids: str = Query(..., description="Comma-separated stock IDs"),
    db: AsyncSession = Depends(get_db),
):
    """Generate a single PDF with multiple QR labels (for batch printing)."""
    stock_ids = [int(x.strip()) for x in ids.split(",") if x.strip()]
    if not stock_ids or len(stock_ids) > 50:
        raise HTTPException(status_code=400, detail="Provide 1-50 stock IDs")

    result = await db.execute(select(StockEntry).where(StockEntry.id.in_(stock_ids)))
    entries = {e.id: e for e in result.scalars().all()}

    pdf_buf = io.BytesIO()
    doc = SimpleDocTemplate(pdf_buf, pagesize=A4, leftMargin=10*mm, rightMargin=10*mm,
                            topMargin=10*mm, bottomMargin=10*mm)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph("<b>CaratSense — Stock Labels</b>", styles['Heading2']))
    elements.append(Spacer(1, 5*mm))

    # 3 labels per row
    row_items = []
    for sid in stock_ids:
        entry = entries.get(sid)
        if not entry:
            continue

        art = entry.article
        qr_data = json.dumps({"type": "caratsense_stock", "id": sid})
        qr_buf = generate_qr_image(qr_data)
        qr_img = Image(qr_buf, width=25*mm, height=25*mm)

        label = [
            qr_img,
            Paragraph(f"<b>{art.article_code if art else '?'}</b><br/>{entry.meters}m | Rack {entry.rack_number or '-'}", styles['Normal']),
        ]
        row_items.append(label)

        if len(row_items) == 3:
            table = RLTable([row_items], colWidths=[60*mm, 60*mm, 60*mm], rowHeights=[35*mm])
            table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.grey),
                ('INNERGRID', (0, 0), (-1, -1), 0.25, colors.lightgrey),
                ('FONTSIZE', (0, 0), (-1, -1), 7),
            ]))
            elements.append(table)
            elements.append(Spacer(1, 3*mm))
            row_items = []

    if row_items:
        while len(row_items) < 3:
            row_items.append(["", ""])
        table = RLTable([row_items], colWidths=[60*mm, 60*mm, 60*mm], rowHeights=[35*mm])
        elements.append(table)

    doc.build(elements)
    pdf_buf.seek(0)

    return StreamingResponse(pdf_buf, media_type="application/pdf",
                             headers={"Content-Disposition": 'attachment; filename="batch_labels.pdf"'})
