from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Boolean, func

from app.models.base import Base


class SampleDispatch(Base):
    __tablename__ = "sample_dispatches"

    id = Column(Integer, primary_key=True)
    article_id = Column(Integer, ForeignKey("articles.id"), index=True)
    article_code = Column(String)
    quality_category = Column(String)
    buyer_id = Column(Integer, ForeignKey("buyers.id"), index=True)
    buyer_name = Column(String)
    sent_date = Column(DateTime(timezone=True), server_default=func.now())
    courier_details = Column(String)
    response = Column(String)  # interested, passed, purchased, no_response
    response_date = Column(DateTime(timezone=True))
    purchase_meters = Column(Float)  # if purchased, how much
    notes = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
