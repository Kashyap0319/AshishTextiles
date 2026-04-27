from datetime import date, datetime

from pydantic import BaseModel


class BuyerCreate(BaseModel):
    name: str
    phone: str | None = None
    city: str | None = None
    buyer_type: str | None = None
    preferred_qualities: list[str] | None = None
    preferred_fabric_type: str | None = None


class BuyerUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    city: str | None = None
    buyer_type: str | None = None
    preferred_qualities: list[str] | None = None
    preferred_fabric_type: str | None = None
    is_active: bool | None = None


class BuyerResponse(BaseModel):
    id: int
    name: str
    normalized_name: str | None
    phone: str | None
    city: str | None
    buyer_type: str | None
    preferred_qualities: list[str] | None
    preferred_fabric_type: str | None
    is_active: bool
    last_purchase_date: date | None
    total_purchases_meters: float
    total_purchases_count: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
