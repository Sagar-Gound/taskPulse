import math
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.cache import invalidate_cache_pattern
from app.core.database import get_db
from app.core.security import get_current_user
from app.models import Task, User
from app.schemas import PaginatedResponse, TaskCreate, TaskResponse, TaskUpdate

router = APIRouter(tags=["tasks"])

@router.get("/projects/{project_id}/tasks", response_model=PaginatedResponse[TaskResponse])
async def list_project_tasks(
    project_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    priority_filter: str | None = Query(None, alias="priority"),
    assignee_id: int | None = Query(None),
    q: str | None = Query(None),
):
    query = select(Task).options(selectinload(Task.assignee)).where(Task.project_id == project_id)

    if status_filter:
        query = query.where(Task.status == status_filter.upper())
    if priority_filter:
        query = query.where(Task.priority == priority_filter.upper())
    if assignee_id:
        query = query.where(Task.assignee_id == assignee_id)
    if q:
        query = query.where(
            or_(Task.title.ilike(f"%{q}%"), Task.description.ilike(f"%{q}%"))
        )

    count_query = select(func.count()).select_from(query.subquery())
    total_count = (await db.execute(count_query)).scalar() or 0

    offset = (page - 1) * limit
    paginated_query = query.order_by(Task.created_at.desc()).offset(offset).limit(limit)
    tasks = (await db.execute(paginated_query)).scalars().all()

    total_pages = math.ceil(total_count / limit) if total_count > 0 else 1
    return PaginatedResponse(
        items=[TaskResponse.model_validate(t) for t in tasks],
        total=total_count,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )

@router.post("/projects/{project_id}/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    project_id: int,
    req: TaskCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
):
    task = Task(
        project_id=project_id,
        title=req.title,
        description=req.description,
        status=req.status.upper(),
        priority=req.priority.upper(),
        due_date=req.due_date,
        assignee_id=req.assignee_id,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)

    # Invalidate cache for this project so metrics refresh immediately
    await invalidate_cache_pattern(f"project:{project_id}:*")

    stmt = select(Task).options(selectinload(Task.assignee)).where(Task.id == task.id)
    refreshed = (await db.execute(stmt)).scalar_one()
    return TaskResponse.model_validate(refreshed)

@router.patch("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    req: TaskUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    stmt = select(Task).options(selectinload(Task.assignee)).where(Task.id == task_id)
    task = (await db.execute(stmt)).scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Regular members can only update their own assigned tasks
    if current_user.role == "MEMBER" and task.assignee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Members can only update their own assigned tasks")

    update_data = req.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"]:
        update_data["status"] = update_data["status"].upper()
    if "priority" in update_data and update_data["priority"]:
        update_data["priority"] = update_data["priority"].upper()

    for k, v in update_data.items():
        setattr(task, k, v)

    await db.commit()
    await db.refresh(task)
    await invalidate_cache_pattern(f"project:{task.project_id}:*")

    stmt = select(Task).options(selectinload(Task.assignee)).where(Task.id == task.id)
    refreshed = (await db.execute(stmt)).scalar_one()
    return TaskResponse.model_validate(refreshed)

@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if current_user.role == "MEMBER":
        raise HTTPException(status_code=403, detail="Only Managers and Admins can delete tasks")

    project_id = task.project_id
    await db.delete(task)
    await db.commit()
    await invalidate_cache_pattern(f"project:{project_id}:*")

