import os
import urllib.parse
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

def normalize_database_url(url: str) -> str:
    if not url:
        return url
    url = url.strip()

    # Convert postgres:// or postgresql:// to postgresql+asyncpg://
    if url.startswith("postgres://"):
        url = "postgresql+asyncpg://" + url[len("postgres://"):]
    elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
        url = "postgresql+asyncpg://" + url[len("postgresql://"):]

    if not url.startswith("postgresql+asyncpg://"):
        return url

    parsed = urllib.parse.urlsplit(url)
    if not parsed.query:
        return url

    # Filter out libpq parameters unsupported by asyncpg (channel_binding, sslmode, etc.)
    query_params = urllib.parse.parse_qsl(parsed.query)
    clean_params = []
    has_ssl = False

    for k, v in query_params:
        if k == "sslmode":
            if not has_ssl:
                clean_params.append(("ssl", v))
                has_ssl = True
        elif k == "ssl":
            clean_params.append((k, v))
            has_ssl = True
        elif k in {
            "timeout",
            "command_timeout",
            "statement_cache_size",
            "max_cached_statement_lifetime",
            "max_cacheable_statement_size",
            "direct_tls",
            "target_session_attrs",
            "server_settings",
        }:
            clean_params.append((k, v))

    new_query = urllib.parse.urlencode(clean_params)
    return urllib.parse.urlunsplit((
        parsed.scheme,
        parsed.netloc,
        parsed.path,
        new_query,
        parsed.fragment,
    ))

class Settings(BaseSettings):
    PROJECT_NAME: str = "TaskPulse"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = Field(default="taskpulse-super-secret-key-production-change-me")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    # SQLite fallback allows local development without running Postgres container
    DATABASE_URL: str = Field(
        default=os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./taskpulse.db")
    )
    REDIS_URL: str = Field(
        default=os.getenv("REDIS_URL", "redis://localhost:6379/0")
    )
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        return normalize_database_url(v)

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="ignore",
    )

settings = Settings()
