from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Float, Boolean, func
from app.models.base import Base


class Inquiry(Base):
    """Buyer demand record. When matching stock arrives, system auto-alerts."""
    __tablename__ = "inquiries"

    id = Column(Integer, primary_key=True)
    buyer_name = Column(String, index=True, nullable=False)
    buyer_phone = Column(String)

    # What they want
    article_code = Column(String, index=True)     # specific article if known
    quality_category = Column(String, index=True)  # or category like POPLIN
    color = Column(String)
    min_meters = Column(Float, default=0)
    notes = Column(String)

    status = Column(String, default="open", index=True)  # open, alerted, fulfilled, closed
    alert_count = Column(Integer, default=0)
    last_alerted_at = Column(DateTime(timezone=True))
    fulfilled_by_sale_id = Column(Integer, ForeignKey("sales.id"))

    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
