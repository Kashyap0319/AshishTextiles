"""Audit logging — tracks all mutating API calls via background task."""
import json
import asyncio

from app.database import async_session
from app.models.audit_log import AuditLog

METHOD_ACTION = {"POST": "CREATE", "PUT": "UPDATE", "PATCH": "UPDATE", "DELETE": "DELETE"}
SKIP_PATHS = ("/health", "/openapi.json", "/docs", "/redoc", "/api/v1/export/", "/api/v1/dashboard/")


async def write_audit_log(action: str, entity_type: str, entity_id: int | None, ip: str | None, path: str, method: str, status: int):
    """Write audit log entry — called as a deferred task."""
    await asyncio.sleep(0.5)  # Let the main session close first
    try:
        async with async_session() as session:
            log = AuditLog(
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                ip_address=ip,
                changes=json.dumps({"path": path, "method": method, "status": status}),
            )
            session.add(log)
            await session.commit()
    except Exception as e:
        print(f"[AUDIT] Failed to log: {e}")


def schedule_audit(request, response):
    """Schedule audit log write if this is a mutating API call."""
    method = request.method
    path = request.url.path

    if method not in METHOD_ACTION:
        return
    if not path.startswith("/api/v1/"):
        return
    if any(path.startswith(p) for p in SKIP_PATHS):
        return
    if response.status_code >= 400:
        return

    parts = path.strip("/").split("/")
    entity_type = parts[2] if len(parts) > 2 else "unknown"
    entity_id = None
    if len(parts) > 3:
        try:
            entity_id = int(parts[3])
        except (ValueError, IndexError):
            pass

    ip = request.client.host if request.client else None
    asyncio.create_task(write_audit_log(METHOD_ACTION[method], entity_type, entity_id, ip, path, method, response.status_code))
