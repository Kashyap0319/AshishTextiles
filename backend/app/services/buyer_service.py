from rapidfuzz import fuzz, process
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.buyers import Buyer


async def find_duplicate_buyers(db: AsyncSession, threshold: int = 80):
    """Find potential duplicate buyers using fuzzy matching on normalized names."""
    result = await db.execute(
        select(Buyer).where(Buyer.is_active == True).order_by(Buyer.name)
    )
    buyers = result.scalars().all()

    names = [(b.id, b.normalized_name or b.name.upper()) for b in buyers]
    duplicates = []
    seen = set()

    for i, (id_a, name_a) in enumerate(names):
        if id_a in seen:
            continue
        group = [{"id": id_a, "name": next(b.name for b in buyers if b.id == id_a)}]
        for j in range(i + 1, len(names)):
            id_b, name_b = names[j]
            if id_b in seen:
                continue
            score = fuzz.token_sort_ratio(name_a, name_b)
            if score >= threshold:
                group.append({
                    "id": id_b,
                    "name": next(b.name for b in buyers if b.id == id_b),
                    "score": score,
                })
                seen.add(id_b)
        if len(group) > 1:
            duplicates.append(group)
            seen.add(id_a)

    return duplicates


async def merge_buyers(db: AsyncSession, keep_id: int, merge_ids: list[int]):
    """Merge duplicate buyers — reassign all sales to keep_id, deactivate merged."""
    from app.models.sales import Sale

    for mid in merge_ids:
        if mid == keep_id:
            continue
        # Reassign sales
        result = await db.execute(select(Sale).where(Sale.buyer_id == mid))
        for sale in result.scalars().all():
            sale.buyer_id = keep_id

        # Deactivate merged buyer
        buyer_result = await db.execute(select(Buyer).where(Buyer.id == mid))
        buyer = buyer_result.scalar_one_or_none()
        if buyer:
            buyer.is_active = False

    # Recompute kept buyer stats
    from sqlalchemy import func
    stats = await db.execute(
        select(
            func.count(Sale.id),
            func.coalesce(func.sum(Sale.quantity_meters), 0),
            func.max(Sale.voucher_date),
        ).where(Sale.buyer_id == keep_id)
    )
    row = stats.one()
    kept = await db.execute(select(Buyer).where(Buyer.id == keep_id))
    kept_buyer = kept.scalar_one()
    kept_buyer.total_purchases_count = row[0]
    kept_buyer.total_purchases_meters = float(row[1])
    kept_buyer.last_purchase_date = row[2]

    await db.flush()
    return {"kept": keep_id, "merged": merge_ids, "new_purchase_count": row[0]}
