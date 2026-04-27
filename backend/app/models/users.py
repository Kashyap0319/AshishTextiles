from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text, func

from app.models.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True)
    phone = Column(String, unique=True)
    role = Column(String, nullable=False)  # admin, employee
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)

    # Employee-specific fields
    assigned_warehouse = Column(String)  # hall name, e.g. "Hall 3"
    geo_lat = Column(Float)  # warehouse center latitude
    geo_lng = Column(Float)  # warehouse center longitude
    geo_radius_meters = Column(Float, default=200)  # allowed radius in meters

    # Admin-controlled permissions (JSON string: ["stock","buyers","sales","warehouse","quick-entry","upload"])
    allowed_pages = Column(Text, default='[]')

    created_at = Column(DateTime(timezone=True), server_default=func.now())
