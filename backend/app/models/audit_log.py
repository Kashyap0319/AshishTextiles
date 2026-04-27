from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func

from app.models.base import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)  # CREATE, UPDATE, DELETE
    entity_type = Column(String, nullable=False)  # article, stock, buyer, sale
    entity_id = Column(Integer)
    changes = Column(Text)  # JSON string
    ip_address = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
