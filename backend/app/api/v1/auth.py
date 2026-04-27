"""Auth endpoints — login, me, token refresh."""
import json

from fastapi import APIRouter, Depends, HTTPException, Header, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.users import User
from app.services.auth_service import (
    authenticate_user,
    check_geo_fence,
    create_access_token,
    decode_token,
    get_user_permissions,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str
    lat: float | None = None
    lng: float | None = None


class LoginResponse(BaseModel):
    token: str
    user: dict


class MeResponse(BaseModel):
    id: int
    name: str
    email: str | None
    phone: str | None
    role: str
    assigned_warehouse: str | None
    permissions: list[str]


async def get_current_user(
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    payload = decode_token(token)
    if not payload or "user_id" not in payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    result = await db.execute(select(User).where(User.id == payload["user_id"]))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


async def get_optional_user(
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Returns user if token present and valid, None otherwise. Doesn't block."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    payload = decode_token(token)
    if not payload or "user_id" not in payload:
        return None
    result = await db.execute(select(User).where(User.id == payload["user_id"]))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        return None
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def require_permission(page: str):
    """Dependency factory — checks if user has access to a specific page."""
    def checker(user: User = Depends(get_current_user)) -> User:
        perms = get_user_permissions(user)
        if page not in perms:
            raise HTTPException(status_code=403, detail=f"No access to {page}")
        return user
    return checker


@router.post("/login", response_model=LoginResponse)
@limiter.limit("20/minute")
async def login(request: Request, data: LoginRequest, db: AsyncSession = Depends(get_db)):
    # Static IP whitelist check (Ashish: warehouse + shop IPs only)
    # Applies to all non-admin users when enabled
    from app.config import settings
    if settings.IP_RESTRICTION_ENABLED and settings.allowed_ips_list:
        client_ip = request.client.host if request.client else ""
        # Allow loopback always (for dev)
        if client_ip not in settings.allowed_ips_list and client_ip not in ("127.0.0.1", "::1", "localhost"):
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Login only allowed from warehouse/shop network. Your IP: {client_ip}"
            )

    user = await authenticate_user(db, data.email, data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Geo-fence check for employees
    if user.role == "employee":
        if data.lat is None or data.lng is None:
            raise HTTPException(status_code=400, detail="Location required for employee login")
        if not check_geo_fence(user, data.lat, data.lng):
            raise HTTPException(
                status_code=403,
                detail="You are outside your assigned warehouse area. Please login from the warehouse location."
            )

    token = create_access_token({"user_id": user.id, "role": user.role})
    permissions = get_user_permissions(user)

    return LoginResponse(
        token=token,
        user={
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "assigned_warehouse": user.assigned_warehouse,
            "permissions": permissions,
        },
    )


@router.get("/me", response_model=MeResponse)
async def me(user: User = Depends(get_current_user)):
    return MeResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        phone=user.phone,
        role=user.role,
        assigned_warehouse=user.assigned_warehouse,
        permissions=get_user_permissions(user),
    )


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class UpdateProfileRequest(BaseModel):
    name: str | None = None
    phone: str | None = None


@router.put("/change-password")
async def change_password(data: ChangePasswordRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not verify_password(data.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    user.hashed_password = hash_password(data.new_password)
    await db.flush()
    return {"status": "ok", "message": "Password changed successfully"}


@router.put("/profile")
async def update_profile(data: UpdateProfileRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if data.name:
        user.name = data.name
    if data.phone:
        user.phone = data.phone
    await db.flush()
    return {"status": "ok", "name": user.name, "phone": user.phone}
