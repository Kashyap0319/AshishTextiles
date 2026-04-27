"""
Supabase client wrapper.
When SUPABASE_URL and SUPABASE_KEY are configured, provides a Supabase client
for auth and direct DB access. Falls back gracefully if not configured.
"""
from app.config import settings

_client = None


def get_supabase():
    """Get Supabase client instance (lazy init)."""
    global _client
    if _client is not None:
        return _client

    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        return None

    from supabase import create_client
    _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    return _client


def is_supabase_configured() -> bool:
    return bool(settings.SUPABASE_URL and settings.SUPABASE_KEY)
