from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from app.models.base import Base


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True)
    voucher_number = Column(String, index=True)
    voucher_date = Column(Date, index=True)
    buyer_id = Column(Integer, ForeignKey("buyers.id"), index=True)
    article_id = Column(Integer, ForeignKey("articles.id"), index=True)
    batch_number = Column(String)
    quantity_pieces = Column(Integer)
    quantity_meters = Column(Float)
    unit_price = Column(Float)
    total_amount = Column(Float)
    narration = Column(String)
    sale_type = Column(String)  # dyed or grey
    buyer_offer_price = Column(Float)  # buyer's initial offer per meter
    final_price = Column(Float)  # agreed final price per meter
    negotiation_notes = Column(String)

    # Price approval workflow (Ashish requirement: sales can't dispatch without admin approval)
    approval_status = Column(String, default="approved", index=True)  # pending, approved, rejected
    approved_by = Column(Integer, ForeignKey("users.id"))
    approved_at = Column(DateTime(timezone=True))
    counter_price = Column(Float)  # admin's counter-price if different from sales proposal
    approval_notes = Column(String)
    created_by = Column(Integer, ForeignKey("users.id"))  # sales person who created

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    buyer = relationship("Buyer", lazy="selectin")
    article = relationship("Article", lazy="selectin")
