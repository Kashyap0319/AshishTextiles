"""
Import packing lists → stock_entries table + compute aging.
Run from backend/: python import_stock.py
"""
import asyncio
import sys
import os
from datetime import date, timedelta
import random

sys.path.insert(0, os.path.dirname(__file__))

import pandas as pd
from sqlalchemy import select, func

from app.database import engine, async_session
from app.models.base import Base
from app.models.articles import Article
from app.models.stock import StockEntry
from app.models.warehouse import Rack

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


async def clear_stock():
    """Clear existing stock entries for fresh import."""
    async with async_session() as session:
        await session.execute(StockEntry.__table__.delete())
        await session.commit()
    print("[OK] Cleared existing stock entries")


async def import_packing_list_sample():
    """
    packing list sample.xlsx structure:
    - 'Product Description' rows: col2 has "ARTICLE - ... " info
    - Data rows: col0=S No (numeric), col3=Bale No, col4=Qty(meter), col6=Rack, col7=Article
    """
    path = os.path.join(DATA_DIR, "packing list sample.xlsx")
    df = pd.read_excel(path, header=None)

    async with async_session() as session:
        # Build article cache
        result = await session.execute(select(Article))
        article_cache = {a.article_code: a.id for a in result.scalars().all()}

        # Build rack→hall cache
        result = await session.execute(select(Rack))
        rack_hall = {r.rack_number: r.hall for r in result.scalars().all()}

        count = 0
        current_article_code = None

        for i in range(len(df)):
            row = df.iloc[i]
            col0 = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ""

            # Product Description row — extract article code from col 7 or col 2
            if col0 == "Product Description":
                art_code = str(row.iloc[7]).strip() if pd.notna(row.iloc[7]) else None
                if not art_code or art_code == "nan":
                    # Try parsing from the description string in col 2
                    desc = str(row.iloc[2]).strip() if pd.notna(row.iloc[2]) else ""
                    art_code = desc.split(" - ")[0].strip() if " - " in desc else None
                if art_code and art_code != "nan":
                    current_article_code = art_code
                continue

            # Skip header rows, sub totals, blanks
            if col0 in ("S No", "", "nan", "Sub Total") or not col0:
                continue

            # Try to parse as data row (col0 should be numeric S No)
            try:
                int(float(col0))
            except (ValueError, TypeError):
                continue

            # Extract fields
            batch = str(row.iloc[3]).strip() if pd.notna(row.iloc[3]) else None
            if not batch or batch == "nan":
                continue

            meters = None
            try:
                meters = float(row.iloc[4]) if pd.notna(row.iloc[4]) else None
            except (ValueError, TypeError):
                continue
            if not meters or meters <= 0:
                continue

            try:
                raw_rack = row.iloc[6]
                if pd.notna(raw_rack):
                    rack_number = str(int(float(raw_rack))).strip() if isinstance(raw_rack, (int, float)) else str(raw_rack).strip()
                else:
                    rack_number = None
            except (ValueError, TypeError):
                rack_number = str(row.iloc[6]).strip() if pd.notna(row.iloc[6]) else None
            if rack_number in ("nan", ""):
                rack_number = None

            art_code = str(row.iloc[7]).strip() if pd.notna(row.iloc[7]) else current_article_code
            if art_code == "nan":
                art_code = current_article_code

            # Find article ID
            article_id = article_cache.get(art_code) if art_code else None
            if art_code and not article_id:
                # Create article
                article = Article(article_code=art_code)
                session.add(article)
                await session.flush()
                article_cache[art_code] = article.id
                article_id = article.id

            hall = rack_hall.get(rack_number) if rack_number else None

            # Simulate received_date for aging (spread over last 120 days)
            days_ago = random.randint(1, 120)
            received = date.today() - timedelta(days=days_ago)

            entry = StockEntry(
                article_id=article_id,
                batch_number=batch,
                meters=meters,
                pieces=1,
                rack_number=rack_number,
                hall=hall,
                status="available",
                received_date=received,
                aging_days=days_ago,
            )
            session.add(entry)
            count += 1

            if count % 500 == 0:
                await session.flush()

        await session.commit()
    print(f"[OK] Packing list sample: {count} stock entries imported")
    return count


async def import_packing_list_quality():
    """
    packing list for quality and rack number.xlsx structure:
    - 'Product Description' rows: col1 has "ARTICLE - ... " info
    - Data rows: col0=S No (numeric), col2=Bale No, col3=Qty(meter), col5=Quality
    """
    path = os.path.join(DATA_DIR, "packing list for quality and rack number.xlsx")
    df = pd.read_excel(path, header=None)

    async with async_session() as session:
        result = await session.execute(select(Article))
        article_cache = {a.article_code: a.id for a in result.scalars().all()}

        # Track which batches already exist to avoid duplicates
        result = await session.execute(select(StockEntry.batch_number).where(StockEntry.batch_number.isnot(None)))
        existing_batches = {r[0] for r in result.all()}

        count = 0
        current_article_code = None
        current_quality = None

        for i in range(len(df)):
            row = df.iloc[i]
            col0 = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ""

            if col0 == "Product Description":
                desc = str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else ""
                art_code = desc.split(" - ")[0].strip() if " - " in desc else None
                if art_code and art_code != "nan":
                    current_article_code = art_code
                quality = str(row.iloc[5]).strip() if pd.notna(row.iloc[5]) else None
                if quality and quality != "nan":
                    current_quality = quality
                continue

            if col0 in ("S No", "", "nan", "Sub Total", "Sale Order No. :", "Customer :", "Invoice Number :"):
                continue

            try:
                int(float(col0))
            except (ValueError, TypeError):
                continue

            batch = str(row.iloc[2]).strip() if pd.notna(row.iloc[2]) else None
            if not batch or batch == "nan":
                continue

            # Skip if already imported from the other packing list
            if batch in existing_batches:
                continue

            meters = None
            try:
                meters = float(row.iloc[3]) if pd.notna(row.iloc[3]) else None
            except (ValueError, TypeError):
                continue
            if not meters or meters <= 0:
                continue

            quality = str(row.iloc[5]).strip() if pd.notna(row.iloc[5]) else current_quality
            if quality == "nan":
                quality = current_quality

            art_code = current_article_code
            article_id = article_cache.get(art_code) if art_code else None
            if art_code and not article_id:
                article = Article(article_code=art_code, quality_category=quality)
                session.add(article)
                await session.flush()
                article_cache[art_code] = article.id
                article_id = article.id

            days_ago = random.randint(1, 120)
            received = date.today() - timedelta(days=days_ago)

            entry = StockEntry(
                article_id=article_id,
                batch_number=batch,
                meters=meters,
                pieces=1,
                status="available",
                received_date=received,
                aging_days=days_ago,
            )
            session.add(entry)
            existing_batches.add(batch)
            count += 1

            if count % 500 == 0:
                await session.flush()

        await session.commit()
    print(f"[OK] Packing list quality: {count} stock entries imported")
    return count


async def compute_aging():
    """Recompute aging_days for all stock entries based on received_date."""
    async with async_session() as session:
        result = await session.execute(select(StockEntry))
        today = date.today()
        updated = 0
        for entry in result.scalars().all():
            if entry.received_date:
                entry.aging_days = (today - entry.received_date).days
                updated += 1
        await session.commit()
    print(f"[OK] Aging recomputed for {updated} entries")


async def print_summary():
    async with async_session() as session:
        total = await session.execute(select(func.count(StockEntry.id)))
        available = await session.execute(
            select(func.count(StockEntry.id)).where(StockEntry.status == "available")
        )
        total_meters = await session.execute(
            select(func.coalesce(func.sum(StockEntry.meters), 0)).where(StockEntry.status == "available")
        )

        # Aging breakdown
        from sqlalchemy import case
        bucket = case(
            (StockEntry.aging_days <= 30, "0-30d"),
            (StockEntry.aging_days <= 60, "31-60d"),
            (StockEntry.aging_days <= 90, "61-90d"),
            else_="90+d",
        )
        aging = await session.execute(
            select(bucket.label("b"), func.count(StockEntry.id), func.sum(StockEntry.meters))
            .where(StockEntry.status == "available")
            .group_by(bucket)
        )
        print(f"\n  Total entries: {total.scalar()}")
        print(f"  Available: {available.scalar()}")
        print(f"  Total meters: {total_meters.scalar():,.0f}")
        print("  Aging breakdown:")
        for row in aging.all():
            print(f"    {row[0]}: {row[1]} entries, {row[2]:,.0f}m")


async def main():
    print("=" * 60)
    print("CaratSense Stock Import")
    print("=" * 60)

    await clear_stock()
    await import_packing_list_sample()
    await import_packing_list_quality()
    await compute_aging()
    await print_summary()

    print("\n" + "=" * 60)
    print("Stock import complete!")


if __name__ == "__main__":
    asyncio.run(main())
