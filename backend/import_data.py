"""
Import all Excel data files into the CaratSense database.
Run from backend/: python import_data.py
"""
import asyncio
import sys
import os

# Add parent dir so we can import app
sys.path.insert(0, os.path.dirname(__file__))

import pandas as pd
from sqlalchemy import select

from app.database import engine, async_session
from app.models.base import Base
from app.models.articles import Article
from app.models.buyers import Buyer
from app.models.sales import Sale
from app.models.purchases import Purchase
from app.models.stock import StockEntry
from app.models.warehouse import Rack

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("[OK] Tables created (fresh)")


async def import_quality_reference():
    """Import SOFTWARE QUALITY REFERENCE.xlsx → articles table"""
    path = os.path.join(DATA_DIR, "SOFTWARE QUALITY REFERENCE.xlsx")
    df = pd.read_excel(path)
    df.columns = ["article_code", "description", "col3", "quality_category"]
    df = df.dropna(subset=["article_code"])

    # Build quality group mapping (~15-20 top-level groups)
    QUALITY_GROUPS = {
        "SATIN": ["SATIN", "SATIN-SHTG", "SATIN-SILK"],
        "TUSSUR": ["TUSSUR", "TUSSAR"],
        "PRINT": ["PRINT", "PRINT-SHTG", "PRINT-SILK", "PRINTED"],
        "LYCRA": ["LYCRA", "LYCRE", "LYCRE-RD", "LYCRE-TWILL", "LYCRA-DRILL"],
        "WHITE": ["WHITE", "RFD", "BLEACH"],
        "DRILL": ["DRILL", "LY-DRILL"],
        "DENIM": ["DENIM", "DENIM-SHTG"],
        "COTTON": ["COTTON", "CTN", "POPLIN"],
        "SILK": ["SILK", "CHIFFON", "GEORGETTE", "CREPE"],
        "POLYESTER": ["POLYESTER", "POLY", "MICRO"],
        "RAYON": ["RAYON", "VISCOSE"],
        "LINEN": ["LINEN", "FLAX"],
        "JACQUARD": ["JACQUARD", "DOBBY", "DBY"],
        "TWILL": ["TWILL", "GABARDINE"],
        "SHEETING": ["SHEETING", "SHTG", "BEDSHEET"],
        "KNIT": ["KNIT", "JERSEY", "INTERLOCK"],
        "OTHER": [],
    }

    def get_group(cat):
        if not cat or str(cat) == "nan":
            return "OTHER"
        cat_upper = str(cat).upper().strip()
        for group, keywords in QUALITY_GROUPS.items():
            if group == "OTHER":
                continue
            for kw in keywords:
                if kw in cat_upper:
                    return group
            if cat_upper.startswith(group[:4]):
                return group
        return "OTHER"

    async with async_session() as session:
        count = 0
        batch = []
        seen = set()
        for _, row in df.iterrows():
            code = str(row["article_code"]).strip()
            if not code or code == "nan" or code in seen:
                continue
            seen.add(code)

            quality_cat = str(row.get("quality_category", "")).strip()
            if quality_cat == "nan":
                quality_cat = None

            desc = str(row.get("description", "")).strip()
            if desc == "nan":
                desc = None

            batch.append(Article(
                article_code=code,
                description=desc,
                quality_category=quality_cat,
                quality_group=get_group(quality_cat),
            ))
            count += 1

            if len(batch) >= 500:
                session.add_all(batch)
                await session.flush()
                batch = []

        if batch:
            session.add_all(batch)
        await session.commit()
    print(f"[OK] Quality Reference: {count} articles imported")


async def import_rack_numbers():
    """Import rack numbers.xlsx → racks table"""
    path = os.path.join(DATA_DIR, "rack numbers.xlsx")
    df = pd.read_excel(path)

    async with async_session() as session:
        count = 0
        seen = set()
        num_pairs = len(df.columns) // 2
        for i in range(num_pairs):
            hall_col = df.columns[i * 2]
            goods_col = df.columns[i * 2 + 1]
            hall_name = f"Hall {i}" if i > 0 else "ATE"

            for _, row in df.iterrows():
                rack_num = row.get(hall_col)
                article = row.get(goods_col)
                if pd.isna(rack_num):
                    continue
                rack_number = str(int(rack_num)) if isinstance(rack_num, (float, int)) else str(rack_num)

                key = (rack_number, hall_name)
                if key in seen:
                    continue
                seen.add(key)

                rack = Rack(
                    rack_number=rack_number,
                    hall=hall_name,
                    assigned_article=str(article).strip() if pd.notna(article) else None,
                )
                session.add(rack)
                count += 1

        await session.commit()
    print(f"[OK] Rack Numbers: {count} racks imported")


async def import_sales_vouchers():
    """Import A_ListofSalesVouchers.xlsx → buyers + sales tables"""
    path = os.path.join(DATA_DIR, "A_ListofSalesVouchers.xlsx")
    df = pd.read_excel(path, header=2)
    df.columns = ["date", "voucher_no", "narration", "buyer", "item_details", "qty_pcs", "unit1", "qty_mtrs", "unit2"]

    async with async_session() as session:
        # Cache existing articles
        result = await session.execute(select(Article))
        article_cache = {a.article_code: a.id for a in result.scalars().all()}

        buyer_cache = {}
        sale_count = 0
        buyer_count = 0

        for _, row in df.iterrows():
            buyer_name = str(row.get("buyer", "")).strip()
            if not buyer_name or buyer_name == "nan":
                continue

            # Find or create buyer
            norm = buyer_name.upper().replace(".", "").replace(",", "").strip()
            if norm not in buyer_cache:
                buyer = Buyer(name=buyer_name, normalized_name=norm, is_active=True)
                session.add(buyer)
                await session.flush()
                buyer_cache[norm] = buyer.id
                buyer_count += 1

            buyer_id = buyer_cache[norm]

            # Parse article from item_details
            item_details = str(row.get("item_details", "")).strip()
            article_code = item_details.split()[0] if item_details and item_details != "nan" else None
            article_id = article_cache.get(article_code) if article_code else None

            # If article not in cache, create it
            if article_code and article_code != "nan" and article_id is None:
                art = Article(article_code=article_code)
                session.add(art)
                await session.flush()
                article_cache[article_code] = art.id
                article_id = art.id

            voucher_date = None
            if pd.notna(row.get("date")):
                try:
                    voucher_date = pd.to_datetime(row["date"]).date()
                except Exception:
                    pass

            # Parse quantities safely
            qty_pcs = None
            try:
                if pd.notna(row.get("qty_pcs")):
                    qty_pcs = int(float(row["qty_pcs"]))
            except (ValueError, TypeError):
                pass

            qty_mtrs = None
            try:
                if pd.notna(row.get("qty_mtrs")):
                    qty_mtrs = float(row["qty_mtrs"])
            except (ValueError, TypeError):
                pass

            sale = Sale(
                voucher_number=str(row["voucher_no"]) if pd.notna(row.get("voucher_no")) else None,
                voucher_date=voucher_date,
                buyer_id=buyer_id,
                article_id=article_id,
                quantity_pieces=qty_pcs,
                quantity_meters=qty_mtrs,
                sale_type="dyed",
            )
            session.add(sale)
            sale_count += 1

            if sale_count % 1000 == 0:
                await session.flush()

        await session.commit()
    print(f"[OK] Sales Vouchers: {sale_count} sales, {buyer_count} buyers imported")


async def import_dyed_sale():
    """Import DYED SALE.xlsx — multi-sheet sales & purchases"""
    path = os.path.join(DATA_DIR, "DYED SALE.xlsx")
    xls = pd.ExcelFile(path)

    async with async_session() as session:
        # Get existing buyer cache
        result = await session.execute(select(Buyer))
        buyer_cache = {b.normalized_name: b.id for b in result.scalars().all()}

        result = await session.execute(select(Article))
        article_cache = {a.article_code: a.id for a in result.scalars().all()}

        total_sales = 0
        total_purchases = 0

        for sheet_name in xls.sheet_names:
            name_lower = sheet_name.lower()
            try:
                df = pd.read_excel(path, sheet_name=sheet_name)
            except Exception as e:
                print(f"  [SKIP] Sheet '{sheet_name}': {e}")
                continue

            if len(df.columns) < 8:
                print(f"  [SKIP] Sheet '{sheet_name}': only {len(df.columns)} columns")
                continue

            # Standardize columns — take first 9, ignore extras
            ncols = len(df.columns)
            if ncols >= 9:
                df = df.iloc[:, :9]
                df.columns = ["date", "voucher_no", "narration", "party", "item_details", "qty_pcs", "unit1", "qty_mtrs", "unit2"]
            elif ncols >= 8:
                df = df.iloc[:, :8]
                df.columns = ["date", "voucher_no", "narration", "party", "item_details", "qty_pcs", "unit1", "qty_mtrs"]
            else:
                print(f"  [SKIP] Sheet '{sheet_name}': only {ncols} columns")
                continue

            df = df.dropna(subset=["voucher_no"])
            is_grey = "grey" in name_lower
            is_purchase = "purchase" in name_lower

            for _, row in df.iterrows():
                party_name = str(row.get("party", "")).strip()
                if not party_name or party_name == "nan":
                    continue

                voucher_date = None
                if pd.notna(row.get("date")):
                    try:
                        voucher_date = pd.to_datetime(row["date"]).date()
                    except Exception:
                        pass

                try:
                    qty_pcs = int(float(row["qty_pcs"])) if pd.notna(row.get("qty_pcs")) else None
                except (ValueError, TypeError):
                    qty_pcs = None
                try:
                    qty_mtrs = float(row["qty_mtrs"]) if pd.notna(row.get("qty_mtrs")) else None
                except (ValueError, TypeError):
                    qty_mtrs = None

                if is_purchase:
                    purchase = Purchase(
                        voucher_number=str(row["voucher_no"]) if pd.notna(row["voucher_no"]) else None,
                        voucher_date=voucher_date,
                        supplier=party_name,
                        quantity_pieces=qty_pcs,
                        quantity_meters=qty_mtrs,
                        purchase_type="grey" if is_grey else "dyed",
                    )
                    session.add(purchase)
                    total_purchases += 1
                else:
                    # Find or create buyer
                    norm = party_name.upper().replace(".", "").replace(",", "").strip()
                    if norm not in buyer_cache:
                        buyer = Buyer(name=party_name, normalized_name=norm, is_active=True)
                        session.add(buyer)
                        await session.flush()
                        buyer_cache[norm] = buyer.id

                    sale = Sale(
                        voucher_number=str(row["voucher_no"]) if pd.notna(row["voucher_no"]) else None,
                        voucher_date=voucher_date,
                        buyer_id=buyer_cache[norm],
                        quantity_pieces=qty_pcs,
                        quantity_meters=qty_mtrs,
                        sale_type="grey" if is_grey else "dyed",
                    )
                    session.add(sale)
                    total_sales += 1

                if (total_sales + total_purchases) % 2000 == 0:
                    await session.flush()

            print(f"  [OK] Sheet '{sheet_name}' processed")

        await session.commit()
    print(f"[OK] Dyed Sale: {total_sales} sales, {total_purchases} purchases imported")


async def update_buyer_stats():
    """Update buyer aggregate stats from sales data"""
    from sqlalchemy import func as sqlfunc
    async with async_session() as session:
        # Get buyer purchase summaries
        query = (
            select(
                Sale.buyer_id,
                sqlfunc.count(Sale.id).label("cnt"),
                sqlfunc.coalesce(sqlfunc.sum(Sale.quantity_meters), 0).label("total_m"),
                sqlfunc.max(Sale.voucher_date).label("last_date"),
            )
            .where(Sale.buyer_id.isnot(None))
            .group_by(Sale.buyer_id)
        )
        result = await session.execute(query)
        rows = result.all()

        for row in rows:
            buyer_result = await session.execute(select(Buyer).where(Buyer.id == row.buyer_id))
            buyer = buyer_result.scalar_one_or_none()
            if buyer:
                buyer.total_purchases_count = row.cnt
                buyer.total_purchases_meters = float(row.total_m)
                buyer.last_purchase_date = row.last_date

        await session.commit()
    print(f"[OK] Buyer stats updated for {len(rows)} buyers")


async def main():
    print("=" * 60)
    print("CaratSense Data Import")
    print("=" * 60)

    await create_tables()
    await import_quality_reference()
    await import_rack_numbers()
    await import_sales_vouchers()
    await import_dyed_sale()
    await update_buyer_stats()

    # Print summary
    async with async_session() as session:
        from sqlalchemy import func as sqlfunc
        for model, name in [(Article, "Articles"), (Buyer, "Buyers"), (Sale, "Sales"), (Purchase, "Purchases"), (Rack, "Racks")]:
            result = await session.execute(select(sqlfunc.count(model.id)))
            print(f"  {name}: {result.scalar()}")

    print("=" * 60)
    print("Import complete!")


if __name__ == "__main__":
    asyncio.run(main())
