"""
Basket Analysis — find articles frequently bought together.
Uses co-occurrence matrix (faster than Apriori for our data shape).
"""
import numpy as np
from collections import defaultdict
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sales import Sale
from app.models.articles import Article
from app.models.buyers import Buyer


async def get_cross_sell_recommendations(db: AsyncSession, article_id: int, top_n: int = 10):
    """Get articles frequently bought by the same buyers who bought this article."""
    # Find all buyers who bought this article
    buyer_result = await db.execute(
        select(Sale.buyer_id)
        .where(Sale.article_id == article_id, Sale.buyer_id.isnot(None))
        .distinct()
    )
    buyer_ids = [r[0] for r in buyer_result.all()]

    if not buyer_ids:
        return []

    # Find what else these buyers bought
    co_result = await db.execute(
        select(
            Sale.article_id,
            func.count(func.distinct(Sale.buyer_id)).label("buyer_overlap"),
            func.sum(Sale.quantity_meters).label("total_meters"),
        )
        .where(
            Sale.buyer_id.in_(buyer_ids),
            Sale.article_id.isnot(None),
            Sale.article_id != article_id,
        )
        .group_by(Sale.article_id)
        .order_by(func.count(func.distinct(Sale.buyer_id)).desc())
        .limit(top_n)
    )
    co_articles = co_result.all()

    if not co_articles:
        return []

    # Fetch article details
    art_ids = [r[0] for r in co_articles]
    art_result = await db.execute(select(Article).where(Article.id.in_(art_ids)))
    articles = {a.id: a for a in art_result.scalars().all()}

    total_buyers = len(buyer_ids)
    recommendations = []
    for art_id, overlap, meters in co_articles:
        art = articles.get(art_id)
        if art:
            recommendations.append({
                "article_id": art_id,
                "article_code": art.article_code,
                "quality_category": art.quality_category,
                "quality_group": art.quality_group,
                "buyer_overlap": overlap,
                "overlap_pct": round(overlap / total_buyers * 100, 1),
                "total_meters": float(meters or 0),
            })

    return recommendations


async def get_frequently_bought_together(db: AsyncSession, top_n: int = 20):
    """Global analysis: find the most common article pairs bought by same buyers."""
    # Get buyer→articles mapping
    result = await db.execute(
        select(Sale.buyer_id, Sale.article_id)
        .where(Sale.buyer_id.isnot(None), Sale.article_id.isnot(None))
        .distinct()
    )
    rows = result.all()

    # Build buyer→articles map
    buyer_articles = defaultdict(set)
    for buyer_id, article_id in rows:
        buyer_articles[buyer_id].add(article_id)

    # Count pair co-occurrences
    pair_counts = defaultdict(int)
    for articles in buyer_articles.values():
        articles = sorted(articles)
        for i in range(len(articles)):
            for j in range(i + 1, min(i + 20, len(articles))):  # Cap pairs per buyer
                pair_counts[(articles[i], articles[j])] += 1

    # Get top pairs
    top_pairs = sorted(pair_counts.items(), key=lambda x: x[1], reverse=True)[:top_n]

    # Fetch article details
    all_art_ids = set()
    for (a, b), _ in top_pairs:
        all_art_ids.add(a)
        all_art_ids.add(b)

    art_result = await db.execute(select(Article).where(Article.id.in_(list(all_art_ids))))
    articles = {a.id: a for a in art_result.scalars().all()}

    pairs = []
    for (a_id, b_id), count in top_pairs:
        art_a = articles.get(a_id)
        art_b = articles.get(b_id)
        if art_a and art_b:
            pairs.append({
                "article_a": {"id": a_id, "code": art_a.article_code, "quality": art_a.quality_category},
                "article_b": {"id": b_id, "code": art_b.article_code, "quality": art_b.quality_category},
                "co_occurrence": count,
            })

    return pairs
