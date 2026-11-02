from datetime import datetime, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.cache import get_cached_json, invalidate_cache_pattern, set_cached_json
from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models import Project, Task, User
from app.schemas import ProjectAnalyticsResponse, ProjectCreate, ProjectResponse, ProjectUpdate

router = APIRouter(prefix="/projects", tags=["projects"])

@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
):
    query = (
        select(Project, func.count(Task.id).label("task_count"))
        .outerjoin(Task, Project.id == Task.project_id)
        .group_by(Project.id)
        .order_by(Project.created_at.desc())
    )
    result = await db.execute(query)
    rows = result.all()
    
    projects_out = []
    for project, count in rows:
        data = ProjectResponse.model_validate(project)
        data.task_count = count
        projects_out.append(data)
    return projects_out

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    req: ProjectCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(["ADMIN", "MANAGER"]))],
):
    project = Project(
        name=req.name,
        description=req.description,
        owner_id=current_user.id,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    
    data = ProjectResponse.model_validate(project)
    data.task_count = 0
    return data

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    count_res = await db.execute(select(func.count(Task.id)).where(Task.project_id == project_id))
    data = ProjectResponse.model_validate(project)
    data.task_count = count_res.scalar() or 0
    return data

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_role(["ADMIN"]))],
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    await db.delete(project)
    await db.commit()
    await invalidate_cache_pattern(f"project:{project_id}:*")
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.get("/{project_id}/analytics", response_model=ProjectAnalyticsResponse)
async def get_project_analytics(
    project_id: int,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
):
    cache_key = f"project:{project_id}:analytics"
    cached_data, is_hit = await get_cached_json(cache_key)

    if is_hit and cached_data:
        response.headers["X-Cache"] = "HIT"
        cached_data["cached"] = True
        cached_data["cache_source"] = "Redis Cache (<5ms)"
        return cached_data

    response.headers["X-Cache"] = "MISS"
    tasks_res = await db.execute(
        select(Task).options(selectinload(Task.assignee)).where(Task.project_id == project_id)
    )
    tasks = tasks_res.scalars().all()
    
    total = len(tasks)
    completed = sum(1 for t in tasks if t.status == "DONE")
    in_progress = sum(1 for t in tasks if t.status == "IN_PROGRESS")
    todo = sum(1 for t in tasks if t.status == "TODO")
    
    now = datetime.now(timezone.utc)
    overdue = sum(
        1 for t in tasks
        if t.due_date and t.due_date.replace(tzinfo=timezone.utc if t.due_date.tzinfo is None else None) < now and t.status != "DONE"
    )
    
    priorities = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "URGENT": 0}
    for t in tasks:
        p = (t.priority or "MEDIUM").upper()
        priorities[p] = priorities.get(p, 0) + 1
        
    workload: dict[str, int] = {}
    for t in tasks:
        name = t.assignee.full_name if t.assignee else "Unassigned"
        workload[name] = workload.get(name, 0) + 1
        
    workload_list = [{"user": k, "count": v} for k, v in workload.items()]
    rate = round((completed / total * 100), 1) if total > 0 else 0.0

    analytics_data = {
        "project_id": project_id,
        "total_tasks": total,
        "completed_tasks": completed,
        "in_progress_tasks": in_progress,
        "todo_tasks": todo,
        "completion_rate": rate,
        "overdue_count": overdue,
        "priority_distribution": priorities,
        "workload_distribution": workload_list,
        "cached": False,
        "cache_source": "PostgreSQL",
    }

    # Cache for 5 minutes (300 seconds)
    await set_cached_json(cache_key, analytics_data, ttl=300)
    return analytics_data

@router.delete("/{project_id}/cache", status_code=status.HTTP_200_OK)
async def clear_project_cache(
    project_id: int,
    _: Annotated[User, Depends(get_current_user)],
):
    await invalidate_cache_pattern(f"project:{project_id}:*")
    return {"message": f"Cache cleared for project {project_id}"}

