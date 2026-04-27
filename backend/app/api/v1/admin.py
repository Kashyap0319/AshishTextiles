"""Admin endpoints — manage employees, assign warehouses, set permissions."""
import json

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.users import User
from app.api.v1.auth import require_admin
from app.services.auth_service import hash_password

router = APIRouter(prefix="/admin", tags=["admin"])


class CreateEmployeeRequest(BaseModel):
    name: str
    email: str
    phone: str | None = None
    password: str
    assigned_warehouse: str | None = None
    geo_lat: float | None = None
    geo_lng: float | None = None
    geo_radius_meters: float = 200
    allowed_pages: list[str] = []


class UpdateEmployeeRequest(BaseModel):
    name: str | None = None
    phone: str | None = None
    assigned_warehouse: str | None = None
    geo_lat: float | None = None
    geo_lng: float | None = None
    geo_radius_meters: float | None = None
    allowed_pages: list[str] | None = None
    is_active: bool | None = None


class EmployeeResponse(BaseModel):
    id: int
    name: str
    email: str | None
    phone: str | None
    role: str
    is_active: bool
    assigned_warehouse: str | None
    geo_lat: float | None
    geo_lng: float | None
    geo_radius_meters: float | None
    allowed_pages: list[str]

    model_config = {"from_attributes": True}


def user_to_response(user: User) -> dict:
    try:
        pages = json.loads(user.allowed_pages or "[]")
    except (json.JSONDecodeError, TypeError):
        pages = []
    return EmployeeResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        phone=user.phone,
        role=user.role,
        is_active=user.is_active,
        assigned_warehouse=user.assigned_warehouse,
        geo_lat=user.geo_lat,
        geo_lng=user.geo_lng,
        geo_radius_meters=user.geo_radius_meters,
        allowed_pages=pages,
    )


@router.get("/employees", response_model=list[EmployeeResponse])
async def list_employees(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.role == "employee").order_by(User.name))
    return [user_to_response(u) for u in result.scalars().all()]


@router.post("/employees", response_model=EmployeeResponse, status_code=201)
async def create_employee(data: CreateEmployeeRequest, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    # Check email uniqueness
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already exists")

    user = User(
        name=data.name,
        email=data.email,
        phone=data.phone,
        role="employee",
        hashed_password=hash_password(data.password),
        assigned_warehouse=data.assigned_warehouse,
        geo_lat=data.geo_lat,
        geo_lng=data.geo_lng,
        geo_radius_meters=data.geo_radius_meters,
        allowed_pages=json.dumps(data.allowed_pages),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user_to_response(user)


@router.put("/employees/{user_id}", response_model=EmployeeResponse)
async def update_employee(user_id: int, data: UpdateEmployeeRequest, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id, User.role == "employee"))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")

    if data.name is not None:
        user.name = data.name
    if data.phone is not None:
        user.phone = data.phone
    if data.assigned_warehouse is not None:
        user.assigned_warehouse = data.assigned_warehouse
    if data.geo_lat is not None:
        user.geo_lat = data.geo_lat
    if data.geo_lng is not None:
        user.geo_lng = data.geo_lng
    if data.geo_radius_meters is not None:
        user.geo_radius_meters = data.geo_radius_meters
    if data.allowed_pages is not None:
        user.allowed_pages = json.dumps(data.allowed_pages)
    if data.is_active is not None:
        user.is_active = data.is_active

    await db.flush()
    await db.refresh(user)
    return user_to_response(user)


@router.delete("/employees/{user_id}", status_code=204)
async def delete_employee(user_id: int, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id, User.role == "employee"))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")
    user.is_active = False
    await db.flush()


@router.post("/reset-password/{user_id}")
async def reset_employee_password(user_id: int, new_password: str = Query(..., min_length=4), admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.hashed_password = hash_password(new_password)
    await db.flush()
    return {"status": "ok", "message": f"Password reset for {user.name}"}


# ═══════════════ Geofence + IP Restriction Settings ═══════════════

class GeofenceConfig(BaseModel):
    geo_lat: float
    geo_lng: float
    geo_radius_meters: float = 200


@router.get("/security-config")
async def get_security_config(admin: User = Depends(require_admin)):
    """Get current geofence + IP restriction config."""
    from app.config import settings
    return {
        "ip_restriction_enabled": settings.IP_RESTRICTION_ENABLED,
        "allowed_ips": settings.allowed_ips_list,
        "geofence_default_radius_meters": 200,
    }


@router.post("/employees/{user_id}/geofence")
async def set_employee_geofence(
    user_id: int,
    data: GeofenceConfig,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Set warehouse coords + radius for an employee. They can only login within this radius."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    user.geo_lat = data.geo_lat
    user.geo_lng = data.geo_lng
    user.geo_radius_meters = data.geo_radius_meters
    await db.flush()
    return {
        "status": "ok",
        "user_id": user_id,
        "geo_lat": user.geo_lat,
        "geo_lng": user.geo_lng,
        "geo_radius_meters": user.geo_radius_meters,
    }


@router.get("/employees/with-geofence")
async def list_employees_with_geofence(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all users with their geofence config — for admin overview."""
    result = await db.execute(select(User).where(User.role.in_(["employee", "sales", "warehouse"])))
    users = result.scalars().all()
    return [{
        "id": u.id, "name": u.name, "email": u.email, "role": u.role,
        "geo_lat": u.geo_lat, "geo_lng": u.geo_lng,
        "geo_radius_meters": u.geo_radius_meters,
        "geofence_enabled": bool(u.geo_lat and u.geo_lng),
        "is_active": u.is_active,
    } for u in users]


@router.post("/test-current-location")
async def test_current_location(
    lat: float = Query(...),
    lng: float = Query(...),
    user_id: int = Query(...),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Test if a given lat/lng is within the user's geofence."""
    from app.services.auth_service import check_geo_fence, haversine_distance
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    is_inside = check_geo_fence(user, lat, lng)
    distance = 0
    if user.geo_lat and user.geo_lng:
        distance = haversine_distance(user.geo_lat, user.geo_lng, lat, lng)
    return {
        "is_inside_geofence": is_inside,
        "distance_meters": round(distance, 1),
        "allowed_radius_meters": user.geo_radius_meters,
    }
