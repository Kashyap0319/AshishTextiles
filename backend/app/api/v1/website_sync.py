"""Website Sync API — secure read-only endpoint for public website stock display."""
from fastapi import APIRouter, Depends, Query, Header, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.articles import Article
from app.models.stock import StockEntry

router = APIRouter(prefix="/website-sync", tags=["website-sync"])

# Simple API key auth for website integration
SYNC_API_KEY = "cs-sync-" + settings.SECRET_KEY[:16]


def verify_sync_key(x_api_key: str = Header(None)):
    if not x_api_key or x_api_key != SYNC_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return True


@router.get("/live-stock")
async def get_live_stock(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    quality_group: str | None = None,
    min_meters: float | None = None,
    _auth: bool = Depends(verify_sync_key),
    db: AsyncSession = Depends(get_db),
):
    """Public-facing endpoint: returns available stock for website display."""
    query = (
        select(
            Article.article_code,
            Article.quality_category,
            Article.quality_group,
            Article.description,
            func.sum(StockEntry.meters).label("total_meters"),
            func.count(StockEntry.id).label("lot_count"),
            func.min(StockEntry.aging_days).label("min_aging"),
            func.max(StockEntry.aging_days).label("max_aging"),
        )
        .join(Article, StockEntry.article_id == Article.id)
        .where(StockEntry.status == "available")
        .group_by(Article.article_code, Article.quality_category, Article.quality_group, Article.description)
    )

    if quality_group:
        query = query.where(Article.quality_group == quality_group)
    if min_meters:
        query = query.having(func.sum(StockEntry.meters) >= min_meters)

    query = query.order_by(func.sum(StockEntry.meters).desc())
    query = query.offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(query)
    items = []
    for r in result.all():
        discount = 0
        if r.max_aging and r.max_aging > 90:
            discount = 10  # Auto 10% discount for 90+ day stock
        elif r.max_aging and r.max_aging > 60:
            discount = 5

        items.append({
            "article_code": r.article_code,
            "quality": r.quality_category,
            "quality_group": r.quality_group,
            "description": r.description,
            "total_meters": float(r.total_meters),
            "lot_count": r.lot_count,
            "aging_range": f"{r.min_aging}-{r.max_aging} days",
            "discount_pct": discount,
            "status": "available",
        })

    # Total count
    count_query = (
        select(func.count(func.distinct(Article.article_code)))
        .join(StockEntry, StockEntry.article_id == Article.id)
        .where(StockEntry.status == "available")
    )
    total = await db.execute(count_query)

    return {
        "items": items,
        "total": total.scalar(),
        "page": page,
        "per_page": per_page,
        "sync_key_info": "Pass X-API-Key header for authentication",
    }


@router.get("/summary")
async def stock_summary(
    _auth: bool = Depends(verify_sync_key),
    db: AsyncSession = Depends(get_db),
):
    """Quick summary for website header/banner."""
    result = await db.execute(
        select(
            func.count(func.distinct(Article.article_code)).label("unique_articles"),
            func.sum(StockEntry.meters).label("total_meters"),
            func.count(StockEntry.id).label("total_lots"),
        )
        .join(Article, StockEntry.article_id == Article.id)
        .where(StockEntry.status == "available")
    )
    r = result.one()

    # Quality groups available
    groups = await db.execute(
        select(Article.quality_group, func.sum(StockEntry.meters))
        .join(StockEntry, StockEntry.article_id == Article.id)
        .where(StockEntry.status == "available")
        .group_by(Article.quality_group)
        .order_by(func.sum(StockEntry.meters).desc())
    )

    return {
        "unique_articles": r.unique_articles,
        "total_meters": float(r.total_meters or 0),
        "total_lots": r.total_lots,
        "quality_groups": [
            {"group": g[0] or "Other", "meters": float(g[1])}
            for g in groups.all()
        ],
    }


# ═══════════════ WooCommerce Push Sync (to sample.tdmfabric.com) ═══════════════
from app.api.v1.auth import get_current_user
from app.services.woocommerce_sync import woo_client


@router.get("/woo-status")
async def woo_sync_status(_user=Depends(get_current_user)):
    """Check if WooCommerce sync is configured."""
    return {
        "configured": woo_client.configured,
        "url": woo_client.base_url or None,
        "message": "Set WOO_URL, WOO_KEY, WOO_SECRET in backend .env" if not woo_client.configured else "Ready to sync",
    }


@router.post("/push-to-woocommerce")
async def push_to_woocommerce(
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """Push current live stock to sample.tdmfabric.com as WooCommerce products."""
    if not woo_client.configured:
        raise HTTPException(400, "WooCommerce not configured. Set WOO_URL, WOO_KEY, WOO_SECRET.")

    # Build unique article list with aggregated stock
    result = await db.execute(
        select(
            Article.article_code,
            Article.quality_category,
            Article.quality_group,
            Article.description,
            func.coalesce(func.sum(StockEntry.meters), 0).label("total_meters"),
        )
        .join(StockEntry, StockEntry.article_id == Article.id, isouter=True)
        .where(StockEntry.status == "available")
        .group_by(Article.id)
        .having(func.sum(StockEntry.meters) > 0)
        .order_by(func.sum(StockEntry.meters).desc())
        .limit(limit)
    )

    items = []
    for row in result.all():
        items.append({
            "article_code": row.article_code,
            "name": f"{row.article_code} — {row.quality_category or 'Surplus fabric'}",
            "description": (
                f"Quality: {row.quality_category or 'N/A'}. "
                f"Group: {row.quality_group or 'N/A'}. "
                f"{row.description or ''}. "
                f"Available: {int(row.total_meters)} meters."
            ),
            "meters": int(row.total_meters),
            "price": 0,
            "categories": [{"name": row.quality_group}] if row.quality_group else [],
        })

    summary = await woo_client.bulk_sync(items)
    return {
        "total_items_prepared": len(items),
        **summary,
    }
