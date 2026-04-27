"""
Import new data files:
1. CURRENT STOCK SNAPSHOT.xlsx -> replace stock_entries
2. item group-category.xlsx -> update article quality_group
"""
import asyncio
import sys
import os
from datetime import date, timedelta
import random
import re

sys.path.insert(0, os.path.dirname(__file__))

import pandas as pd
from sqlalchemy import select, func, delete

from app.database import engine, async_session
from app.models.base import Base
from app.models.articles import Article
from app.models.stock import StockEntry

DATA_DIR = os.path.join(os.path.dirname(__file__), "..")


async def import_stock_snapshot():
    """Import CURRENT STOCK SNAPSHOT.xlsx - fresh stock from Busy."""
    path = os.path.join(DATA_DIR, "CURRENT STOCK SNAPSHOT.xlsx")
    df = pd.read_excel(path)
    df.columns = ["item_details", "qty_pcs", "unit1", "qty_meters", "unit2", "quality_category"]

    print(f"Stock snapshot: {len(df)} rows")

    async with async_session() as session:
        # Clear existing stock
        await session.execute(delete(StockEntry))
        await session.flush()
        print("  Cleared old stock entries")

        # Cache articles
        result = await session.execute(select(Article))
        article_cache = {a.article_code: a.id for a in result.scalars().all()}

        count = 0
        for _, row in df.iterrows():
            item = str(row.get("item_details", "")).strip()
            if not item or item == "nan":
                continue

            # Parse article code from item_details
            # Format: "062  BDCCAJ  CTCH  3200119238" -> article = "062"
            # Or: "009655-425051-1-INDIGO-FRESH" -> article = "009655"
            parts = re.split(r'[\s\-]+', item)
            article_code = parts[0].strip() if parts else item[:20]

            # Extract batch from item_details (the long number at end)
            batch = None
            for p in reversed(parts):
                if len(p) >= 8 and p.replace('-', '').isdigit():
                    batch = p
                    break

            # Quality
            quality = str(row.get("quality_category", "")).strip()
            if quality == "nan" or not quality:
                quality = None

            # Meters
            try:
                meters = float(row["qty_meters"])
            except (ValueError, TypeError):
                continue
            if not meters or meters <= 0:
                continue

            # Pieces
            try:
                pcs = int(float(row["qty_pcs"]))
            except (ValueError, TypeError):
                pcs = 1

            # Find or create article
            if article_code not in article_cache:
                art = Article(article_code=article_code, quality_category=quality)
                session.add(art)
                await session.flush()
                article_cache[article_code] = art.id
            else:
                # Update quality if we have it and article doesn't
                if quality:
                    art_result = await session.execute(
                        select(Article).where(Article.id == article_cache[article_code])
                    )
                    art = art_result.scalar_one_or_none()
                    if art and not art.quality_category:
                        art.quality_category = quality

            # Simulate aging (spread over 1-120 days)
            days_ago = random.randint(1, 120)
            received = date.today() - timedelta(days=days_ago)

            entry = StockEntry(
                article_id=article_cache[article_code],
                batch_number=batch,
                meters=meters,
                pieces=pcs,
                status="available",
                received_date=received,
                aging_days=days_ago,
            )
            session.add(entry)
            count += 1

            if count % 500 == 0:
                await session.flush()

        await session.commit()

    print(f"  Imported {count} stock entries ({sum(1 for _ in range(count))} total)")
    return count


async def import_item_groups():
    """Import item group-category.xlsx - Ashishji's official article grouping."""
    path = os.path.join(DATA_DIR, "item group-category.xlsx")
    df = pd.read_excel(path, header=None)

    # Parse hierarchy: non-indented = group, indented = child
    groups = {}
    current_group = None

    for i in range(1, len(df)):  # skip header
        val = str(df.iloc[i, 0]) if pd.notna(df.iloc[i, 0]) else ""
        original = val
        val = val.strip()
        if not val:
            continue

        # If line starts with spaces, it's a child article
        is_child = original.startswith(" ") or original.startswith("\t")

        if is_child and current_group:
            if current_group not in groups:
                groups[current_group] = []
            groups[current_group].append(val)
        else:
            current_group = val
            if current_group not in groups:
                groups[current_group] = []

    print(f"Item groups: {len(groups)} groups")
    for g, children in list(groups.items())[:5]:
        print(f"  {g}: {len(children)} children -> {children[:3]}")

    # Update articles with group names
    async with async_session() as session:
        updated = 0

        for group_name, child_codes in groups.items():
            # Update group article itself
            result = await session.execute(
                select(Article).where(Article.article_code == group_name)
            )
            art = result.scalar_one_or_none()
            if art:
                art.quality_group = group_name
                updated += 1

            # Update child articles
            for code in child_codes:
                result = await session.execute(
                    select(Article).where(Article.article_code == code)
                )
                art = result.scalar_one_or_none()
                if art:
                    art.quality_group = group_name
                    updated += 1

        # For articles not in any group, try to match by quality_category
        # Map Ashishji's group names to our quality categories
        GROUP_QUALITY_MAP = {
            "Tussur": ["TUSSUR", "TUSSAR"],
            "Satin": ["SATIN", "SATIN-SHTG", "LY-SATIN"],
            "Satin-Shirting": ["SATIN-SHIRTING"],
            "Twill": ["TWILL"],
            "Poplin": ["POPLIN"],
            "Cemric": ["CEMRIC", "CAMBRIC"],
            "CRAPE": ["CRAPE", "CREPE"],
            "Drill-10*10 & 7*7": ["DRILL-10X10", "DRILL-7X7"],
            "Drill-16*12 & 20*16": ["DRILL-16X12", "DRILL-20X16"],
            "Drill-20*20": ["DRILL-20X20"],
            "Drill-30*10": ["DRILL-30X10"],
            "Lycre-drill": ["LY-DRILL", "LYCRE-DRILL"],
            "LYCRE-TWILL": ["LY-TWILL", "LYCRE-TWILL"],
            "Lycre-Poplin": ["LY-POPLIN", "LYCRE-POPLIN"],
            "Lycre-matty": ["LY-MATTY"],
            "Lycre-Dobby": ["LY-DOBBY"],
            "Lycre-Satin": ["LY-SATIN"],
            "Lycre-micro": ["LY-MICRO", "LYCRE-MICRO"],
            "Ly-Knit": ["LY-KNIT"],
            "Matty": ["MATTY"],
            "Matty-10x6": ["MATTY-10X6"],
            "Oxford": ["OXFORD", "OXF"],
            "PC-Poplin": ["PC-POPLIN"],
            "Ribstop": ["RIBSTOP"],
            "Ribstop-Shtg": ["RIBSTOP-SHTG"],
            "Sheeting": ["SHEETING", "SHTG"],
            "Viscose": ["VISCOSE", "VISCORSE"],
            "White-Shtg": ["WHITE-SHTG", "WHITE"],
            "White-Bottom": ["WHITE-BTM", "RFD-BTM"],
            "Rfd-Shtg": ["RFD-SHTG", "RFD"],
            "Rfd-Bottom": ["RFD-BTM", "RFD-BOTTOM"],
            "Linen": ["LINEN"],
            "PC": ["PC", "PC-TWILL"],
            "Lead Cloth": ["LEAD", "LEADCLOTH"],
            "Gawardin": ["GABARDINE", "GABARDIN"],
            "Print-At": ["PRINT", "PRINT-SHTG"],
            "DOUBLE CLOTH": ["DOUBLE", "DBL"],
        }

        for group_name, quality_keywords in GROUP_QUALITY_MAP.items():
            for kw in quality_keywords:
                result = await session.execute(
                    select(Article).where(
                        Article.quality_category.ilike(f"%{kw}%"),
                        Article.quality_group.is_(None),
                    )
                )
                for art in result.scalars().all():
                    art.quality_group = group_name
                    updated += 1

        await session.commit()

    print(f"  Updated {updated} articles with group names")


async def verify():
    """Print summary after import."""
    async with async_session() as session:
        stock_count = await session.execute(select(func.count(StockEntry.id)))
        stock_meters = await session.execute(
            select(func.coalesce(func.sum(StockEntry.meters), 0))
            .where(StockEntry.status == "available")
        )
        articles = await session.execute(select(func.count(Article.id)))
        grouped = await session.execute(
            select(func.count(Article.id)).where(Article.quality_group.isnot(None))
        )

        print(f"\n=== VERIFICATION ===")
        print(f"  Stock entries: {stock_count.scalar()}")
        print(f"  Total meters: {stock_meters.scalar():,.0f}")
        print(f"  Articles: {articles.scalar()}")
        print(f"  Articles with group: {grouped.scalar()}")

        # Top groups
        top = await session.execute(
            select(Article.quality_group, func.count(Article.id))
            .where(Article.quality_group.isnot(None))
            .group_by(Article.quality_group)
            .order_by(func.count(Article.id).desc())
            .limit(10)
        )
        print("  Top groups:")
        for r in top.all():
            print(f"    {r[0]}: {r[1]} articles")


async def main():
    print("=" * 60)
    print("CaratSense - New Data Import")
    print("=" * 60)

    await import_stock_snapshot()
    await import_item_groups()
    await verify()

    print("\n" + "=" * 60)
    print("Import complete!")


if __name__ == "__main__":
    asyncio.run(main())
