"""ML API endpoints — recommendations, clustering, predictions, basket analysis."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db

router = APIRouter(prefix="/ml", tags=["ML"])


@router.get("/recommendations/buyer/{buyer_id}")
async def buyer_recommendations(
    buyer_id: int,
    top_n: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Get article recommendations for a buyer (collaborative filtering SVD)."""
    from app.ml.buyer_product_match import get_buyer_recommendations
    recs = await get_buyer_recommendations(db, buyer_id, top_n)
    return {"buyer_id": buyer_id, "recommendations": recs}


@router.get("/recommendations/article/{article_id}")
async def article_buyers(
    article_id: int,
    top_n: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Get buyer recommendations for an article (reverse matching)."""
    from app.ml.buyer_product_match import get_article_buyers
    recs = await get_article_buyers(db, article_id, top_n)
    return {"article_id": article_id, "recommended_buyers": recs}


@router.get("/duplicates")
async def detect_duplicates(
    threshold: float = Query(0.7, ge=0.5, le=1.0),
    limit: int = Query(30, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Find duplicate buyers using TF-IDF cosine similarity."""
    from app.ml.duplicate_detection import find_duplicates_tfidf
    groups = await find_duplicates_tfidf(db, threshold, limit)
    return {"duplicate_groups": groups, "total_groups": len(groups)}


@router.get("/clusters")
async def buyer_clusters(
    n_clusters: int = Query(5, ge=2, le=10),
    db: AsyncSession = Depends(get_db),
):
    """Cluster buyers by purchase behavior (K-Means)."""
    from app.ml.buyer_clustering import cluster_buyers
    result = await cluster_buyers(db, n_clusters)
    return result


@router.get("/clearance")
async def clearance_predictions(
    top_n: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Predict clearance speed for current stock."""
    from app.ml.clearance_prediction import predict_clearance
    result = await predict_clearance(db, top_n)
    return result


@router.get("/cross-sell/{article_id}")
async def cross_sell(
    article_id: int,
    top_n: int = Query(10, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
):
    """Get cross-sell recommendations for an article."""
    from app.ml.basket_analysis import get_cross_sell_recommendations
    recs = await get_cross_sell_recommendations(db, article_id, top_n)
    return {"article_id": article_id, "cross_sell": recs}


@router.get("/frequently-bought-together")
async def frequently_bought_together(
    top_n: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Get frequently bought together article pairs."""
    from app.ml.basket_analysis import get_frequently_bought_together
    pairs = await get_frequently_bought_together(db, top_n)
    return {"pairs": pairs}
