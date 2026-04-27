from datetime import date, datetime

from pydantic import BaseModel

from app.schemas.articles import ArticleResponse
from app.schemas.buyers import BuyerResponse


class SaleCreate(BaseModel):
    voucher_number: str | None = None
    voucher_date: date | None = None
    buyer_id: int
    article_id: int
    batch_number: str | None = None
    quantity_pieces: int | None = None
    quantity_meters: float | None = None
    unit_price: float | None = None
    total_amount: float | None = None
    narration: str | None = None
    sale_type: str | None = None


class SaleResponse(BaseModel):
    id: int
    voucher_number: str | None
    voucher_date: date | None
    buyer_id: int | None
    article_id: int | None
    batch_number: str | None
    quantity_pieces: int | None
    quantity_meters: float | None
    unit_price: float | None
    total_amount: float | None
    narration: str | None
    sale_type: str | None
    created_at: datetime
    buyer: BuyerResponse | None = None
    article: ArticleResponse | None = None

    model_config = {"from_attributes": True}
