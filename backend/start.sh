#!/bin/sh
set -e

# Apply database migrations
alembic upgrade head || python -m app.seed

# Start Celery worker in background (using solo pool for minimal memory footprint)
celery -A app.worker.celery_app.celery_app worker --loglevel=info --pool=solo --without-gossip --without-mingle --without-heartbeat &

# Start FastAPI application
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"

