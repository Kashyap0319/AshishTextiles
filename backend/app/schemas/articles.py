from datetime import datetime

from pydantic import BaseModel


class ArticleCreate(BaseModel):
    article_code: str
    description: str | None = None
    quality_category: str | None = None
    quality_group: str | None = None
    fabric_type: str | None = None


class ArticleUpdate(BaseModel):
    description: str | None = None
    quality_category: str | None = None
    quality_group: str | None = None
    fabric_type: str | None = None


class ArticleResponse(BaseModel):
    id: int
    article_code: str
    description: str | None
    quality_category: str | None
    quality_group: str | None
    fabric_type: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
