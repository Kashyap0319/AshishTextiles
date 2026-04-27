from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./caratsense.db"
    SECRET_KEY: str = "change-me-in-production"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:5174"
    CLAUDE_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8 hours (1 work day)

    # Static IP whitelist (Ashish: warehouse + shop IPs only)
    # Comma-separated list of allowed IPs. Empty = no restriction.
    ALLOWED_IPS: str = ""
    IP_RESTRICTION_ENABLED: bool = False

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    @property
    def allowed_ips_list(self) -> list[str]:
        if not self.ALLOWED_IPS:
            return []
        return [ip.strip() for ip in self.ALLOWED_IPS.split(",") if ip.strip()]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
