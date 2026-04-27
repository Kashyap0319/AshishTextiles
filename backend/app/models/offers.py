from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, func

from app.models.base import Base


class Offer(Base):
    __tablename__ = "offers"

    id = Column(Integer, primary_key=True)
    article_code = Column(String, nullable=False, index=True)
    buyer_name = Column(String, nullable=False)
    buyer_phone = Column(String)
    buyer_email = Column(String)
    offer_price_per_meter = Column(Float, nullable=False)
    meters_wanted = Column(Float)
    message = Column(String)
    status = Column(String, default="pending")  # pending, accepted, rejected, countered
    admin_notes = Column(String)
    counter_price = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
