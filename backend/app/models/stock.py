from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from app.models.base import Base


class StockEntry(Base):
    __tablename__ = "stock_entries"

    id = Column(Integer, primary_key=True)
    article_id = Column(Integer, ForeignKey("articles.id"), index=True)
    batch_number = Column(String, index=True)
    meters = Column(Float, nullable=False)
    pieces = Column(Integer)
    rack_number = Column(String, index=True)
    hall = Column(String, index=True)
    status = Column(String, default="available")  # available, reserved, sold
    received_date = Column(Date)
    aging_days = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    article = relationship("Article", lazy="selectin")
