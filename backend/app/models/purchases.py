from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from app.models.base import Base


class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(Integer, primary_key=True)
    voucher_number = Column(String, index=True)
    voucher_date = Column(Date, index=True)
    supplier = Column(String)
    article_id = Column(Integer, ForeignKey("articles.id"), index=True)
    batch_number = Column(String)
    quantity_pieces = Column(Integer)
    quantity_meters = Column(Float)
    unit_price = Column(Float)
    total_amount = Column(Float)
    purchase_type = Column(String)  # dyed or grey
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    article = relationship("Article", lazy="selectin")
