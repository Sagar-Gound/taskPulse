from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.auth import router as auth_router
from app.api.jobs import router as jobs_router
from app.api.projects import router as projects_router
from app.api.tasks import router as tasks_router
from app.core.cache import get_redis_client
from app.core.config import settings
from app.core.database import engine, init_db
from app.seed import seed_database

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    try:
        await seed_database()
    except Exception:
        pass
    yield
    await engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Cache", "Content-Disposition"],
)

app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(projects_router, prefix=settings.API_V1_STR)
app.include_router(tasks_router, prefix=settings.API_V1_STR)
app.include_router(jobs_router, prefix=settings.API_V1_STR)

@app.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    db_status = "healthy"
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        db_status = "unhealthy"

    redis_status = "healthy"
    try:
        client = get_redis_client()
        await client.ping()
    except Exception:
        redis_status = "fallback_memory"

    return {
        "status": "online",
        "database": db_status,
        "cache": redis_status,
    }

@app.get("/")
async def root():
    return {
        "message": "TaskPulse API is running",
        "docs": "/docs",
        "health": "/health",
    }

