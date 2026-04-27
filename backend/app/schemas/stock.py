from datetime import date, datetime

from pydantic import BaseModel

from app.schemas.articles import ArticleResponse


class StockCreate(BaseModel):
    article_id: int
    batch_number: str | None = None
    meters: float
    pieces: int | None = None
    rack_number: str | None = None
    hall: str | None = None
    status: str = "available"
    received_date: date | None = None


class StockUpdate(BaseModel):
    meters: float | None = None
    pieces: int | None = None
    rack_number: str | None = None
    hall: str | None = None
    status: str | None = None


class StockResponse(BaseModel):
    id: int
    article_id: int
    batch_number: str | None
    meters: float
    pieces: int | None
    rack_number: str | None
    hall: str | None
    status: str
    received_date: date | None
    aging_days: int | None
    created_at: datetime
    updated_at: datetime
    article: ArticleResponse | None = None

    model_config = {"from_attributes": True}


class AgingBucket(BaseModel):
    label: str
    count: int
    total_meters: float
