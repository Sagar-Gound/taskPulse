import asyncio
from typing import Annotated
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models import BackgroundJob, Project, User
from app.schemas import BackgroundJobResponse
from app.worker.tasks import (
    celery_bulk_rollover_tasks,
    celery_generate_sprint_report,
    process_bulk_rollover,
    process_sprint_report,
)

router = APIRouter(tags=["jobs"])

def dispatch_task(task_func, celery_task, *args):
    # Try Celery broker first, fallback to FastAPI background task if broker unreachable
    try:
        celery_task.delay(*args)
    except Exception:
        asyncio.create_task(task_func(*args))

@router.post(
    "/projects/{project_id}/reports",
    response_model=BackgroundJobResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def trigger_sprint_report(
    project_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(["ADMIN", "MANAGER"]))],
):
    project_res = await db.execute(select(Project).where(Project.id == project_id))
    if not project_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    # Idempotency check: return active job if one is already running
    active_stmt = select(BackgroundJob).where(
        BackgroundJob.project_id == project_id,
        BackgroundJob.job_type == "SPRINT_REPORT",
        BackgroundJob.status.in_(["PENDING", "PROCESSING"]),
    )
    active_job = (await db.execute(active_stmt)).scalars().first()
    if active_job:
        return BackgroundJobResponse.model_validate(active_job)

    job = BackgroundJob(
        project_id=project_id,
        triggered_by=current_user.id,
        job_type="SPRINT_REPORT",
        status="PENDING",
        progress_percent=0,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    dispatch_task(process_sprint_report, celery_generate_sprint_report, job.id, project_id)
    return BackgroundJobResponse.model_validate(job)

@router.post(
    "/projects/{project_id}/bulk-rollover",
    response_model=BackgroundJobResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def trigger_bulk_rollover(
    project_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(["ADMIN", "MANAGER"]))],
):
    project_res = await db.execute(select(Project).where(Project.id == project_id))
    if not project_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    job = BackgroundJob(
        project_id=project_id,
        triggered_by=current_user.id,
        job_type="BULK_ROLLOVER",
        status="PENDING",
        progress_percent=0,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    dispatch_task(process_bulk_rollover, celery_bulk_rollover_tasks, job.id, project_id)
    return BackgroundJobResponse.model_validate(job)

@router.get("/jobs/{job_id}", response_model=BackgroundJobResponse)
async def get_job_status(
    job_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
):
    stmt = select(BackgroundJob).where(BackgroundJob.id == job_id)
    job = (await db.execute(stmt)).scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Background job not found")
    return BackgroundJobResponse.model_validate(job)

@router.get("/projects/{project_id}/jobs", response_model=list[BackgroundJobResponse])
async def list_project_jobs(
    project_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
):
    stmt = (
        select(BackgroundJob)
        .where(BackgroundJob.project_id == project_id)
        .order_by(BackgroundJob.created_at.desc())
        .limit(10)
    )
    jobs = (await db.execute(stmt)).scalars().all()
    return [BackgroundJobResponse.model_validate(j) for j in jobs]

