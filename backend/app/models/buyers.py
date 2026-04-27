from sqlalchemy import Boolean, Column, Date, DateTime, Float, Integer, String, Text, func

from app.models.base import Base


class Buyer(Base):
    __tablename__ = "buyers"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False, index=True)
    normalized_name = Column(String, index=True)
    phone = Column(String)
    city = Column(String)
    buyer_type = Column(String)  # specialist, generalist
    preferred_qualities = Column(Text)  # JSON string, e.g. '["SATIN","TUSSUR"]'
    preferred_fabric_type = Column(String)  # dyed, grey, both
    is_active = Column(Boolean, default=True)
    last_purchase_date = Column(Date)
    total_purchases_meters = Column(Float, default=0)
    total_purchases_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
