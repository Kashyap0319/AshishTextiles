from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.articles import Article
from app.schemas.articles import ArticleCreate, ArticleResponse, ArticleUpdate

router = APIRouter(prefix="/articles", tags=["articles"])


@router.get("/", response_model=list[ArticleResponse])
async def list_articles(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    quality_group: str | None = None,
    fabric_type: str | None = None,
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Article)
    if quality_group:
        query = query.where(Article.quality_group == quality_group)
    if fabric_type:
        query = query.where(Article.fabric_type == fabric_type)
    if search:
        from app.services.auth_service import sanitize_search
        query = query.where(Article.article_code.ilike(f"%{sanitize_search(search)}%", escape="\\"))
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/count")
async def count_articles(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(func.count(Article.id)))
    return {"count": result.scalar()}


@router.get("/{article_id}", response_model=ArticleResponse)
async def get_article(article_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


@router.post("/", response_model=ArticleResponse, status_code=201)
async def create_article(data: ArticleCreate, db: AsyncSession = Depends(get_db)):
    article = Article(**data.model_dump())
    db.add(article)
    await db.flush()
    await db.refresh(article)
    return article


@router.put("/{article_id}", response_model=ArticleResponse)
async def update_article(article_id: int, data: ArticleUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(article, key, value)
    await db.flush()
    await db.refresh(article)
    return article


@router.delete("/{article_id}", status_code=204)
async def delete_article(article_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    await db.delete(article)


# ═══════════════ Product Code Parser ═══════════════

@router.get("/parse-code")
async def parse_code(code: str = Query(..., description="Product code e.g. 10828-MOK-ST-NF-RFD0000000-LY-DRILL")):
    """Parse TDM product code into its semantic parts: article / composition / finish / color / quality."""
    from app.utils.code_parser import parse_product_code
    return parse_product_code(code)
