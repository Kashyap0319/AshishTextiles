from sqlalchemy import Column, DateTime, Integer, String, func

from app.models.base import Base


class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True)
    article_code = Column(String, unique=True, nullable=False, index=True)
    description = Column(String)
    quality_category = Column(String, index=True)
    quality_group = Column(String, index=True)
    fabric_type = Column(String, index=True)  # dyed or grey
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
