"""
AI Chat Service — Claude API with live database context.
Translates natural language queries into data lookups, then summarizes results.
"""
import json
from datetime import date, timedelta

from sqlalchemy import select, func, case, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.articles import Article
from app.models.buyers import Buyer
from app.models.sales import Sale
from app.models.stock import StockEntry
from app.models.purchases import Purchase
from app.models.warehouse import Rack


async def gather_context(db: AsyncSession) -> str:
    """Gather current database summary for Claude context."""
    # Stock summary
    stock = await db.execute(
        select(
            func.count(StockEntry.id),
            func.coalesce(func.sum(StockEntry.meters), 0),
        ).where(StockEntry.status == "available")
    )
    s = stock.one()

    # Aging
    aging = await db.execute(
        select(
            case(
                (StockEntry.aging_days <= 30, "0-30d"),
                (StockEntry.aging_days <= 60, "31-60d"),
                (StockEntry.aging_days <= 90, "61-90d"),
                else_="90+d",
            ).label("bucket"),
            func.count(StockEntry.id),
            func.coalesce(func.sum(StockEntry.meters), 0),
        ).where(StockEntry.status == "available").group_by("bucket")
    )
    aging_rows = aging.all()

    # Buyers
    buyer_count = await db.execute(select(func.count(Buyer.id)).where(Buyer.is_active == True))

    # Top buyers
    top_buyers = await db.execute(
        select(Buyer.name, Buyer.total_purchases_meters, Buyer.total_purchases_count, Buyer.last_purchase_date)
        .where(Buyer.is_active == True, Buyer.total_purchases_meters > 0)
        .order_by(Buyer.total_purchases_meters.desc())
        .limit(10)
    )

    # Sales summary
    sales_total = await db.execute(
        select(func.count(Sale.id), func.coalesce(func.sum(Sale.quantity_meters), 0))
    )
    st = sales_total.one()

    # Recent sales (last 7 days)
    week_ago = date.today() - timedelta(days=7)
    recent = await db.execute(
        select(func.count(Sale.id), func.coalesce(func.sum(Sale.quantity_meters), 0))
        .where(Sale.voucher_date >= week_ago)
    )
    r = recent.one()

    # Top quality groups in stock
    quality = await db.execute(
        select(Article.quality_group, func.count(StockEntry.id), func.coalesce(func.sum(StockEntry.meters), 0))
        .join(Article, StockEntry.article_id == Article.id)
        .where(StockEntry.status == "available")
        .group_by(Article.quality_group)
        .order_by(func.sum(StockEntry.meters).desc())
        .limit(8)
    )

    # Warehouse
    halls = await db.execute(select(func.count(func.distinct(Rack.hall))))
    racks = await db.execute(select(func.count(Rack.id)))

    context = f"""CURRENT DATABASE STATE (as of {date.today()}):

STOCK INVENTORY:
- Total available: {s[0]} entries, {float(s[1]):,.0f} meters
- Aging breakdown: {', '.join(f'{r[0]}: {r[1]} entries ({float(r[2]):,.0f}m)' for r in aging_rows)}

BUYERS:
- Total active buyers: {buyer_count.scalar()}
- Top 10 by volume:
"""
    for b in top_buyers.all():
        context += f"  - {b[0]}: {float(b[1]):,.0f}m, {b[2]} orders, last purchase: {b[3]}\n"

    context += f"""
SALES:
- Total sales: {st[0]} transactions, {float(st[1]):,.0f} meters
- Last 7 days: {r[0]} transactions, {float(r[1]):,.0f} meters

STOCK BY QUALITY:
"""
    for q in quality.all():
        context += f"  - {q[0] or 'Unknown'}: {q[1]} entries, {float(q[2]):,.0f}m\n"

    context += f"""
WAREHOUSE:
- {halls.scalar()} halls, {racks.scalar()} racks
"""
    return context


async def run_query(db: AsyncSession, query_type: str, params: dict) -> str:
    """Run a specific data query and return formatted results."""
    if query_type == "buyer_search":
        name = params.get("name", "")
        result = await db.execute(
            select(Buyer).where(Buyer.name.ilike(f"%{name}%"), Buyer.is_active == True)
            .order_by(Buyer.total_purchases_meters.desc()).limit(10)
        )
        buyers = result.scalars().all()
        if not buyers:
            return f"No buyers found matching '{name}'"
        lines = [f"Buyers matching '{name}':"]
        for b in buyers:
            lines.append(f"  - {b.name}: {b.total_purchases_meters:,.0f}m, {b.total_purchases_count} orders, last: {b.last_purchase_date}")
        return "\n".join(lines)

    elif query_type == "article_search":
        code = params.get("code", "")
        result = await db.execute(
            select(Article).where(Article.article_code.ilike(f"%{code}%")).limit(10)
        )
        articles = result.scalars().all()
        if not articles:
            return f"No articles found matching '{code}'"
        lines = [f"Articles matching '{code}':"]
        for a in articles:
            lines.append(f"  - {a.article_code}: {a.quality_category or '?'} ({a.quality_group or '?'})")
        return "\n".join(lines)

    elif query_type == "stock_by_quality":
        quality = params.get("quality", "")
        result = await db.execute(
            select(StockEntry)
            .join(Article, StockEntry.article_id == Article.id)
            .where(
                StockEntry.status == "available",
                Article.quality_category.ilike(f"%{quality}%")
            )
            .order_by(StockEntry.meters.desc())
            .limit(15)
        )
        entries = result.scalars().all()
        if not entries:
            return f"No stock found for quality '{quality}'"
        total = sum(e.meters for e in entries)
        lines = [f"Stock for quality '{quality}' ({len(entries)} entries, {total:,.0f}m total):"]
        for e in entries:
            art = e.article
            lines.append(f"  - {art.article_code if art else '?'}: {e.meters:,.0f}m, Rack {e.rack_number or '?'}, {e.aging_days}d old")
        return "\n".join(lines)

    elif query_type == "buyer_history":
        buyer_name = params.get("name", "")
        result = await db.execute(
            select(Buyer).where(Buyer.name.ilike(f"%{buyer_name}%")).limit(1)
        )
        buyer = result.scalar_one_or_none()
        if not buyer:
            return f"Buyer '{buyer_name}' not found"

        sales_result = await db.execute(
            select(Sale).where(Sale.buyer_id == buyer.id)
            .order_by(Sale.voucher_date.desc()).limit(10)
        )
        sales = sales_result.scalars().all()
        lines = [f"Buyer: {buyer.name}", f"Total: {buyer.total_purchases_meters:,.0f}m, {buyer.total_purchases_count} orders",
                 f"Last purchase: {buyer.last_purchase_date}", f"Recent sales:"]
        for s in sales:
            art = s.article
            lines.append(f"  - {s.voucher_date}: {art.article_code if art else '?'}, {s.quantity_meters or 0:,.0f}m")
        return "\n".join(lines)

    elif query_type == "aging_critical":
        result = await db.execute(
            select(StockEntry)
            .where(StockEntry.status == "available", StockEntry.aging_days > 90)
            .order_by(StockEntry.aging_days.desc()).limit(15)
        )
        entries = result.scalars().all()
        total = sum(e.meters for e in entries)
        lines = [f"Critical aging stock (90+ days): {len(entries)} entries, {total:,.0f}m"]
        for e in entries:
            art = e.article
            lines.append(f"  - {art.article_code if art else '?'}: {e.meters:,.0f}m, {e.aging_days}d, Rack {e.rack_number or '?'} ({e.hall or '?'})")
        return "\n".join(lines)

    elif query_type == "hall_stock":
        hall = params.get("hall", "")
        result = await db.execute(
            select(StockEntry)
            .where(StockEntry.status == "available", StockEntry.hall.ilike(f"%{hall}%"))
            .order_by(StockEntry.meters.desc()).limit(20)
        )
        entries = result.scalars().all()
        if not entries:
            return f"No stock found in '{hall}'"
        total = sum(e.meters for e in entries)
        lines = [f"Stock in {hall}: {len(entries)} entries, {total:,.0f}m"]
        for e in entries:
            art = e.article
            lines.append(f"  - Rack {e.rack_number}: {art.article_code if art else '?'}, {e.meters:,.0f}m, {e.aging_days}d")
        return "\n".join(lines)

    return "Unknown query type"


SYSTEM_PROMPT = """You are CaratSense AI Assistant — an expert in textile surplus stock management.
You help Ashishji and his team manage their surplus fabric inventory, buyers, and sales.

You have access to the live database. Use the provided context to answer questions accurately.
When asked about specific buyers, articles, stock, or sales — use the QUERY RESULTS provided.

Key business context:
- Business deals in surplus dyed and grey fabrics
- Stock aging is critical — fabric older than 60 days needs attention, 90+ days is critical
- 435+ active buyers, mix of specialists (specific fabric types) and generalists
- Warehouse has 11 halls with numbered racks
- Currency is Indian Rupees (₹), measurements in meters

Respond concisely. Use numbers and data from context. If you don't have data, say so.
You can respond in Hindi or English based on the user's language.
"""
