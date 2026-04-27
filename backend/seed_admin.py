"""Create default admin user. Run: python seed_admin.py"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import select
from app.database import engine, async_session
from app.models.base import Base
from app.models.users import User
from app.services.auth_service import hash_password


async def main():
    # Ensure tables exist (will add new columns)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        # Check if admin already exists
        result = await session.execute(select(User).where(User.role == "admin"))
        if result.scalar_one_or_none():
            print("[OK] Admin user already exists")
            return

        admin = User(
            name="Ashish (Admin)",
            email="admin@caratsense.com",
            phone="9999999999",
            role="admin",
            hashed_password=hash_password("admin123"),
            is_active=True,
            allowed_pages='["dashboard","stock","buyers","sales","warehouse","quick-entry","upload","settings","admin"]',
        )
        session.add(admin)
        await session.commit()
        print(f"[OK] Admin created: admin@caratsense.com / admin123")


if __name__ == "__main__":
    asyncio.run(main())
