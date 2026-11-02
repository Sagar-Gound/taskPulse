import asyncio
import time
from sqlalchemy import func, select, update
from sqlalchemy.orm import selectinload

from app.core.cache import invalidate_cache_pattern
from app.core.database import AsyncSessionLocal
from app.models import BackgroundJob, Project, Task
from app.worker.celery_app import celery_app

async def process_sprint_report(job_id: str, project_id: int):
    async with AsyncSessionLocal() as session:
        # Step 1: Initialize job to processing (25%)
        await session.execute(
            update(BackgroundJob)
            .where(BackgroundJob.id == job_id)
            .values(status="PROCESSING", progress_percent=25)
        )
        await session.commit()
        await asyncio.sleep(1.5)

        # Step 2: Aggregate metrics (60%)
        tasks_result = await session.execute(
            select(Task).where(Task.project_id == project_id)
        )
        tasks = tasks_result.scalars().all()
        total = len(tasks)
        completed = sum(1 for t in tasks if t.status == "DONE")
        in_progress = sum(1 for t in tasks if t.status == "IN_PROGRESS")
        todo = sum(1 for t in tasks if t.status == "TODO")
        high_priority = sum(1 for t in tasks if t.priority in ("HIGH", "URGENT"))

        await session.execute(
            update(BackgroundJob)
            .where(BackgroundJob.id == job_id)
            .values(progress_percent=60)
        )
        await session.commit()
        await asyncio.sleep(2.0)

        # Step 3: Complete report generation (100%)
        velocity_score = round((completed / total * 100), 1) if total else 0.0
        result_payload = {
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "project_id": project_id,
            "metrics": {
                "total_tasks": total,
                "completed_tasks": completed,
                "in_progress_tasks": in_progress,
                "todo_tasks": todo,
                "high_priority_tasks": high_priority,
                "sprint_velocity_percent": velocity_score,
            },
            "summary": f"Sprint report processed with {completed}/{total} tasks completed ({velocity_score}% completion).",
        }

        await session.execute(
            update(BackgroundJob)
            .where(BackgroundJob.id == job_id)
            .values(status="COMPLETED", progress_percent=100, result_data=result_payload)
        )
        await session.commit()

async def process_bulk_rollover(job_id: str, project_id: int):
    async with AsyncSessionLocal() as session:
        await session.execute(
            update(BackgroundJob)
            .where(BackgroundJob.id == job_id)
            .values(status="PROCESSING", progress_percent=30)
        )
        await session.commit()
        await asyncio.sleep(1.0)

        tasks_result = await session.execute(
            select(Task).where(Task.project_id == project_id, Task.status != "DONE")
        )
        unfinished_tasks = tasks_result.scalars().all()
        rolled_count = len(unfinished_tasks)

        # Shift unfinished tasks into TODO for next sprint
        for task in unfinished_tasks:
            task.status = "TODO"
        
        await session.execute(
            update(BackgroundJob)
            .where(BackgroundJob.id == job_id)
            .values(
                status="COMPLETED",
                progress_percent=100,
                result_data={
                    "tasks_rolled_over": rolled_count,
                    "message": f"Successfully rolled over {rolled_count} pending tasks to the next sprint.",
                },
            )
        )
        await session.commit()
        await invalidate_cache_pattern(f"project:{project_id}:*")

@celery_app.task(name="tasks.generate_sprint_report", autoretry_for=(Exception,), retry_backoff=True)
def celery_generate_sprint_report(job_id: str, project_id: int):
    asyncio.run(process_sprint_report(job_id, project_id))

@celery_app.task(name="tasks.bulk_rollover_tasks", autoretry_for=(Exception,), retry_backoff=True)
def celery_bulk_rollover_tasks(job_id: str, project_id: int):
    asyncio.run(process_bulk_rollover(job_id, project_id))

