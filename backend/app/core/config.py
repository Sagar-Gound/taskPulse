import os
from pydantic import Field
from pydantic_settings import BaseSettings

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

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()

