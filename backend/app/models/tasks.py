from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func

from app.models.base import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True)
    description = Column(String, nullable=False)
    assigned_to = Column(Integer, ForeignKey("users.id"), index=True)
    assigned_by = Column(Integer, ForeignKey("users.id"))
    assigned_to_name = Column(String)
    assigned_by_name = Column(String)
    status = Column(String, default="pending")  # pending, completed, rejected
    priority = Column(String, default="normal")  # low, normal, high, urgent
    notes = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
