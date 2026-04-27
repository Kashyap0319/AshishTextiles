"""Tests for authentication, authorization, and geofencing."""
import pytest
from httpx import AsyncClient


# ─── LOGIN TESTS ───────────────────────────────────────────────


class TestLogin:
    @pytest.mark.asyncio
    async def test_admin_login_success(self, client: AsyncClient):
        resp = await client.post("/api/v1/auth/login", json={
            "email": "admin@test.com",
            "password": "admin123",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
        assert "admin" in data["user"]["permissions"]

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client: AsyncClient):
        resp = await client.post("/api/v1/auth/login", json={
            "email": "admin@test.com",
            "password": "wrongpassword",
        })
        assert resp.status_code == 401
        assert "Invalid" in resp.json()["detail"]

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, client: AsyncClient):
        resp = await client.post("/api/v1/auth/login", json={
            "email": "nobody@test.com",
            "password": "whatever",
        })
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_login_inactive_user(self, client: AsyncClient):
        resp = await client.post("/api/v1/auth/login", json={
            "email": "fired@test.com",
            "password": "fired123",
        })
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_admin_login_no_location_required(self, client: AsyncClient):
        """Admin should login without providing lat/lng."""
        resp = await client.post("/api/v1/auth/login", json={
            "email": "admin@test.com",
            "password": "admin123",
        })
        assert resp.status_code == 200


# ─── GEOFENCING TESTS ─────────────────────────────────────────


class TestGeofencing:
    @pytest.mark.asyncio
    async def test_employee_login_without_location_rejected(self, client: AsyncClient):
        """Employee with geo-fence MUST provide lat/lng."""
        resp = await client.post("/api/v1/auth/login", json={
            "email": "worker@test.com",
            "password": "worker123",
        })
        assert resp.status_code == 400
        assert "Location required" in resp.json()["detail"]

    @pytest.mark.asyncio
    async def test_employee_login_inside_geofence(self, client: AsyncClient):
        """Employee at warehouse location (within 200m) — should succeed."""
        # Surat warehouse: 21.1702, 72.8311
        # Nearby point (~50m away)
        resp = await client.post("/api/v1/auth/login", json={
            "email": "worker@test.com",
            "password": "worker123",
            "lat": 21.1704,
            "lng": 72.8313,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["user"]["role"] == "employee"
        assert data["user"]["assigned_warehouse"] == "Hall 3"

    @pytest.mark.asyncio
    async def test_employee_login_outside_geofence(self, client: AsyncClient):
        """Employee 5km away from warehouse — should be rejected."""
        # Mumbai: 19.0760, 72.8777 — far from Surat
        resp = await client.post("/api/v1/auth/login", json={
            "email": "worker@test.com",
            "password": "worker123",
            "lat": 19.0760,
            "lng": 72.8777,
        })
        assert resp.status_code == 403
        assert "outside" in resp.json()["detail"]

    @pytest.mark.asyncio
    async def test_employee_login_at_geofence_boundary(self, client: AsyncClient):
        """Employee at exact boundary (200m) — should be accepted."""
        # ~200m north of 21.1702, 72.8311 ≈ 21.1720, 72.8311
        resp = await client.post("/api/v1/auth/login", json={
            "email": "worker@test.com",
            "password": "worker123",
            "lat": 21.1715,
            "lng": 72.8311,
        })
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_employee_no_geofence_can_login_anywhere(self, client: AsyncClient):
        """Employee without geo-fence configured — login from anywhere."""
        resp = await client.post("/api/v1/auth/login", json={
            "email": "sales@test.com",
            "password": "sales123",
            "lat": 0.0,
            "lng": 0.0,
        })
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_admin_bypasses_geofence(self, client: AsyncClient):
        """Admin ignores geo-fence — can login from anywhere."""
        resp = await client.post("/api/v1/auth/login", json={
            "email": "admin@test.com",
            "password": "admin123",
            "lat": -33.8688,  # Sydney, Australia
            "lng": 151.2093,
        })
        assert resp.status_code == 200


# ─── ENDPOINT PROTECTION TESTS ────────────────────────────────


class TestEndpointProtection:
    """Verify ALL operational endpoints return 401 without a token."""

    PROTECTED_ENDPOINTS = [
        ("GET", "/api/v1/dashboard/summary"),
        ("GET", "/api/v1/dashboard/actions"),
        ("GET", "/api/v1/dashboard/sales-trend"),
        ("GET", "/api/v1/dashboard/quality-distribution"),
        ("GET", "/api/v1/dashboard/supplier-scorecard"),
        ("GET", "/api/v1/stock/"),
        ("GET", "/api/v1/stock/aging"),
        ("GET", "/api/v1/buyers/"),
        ("GET", "/api/v1/buyers/top"),
        ("GET", "/api/v1/buyers/dormant"),
        ("GET", "/api/v1/sales/"),
        ("GET", "/api/v1/sales/recent"),
        ("GET", "/api/v1/warehouse/"),
        ("GET", "/api/v1/warehouse/halls"),
        ("GET", "/api/v1/articles/"),
        ("GET", "/api/v1/ml/clusters"),
        ("GET", "/api/v1/ml/clearance"),
        ("GET", "/api/v1/ml/frequently-bought-together"),
        ("GET", "/api/v1/export/stock"),
        ("GET", "/api/v1/export/buyers"),
        ("GET", "/api/v1/profitability/summary"),
        ("GET", "/api/v1/profitability/buyer-ranking"),
    ]

    @pytest.mark.asyncio
    @pytest.mark.parametrize("method,url", PROTECTED_ENDPOINTS)
    async def test_protected_endpoint_rejects_unauthenticated(self, client: AsyncClient, method, url):
        """Every protected endpoint should return 401 without token."""
        resp = await client.request(method, url)
        assert resp.status_code == 401, f"{method} {url} returned {resp.status_code}, expected 401"

    @pytest.mark.asyncio
    @pytest.mark.parametrize("method,url", PROTECTED_ENDPOINTS)
    async def test_protected_endpoint_accepts_authenticated(self, client: AsyncClient, admin_headers, method, url):
        """Every protected endpoint should return 200 with valid admin token."""
        resp = await client.request(method, url, headers=admin_headers)
        assert resp.status_code in (200, 422), f"{method} {url} returned {resp.status_code} with auth"

    @pytest.mark.asyncio
    async def test_invalid_token_rejected(self, client: AsyncClient):
        resp = await client.get("/api/v1/dashboard/summary", headers={
            "Authorization": "Bearer fake.invalid.token"
        })
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_expired_token_format_rejected(self, client: AsyncClient):
        resp = await client.get("/api/v1/stock/", headers={
            "Authorization": "Bearer "
        })
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_no_auth_header_rejected(self, client: AsyncClient):
        resp = await client.get("/api/v1/ml/clusters")
        assert resp.status_code == 401


# ─── PUBLIC ENDPOINT TESTS ────────────────────────────────────


class TestPublicEndpoints:
    """Verify public endpoints DON'T require auth."""

    @pytest.mark.asyncio
    async def test_health_is_public(self, client: AsyncClient):
        resp = await client.get("/health")
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_login_is_public(self, client: AsyncClient):
        resp = await client.post("/api/v1/auth/login", json={
            "email": "admin@test.com",
            "password": "admin123",
        })
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_make_offer_is_public(self, client: AsyncClient):
        resp = await client.post("/api/v1/offers/", json={
            "article_code": "TEST001",
            "buyer_name": "Public Buyer",
            "offer_price_per_meter": 50,
        })
        assert resp.status_code == 201


# ─── TOKEN / ME TESTS ─────────────────────────────────────────


class TestTokenAndMe:
    @pytest.mark.asyncio
    async def test_me_returns_user_info(self, client: AsyncClient, admin_headers):
        resp = await client.get("/api/v1/auth/me", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "admin@test.com"
        assert data["role"] == "admin"
        assert "admin" in data["permissions"]

    @pytest.mark.asyncio
    async def test_employee_permissions_limited(self, client: AsyncClient):
        # Login as sales employee
        login = await client.post("/api/v1/auth/login", json={
            "email": "sales@test.com",
            "password": "sales123",
            "lat": 0, "lng": 0,
        })
        token = login.json()["token"]
        me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        data = me.json()
        assert data["role"] == "employee"
        assert "buyers" in data["permissions"]
        assert "sales" in data["permissions"]
        assert "admin" not in data["permissions"]
