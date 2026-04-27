from sqlalchemy import Column, Float, Integer, String, UniqueConstraint

from app.models.base import Base


class Rack(Base):
    __tablename__ = "racks"
    __table_args__ = (UniqueConstraint("rack_number", "hall", name="uq_rack_hall"),)

    id = Column(Integer, primary_key=True)
    rack_number = Column(String, nullable=False, index=True)
    hall = Column(String, nullable=False, index=True)
    assigned_article = Column(String)
    capacity_meters = Column(Float)
    current_meters = Column(Float, default=0)
