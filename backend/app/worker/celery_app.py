from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "taskpulse_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

# Upstash free tier optimization: disable gossip and heartbeats to save commands
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    worker_enable_remote_control=False,
    worker_send_task_events=False,
)

