import os
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

def normalize_database_url(url: str) -> str:
    # Convert postgres:// or postgresql:// to postgresql+asyncpg://
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    # asyncpg expects ssl=require instead of libpq sslmode=require
    if "sslmode=" in url:
        url = url.replace("sslmode=", "ssl=")
    return url

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
