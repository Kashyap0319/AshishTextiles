import hashlib
import hmac
import json
import math
import os
import logging
from datetime import datetime, timedelta, timezone

from jose import jwt, JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.users import User

logger = logging.getLogger(__name__)

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    """Hash password with salted SHA256 (bcrypt-compatible upgrade path)."""
    salt = os.urandom(16).hex()
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), iterations=100_000)
    return f"pbkdf2:{salt}:{hashed.hex()}"


def verify_password(plain: str, hashed: str) -> bool:
    """Verify password — supports both old SHA256 and new PBKDF2."""
    if hashed.startswith("pbkdf2:"):
        _, salt, stored_hash = hashed.split(":", 2)
        computed = hashlib.pbkdf2_hmac("sha256", plain.encode(), salt.encode(), iterations=100_000)
        return hmac.compare_digest(computed.hex(), stored_hash)
    # Legacy: plain SHA256 (for existing admin user)
    return hmac.compare_digest(hashlib.sha256(plain.encode()).hexdigest(), hashed)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user or not user.hashed_password:
        logger.warning(f"Failed login attempt: {email} (user not found)")
        return None
    if not verify_password(password, user.hashed_password):
        logger.warning(f"Failed login attempt: {email} (wrong password)")
        return None
    return user


def get_user_permissions(user: User) -> list[str]:
    if user.role == "admin":
        return ["dashboard", "stock", "buyers", "sales", "warehouse", "quick-entry", "upload", "settings", "admin"]
    try:
        return json.loads(user.allowed_pages or "[]")
    except (json.JSONDecodeError, TypeError):
        return []


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def check_geo_fence(user: User, lat: float, lng: float) -> bool:
    if user.role == "admin":
        return True
    if not user.geo_lat or not user.geo_lng:
        return True
    distance = haversine_distance(user.geo_lat, user.geo_lng, lat, lng)
    return distance <= (user.geo_radius_meters or 200)


def sanitize_search(query: str) -> str:
    """Escape SQL LIKE wildcards to prevent injection."""
    return query.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
