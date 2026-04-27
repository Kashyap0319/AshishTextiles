"""Excel export endpoints for all tables."""
import io
from datetime import date

import pandas as pd
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.articles import Article
from app.models.buyers import Buyer
from app.models.sales import Sale
from app.models.stock import StockEntry
from app.models.purchases import Purchase

router = APIRouter(prefix="/export", tags=["export"])


def make_excel_response(df: pd.DataFrame, filename: str) -> StreamingResponse:
    buf = io.BytesIO()
    df.to_excel(buf, index=False, engine="openpyxl")
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/stock")
async def export_stock(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(StockEntry).order_by(StockEntry.aging_days.desc()).limit(50000))
    entries = result.scalars().all()
    rows = []
    for e in entries:
        art = e.article
        rows.append({
            "Article": art.article_code if art else "",
            "Quality": art.quality_category if art else "",
            "Quality Group": art.quality_group if art else "",
            "Batch": e.batch_number or "",
            "Meters": e.meters,
            "Rack": e.rack_number or "",
            "Hall": e.hall or "",
            "Status": e.status,
            "Aging (days)": e.aging_days,
            "Received Date": str(e.received_date) if e.received_date else "",
        })
    return make_excel_response(pd.DataFrame(rows), f"stock_export_{date.today()}.xlsx")


@router.get("/buyers")
async def export_buyers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Buyer).where(Buyer.is_active == True).order_by(Buyer.total_purchases_meters.desc()))
    buyers = result.scalars().all()
    rows = []
    for b in buyers:
        rows.append({
            "Name": b.name,
            "Phone": b.phone or "",
            "City": b.city or "",
            "Type": b.buyer_type or "",
            "Total Meters": b.total_purchases_meters,
            "Total Orders": b.total_purchases_count,
            "Last Purchase": str(b.last_purchase_date) if b.last_purchase_date else "",
            "Fabric Preference": b.preferred_fabric_type or "",
        })
    return make_excel_response(pd.DataFrame(rows), f"buyers_export_{date.today()}.xlsx")


@router.get("/sales")
async def export_sales(
    date_from: date | None = None,
    date_to: date | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Sale).order_by(Sale.voucher_date.desc())
    if date_from:
        query = query.where(Sale.voucher_date >= date_from)
    if date_to:
        query = query.where(Sale.voucher_date <= date_to)
    result = await db.execute(query)
    sales = result.scalars().all()
    rows = []
    for s in sales:
        rows.append({
            "Date": str(s.voucher_date) if s.voucher_date else "",
            "Voucher": s.voucher_number or "",
            "Buyer": s.buyer.name if s.buyer else "",
            "Article": s.article.article_code if s.article else "",
            "Pieces": s.quantity_pieces,
            "Meters": s.quantity_meters,
            "Amount": s.total_amount,
            "Type": s.sale_type or "",
        })
    return make_excel_response(pd.DataFrame(rows), f"sales_export_{date.today()}.xlsx")


@router.get("/articles")
async def export_articles(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Article).order_by(Article.quality_group, Article.article_code))
    articles = result.scalars().all()
    rows = []
    for a in articles:
        rows.append({
            "Article Code": a.article_code,
            "Description": a.description or "",
            "Quality Category": a.quality_category or "",
            "Quality Group": a.quality_group or "",
            "Fabric Type": a.fabric_type or "",
        })
    return make_excel_response(pd.DataFrame(rows), f"articles_export_{date.today()}.xlsx")
