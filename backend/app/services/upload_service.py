import io
from datetime import date

import pandas as pd
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.articles import Article
from app.models.buyers import Buyer
from app.models.purchases import Purchase
from app.models.sales import Sale
from app.models.stock import StockEntry
from app.models.warehouse import Rack


async def process_excel_upload(
    contents: bytes, file_type: str, filename: str, db: AsyncSession
) -> dict:
    buf = io.BytesIO(contents)
    handler = HANDLERS.get(file_type)
    if not handler:
        return {"error": f"Unknown file type: {file_type}", "imported": 0}
    return await handler(buf, db)


async def import_sales_vouchers(buf: io.BytesIO, db: AsyncSession) -> dict:
    df = pd.read_excel(buf, header=2)
    df.columns = ["date", "voucher_no", "narration", "buyer", "item_details", "qty_pcs", "unit1", "qty_mtrs", "unit2"]
    df = df.dropna(subset=["voucher_no"])

    imported = 0
    for _, row in df.iterrows():
        buyer_name = str(row.get("buyer", "")).strip()
        if not buyer_name or buyer_name == "nan":
            continue

        # Find or create buyer
        result = await db.execute(select(Buyer).where(Buyer.name == buyer_name))
        buyer = result.scalar_one_or_none()
        if not buyer:
            buyer = Buyer(
                name=buyer_name,
                normalized_name=buyer_name.upper().replace(".", "").replace(",", ""),
            )
            db.add(buyer)
            await db.flush()

        # Parse article code from item_details
        item_details = str(row.get("item_details", ""))
        article_code = item_details.split()[0] if item_details.strip() else None

        article_id = None
        if article_code and article_code != "nan":
            result = await db.execute(select(Article).where(Article.article_code == article_code))
            article = result.scalar_one_or_none()
            if not article:
                article = Article(article_code=article_code)
                db.add(article)
                await db.flush()
            article_id = article.id

        voucher_date = None
        if pd.notna(row.get("date")):
            try:
                voucher_date = pd.to_datetime(row["date"]).date()
            except Exception:
                pass

        sale = Sale(
            voucher_number=str(row["voucher_no"]),
            voucher_date=voucher_date,
            buyer_id=buyer.id,
            article_id=article_id,
            quantity_pieces=int(row["qty_pcs"]) if pd.notna(row.get("qty_pcs")) else None,
            quantity_meters=float(row["qty_mtrs"]) if pd.notna(row.get("qty_mtrs")) else None,
            sale_type="dyed",
        )
        db.add(sale)
        imported += 1

    return {"status": "success", "file_type": "sales_vouchers", "imported": imported}


async def import_quality_reference(buf: io.BytesIO, db: AsyncSession) -> dict:
    df = pd.read_excel(buf)
    df.columns = ["article_code", "description", "col3", "quality_category"]
    df = df.dropna(subset=["article_code"])

    imported = 0
    for _, row in df.iterrows():
        code = str(row["article_code"]).strip()
        if not code or code == "nan":
            continue

        result = await db.execute(select(Article).where(Article.article_code == code))
        article = result.scalar_one_or_none()

        quality_cat = str(row.get("quality_category", "")).strip()
        if quality_cat == "nan":
            quality_cat = None

        desc = str(row.get("description", "")).strip()
        if desc == "nan":
            desc = None

        if article:
            if quality_cat:
                article.quality_category = quality_cat
            if desc:
                article.description = desc
        else:
            article = Article(
                article_code=code,
                description=desc,
                quality_category=quality_cat,
            )
            db.add(article)
        imported += 1

    return {"status": "success", "file_type": "quality_reference", "imported": imported}


async def import_rack_numbers(buf: io.BytesIO, db: AsyncSession) -> dict:
    df = pd.read_excel(buf)
    imported = 0

    # Rack numbers file has paired columns: hall, goods, hall.1, goods.1, ...
    num_pairs = len(df.columns) // 2
    for i in range(num_pairs):
        hall_col = df.columns[i * 2]
        goods_col = df.columns[i * 2 + 1]

        for _, row in df.iterrows():
            rack_num = row.get(hall_col)
            article = row.get(goods_col)
            if pd.isna(rack_num):
                continue

            rack_number = str(int(rack_num)) if isinstance(rack_num, float) else str(rack_num)

            result = await db.execute(select(Rack).where(Rack.rack_number == rack_number))
            existing = result.scalar_one_or_none()
            if existing:
                if pd.notna(article):
                    existing.assigned_article = str(article)
            else:
                rack = Rack(
                    rack_number=rack_number,
                    hall=rack_number,  # derive hall from rack number range
                    assigned_article=str(article) if pd.notna(article) else None,
                )
                db.add(rack)
            imported += 1

    return {"status": "success", "file_type": "rack_numbers", "imported": imported}


async def import_dyed_sale(buf: io.BytesIO, db: AsyncSession) -> dict:
    # DYED SALE.xlsx has 16 sheets — focus on SALES and PURCHASE
    xls = pd.ExcelFile(buf)
    total_imported = 0

    for sheet_name in xls.sheet_names:
        name_lower = sheet_name.lower()
        if "sale" in name_lower:
            df = pd.read_excel(buf, sheet_name=sheet_name)
            if len(df.columns) >= 9:
                df.columns = ["date", "voucher_no", "narration", "buyer", "item_details", "qty_pcs", "unit1", "qty_mtrs", "unit2"]
                df = df.dropna(subset=["voucher_no"])

                is_grey = "grey" in name_lower
                for _, row in df.iterrows():
                    buyer_name = str(row.get("buyer", "")).strip()
                    if not buyer_name or buyer_name == "nan":
                        continue

                    result = await db.execute(select(Buyer).where(Buyer.name == buyer_name))
                    buyer = result.scalar_one_or_none()
                    if not buyer:
                        buyer = Buyer(
                            name=buyer_name,
                            normalized_name=buyer_name.upper().replace(".", "").replace(",", ""),
                        )
                        db.add(buyer)
                        await db.flush()

                    voucher_date = None
                    if pd.notna(row.get("date")):
                        try:
                            voucher_date = pd.to_datetime(row["date"]).date()
                        except Exception:
                            pass

                    sale = Sale(
                        voucher_number=str(row["voucher_no"]) if pd.notna(row["voucher_no"]) else None,
                        voucher_date=voucher_date,
                        buyer_id=buyer.id,
                        quantity_pieces=int(row["qty_pcs"]) if pd.notna(row.get("qty_pcs")) else None,
                        quantity_meters=float(row["qty_mtrs"]) if pd.notna(row.get("qty_mtrs")) else None,
                        sale_type="grey" if is_grey else "dyed",
                    )
                    db.add(sale)
                    total_imported += 1

        elif "purchase" in name_lower:
            df = pd.read_excel(buf, sheet_name=sheet_name)
            if len(df.columns) >= 9:
                df.columns = ["date", "voucher_no", "narration", "supplier", "item_details", "qty_pcs", "unit1", "qty_mtrs", "unit2"]
                df = df.dropna(subset=["voucher_no"])

                for _, row in df.iterrows():
                    voucher_date = None
                    if pd.notna(row.get("date")):
                        try:
                            voucher_date = pd.to_datetime(row["date"]).date()
                        except Exception:
                            pass

                    purchase = Purchase(
                        voucher_number=str(row["voucher_no"]) if pd.notna(row["voucher_no"]) else None,
                        voucher_date=voucher_date,
                        supplier=str(row.get("supplier", "")).strip() if pd.notna(row.get("supplier")) else None,
                        quantity_pieces=int(row["qty_pcs"]) if pd.notna(row.get("qty_pcs")) else None,
                        quantity_meters=float(row["qty_mtrs"]) if pd.notna(row.get("qty_mtrs")) else None,
                        purchase_type="dyed",
                    )
                    db.add(purchase)
                    total_imported += 1

    return {"status": "success", "file_type": "dyed_sale", "imported": total_imported}


async def import_packing_list(buf: io.BytesIO, db: AsyncSession) -> dict:
    df = pd.read_excel(buf)
    # Packing list has irregular structure — extract article/rack mappings
    imported = 0
    # Will be refined once we understand the exact format better
    return {"status": "success", "file_type": "packing_list", "imported": imported, "note": "Packing list import requires format refinement"}


HANDLERS = {
    "sales_vouchers": import_sales_vouchers,
    "quality_reference": import_quality_reference,
    "rack_numbers": import_rack_numbers,
    "dyed_sale": import_dyed_sale,
    "packing_list": import_packing_list,
}
