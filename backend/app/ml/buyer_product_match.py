"""
Buyer-Product Matching using Collaborative Filtering (SVD).
Builds a buyer×article interaction matrix from sales data,
decomposes it, and predicts which articles a buyer is most likely to buy.
"""
import numpy as np
from sklearn.decomposition import TruncatedSVD
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sales import Sale
from app.models.buyers import Buyer
from app.models.articles import Article


async def build_interaction_matrix(db: AsyncSession):
    """Build buyer×article matrix from sales data."""
    # Get buyer-article purchase volumes
    result = await db.execute(
        select(
            Sale.buyer_id,
            Sale.article_id,
            func.sum(Sale.quantity_meters).label("total_meters"),
        )
        .where(Sale.buyer_id.isnot(None), Sale.article_id.isnot(None))
        .group_by(Sale.buyer_id, Sale.article_id)
    )
    interactions = result.all()

    if not interactions:
        return None, None, None

    # Build mappings
    buyer_ids = sorted(set(r[0] for r in interactions))
    article_ids = sorted(set(r[1] for r in interactions))
    buyer_idx = {bid: i for i, bid in enumerate(buyer_ids)}
    article_idx = {aid: i for i, aid in enumerate(article_ids)}

    # Build matrix
    matrix = np.zeros((len(buyer_ids), len(article_ids)))
    for buyer_id, article_id, meters in interactions:
        matrix[buyer_idx[buyer_id], article_idx[article_id]] = float(meters or 0)

    # Log-transform to reduce skew
    matrix = np.log1p(matrix)

    return matrix, buyer_ids, article_ids


async def get_buyer_recommendations(db: AsyncSession, buyer_id: int, top_n: int = 10):
    """Get top-N article recommendations for a buyer using SVD."""
    matrix, buyer_ids, article_ids = await build_interaction_matrix(db)
    if matrix is None:
        return []

    if buyer_id not in buyer_ids:
        return []

    buyer_idx = buyer_ids.index(buyer_id)

    # SVD decomposition
    n_components = min(50, min(matrix.shape) - 1)
    if n_components < 2:
        return []

    svd = TruncatedSVD(n_components=n_components, random_state=42)
    buyer_factors = svd.fit_transform(matrix)
    article_factors = svd.components_.T

    # Predict scores for this buyer
    scores = buyer_factors[buyer_idx] @ article_factors.T

    # Get articles buyer hasn't purchased yet
    purchased = set(np.nonzero(matrix[buyer_idx])[0])
    candidates = [(i, scores[i]) for i in range(len(article_ids)) if i not in purchased]
    candidates.sort(key=lambda x: x[1], reverse=True)

    # Fetch article details
    top_article_ids = [article_ids[c[0]] for c in candidates[:top_n]]
    top_scores = [float(c[1]) for c in candidates[:top_n]]

    if not top_article_ids:
        return []

    result = await db.execute(
        select(Article).where(Article.id.in_(top_article_ids))
    )
    articles = {a.id: a for a in result.scalars().all()}

    recommendations = []
    for aid, score in zip(top_article_ids, top_scores):
        art = articles.get(aid)
        if art:
            recommendations.append({
                "article_id": aid,
                "article_code": art.article_code,
                "quality_category": art.quality_category,
                "quality_group": art.quality_group,
                "match_score": round(score, 3),
            })

    return recommendations


async def get_article_buyers(db: AsyncSession, article_id: int, top_n: int = 10):
    """Get top-N buyer recommendations for an article (reverse matching)."""
    matrix, buyer_ids, article_ids = await build_interaction_matrix(db)
    if matrix is None:
        return []

    if article_id not in article_ids:
        return []

    article_idx = article_ids.index(article_id)

    n_components = min(50, min(matrix.shape) - 1)
    if n_components < 2:
        return []

    svd = TruncatedSVD(n_components=n_components, random_state=42)
    buyer_factors = svd.fit_transform(matrix)
    article_factors = svd.components_.T

    # Score all buyers for this article
    scores = buyer_factors @ article_factors[article_idx]

    # Get buyers who haven't purchased this article
    purchased_buyers = set(np.nonzero(matrix[:, article_idx])[0])
    candidates = [(i, scores[i]) for i in range(len(buyer_ids)) if i not in purchased_buyers]
    candidates.sort(key=lambda x: x[1], reverse=True)

    top_buyer_ids = [buyer_ids[c[0]] for c in candidates[:top_n]]
    top_scores = [float(c[1]) for c in candidates[:top_n]]

    result = await db.execute(
        select(Buyer).where(Buyer.id.in_(top_buyer_ids))
    )
    buyers = {b.id: b for b in result.scalars().all()}

    recommendations = []
    for bid, score in zip(top_buyer_ids, top_scores):
        buyer = buyers.get(bid)
        if buyer:
            recommendations.append({
                "buyer_id": bid,
                "buyer_name": buyer.name,
                "total_purchases_meters": buyer.total_purchases_meters,
                "match_score": round(score, 3),
            })

    return recommendations
