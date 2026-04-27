from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Boolean, func

from app.models.base import Base


class FollowUp(Base):
    __tablename__ = "followups"

    id = Column(Integer, primary_key=True)
    buyer_id = Column(Integer, ForeignKey("buyers.id"), index=True)
    buyer_name = Column(String)
    article_code = Column(String)
    message_type = Column(String)  # match, offer, reminder
    message_sent_at = Column(DateTime(timezone=True))
    response_received = Column(Boolean, default=False)
    response_at = Column(DateTime(timezone=True))
    reminder_count = Column(Integer, default=0)
    next_reminder_at = Column(DateTime(timezone=True))
    status = Column(String, default="pending")  # pending, responded, expired, completed
    whatsapp_text = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
