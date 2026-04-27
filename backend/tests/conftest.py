"""Shared test fixtures."""
import asyncio
import os
import sys

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

# Ensure app is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Use a separate test database and disable rate limiting
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_caratsense.db"
os.environ["RATELIMIT_ENABLED"] = "false"

from app.main import app
from app.database import engine, async_session
from app.models.base import Base
from app.models.users import User
from app.services.auth_service import hash_password


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_db():
    """Create tables and seed test users."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        # Admin user
        admin = User(
            name="Test Admin",
            email="admin@test.com",
            phone="9000000001",
            role="admin",
            hashed_password=hash_password("admin123"),
            is_active=True,
            allowed_pages='["dashboard","stock","buyers","sales","warehouse","quick-entry","upload","settings","admin"]',
        )
        session.add(admin)

        # Employee WITH geo-fence (warehouse in Surat: 21.1702, 72.8311)
        employee_geo = User(
            name="Warehouse Worker",
            email="worker@test.com",
            phone="9000000002",
            role="employee",
            hashed_password=hash_password("worker123"),
            is_active=True,
            assigned_warehouse="Hall 3",
            geo_lat=21.1702,
            geo_lng=72.8311,
            geo_radius_meters=200,
            allowed_pages='["stock","warehouse","quick-entry"]',
        )
        session.add(employee_geo)

        # Employee WITHOUT geo-fence
        employee_nogeo = User(
            name="Sales Rep",
            email="sales@test.com",
            phone="9000000003",
            role="employee",
            hashed_password=hash_password("sales123"),
            is_active=True,
            allowed_pages='["buyers","sales"]',
        )
        session.add(employee_nogeo)

        # Inactive employee
        inactive = User(
            name="Fired Employee",
            email="fired@test.com",
            phone="9000000004",
            role="employee",
            hashed_password=hash_password("fired123"),
            is_active=False,
        )
        session.add(inactive)

        await session.commit()

    yield

    # Cleanup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    # Remove test db file
    try:
        os.remove("test_caratsense.db")
    except OSError:
        pass


@pytest_asyncio.fixture
async def client():
    """Async HTTP test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture
async def admin_token(client):
    """Get a valid admin JWT token."""
    resp = await client.post("/api/v1/auth/login", json={
        "email": "admin@test.com",
        "password": "admin123",
    })
    return resp.json()["token"]


@pytest_asyncio.fixture
async def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}
