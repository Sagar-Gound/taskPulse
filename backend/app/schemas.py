from datetime import datetime
from typing import Any, Generic, TypeVar
from pydantic import BaseModel, ConfigDict, EmailStr, Field

T = TypeVar("T")

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "MEMBER"

class UserCreate(UserBase):
    password: str = Field(min_length=6)

class UserResponse(UserBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class DemoLoginRequest(BaseModel):
    role: str = "MANAGER"

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class ProjectBase(BaseModel):
    name: str
    description: str | None = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None

class ProjectResponse(ProjectBase):
    id: int
    owner_id: int
    created_at: datetime
    task_count: int | None = 0
    model_config = ConfigDict(from_attributes=True)

class TaskBase(BaseModel):
    title: str
    description: str | None = None
    status: str = "TODO"
    priority: str = "MEDIUM"
    due_date: datetime | None = None
    assignee_id: int | None = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    due_date: datetime | None = None
    assignee_id: int | None = None

class TaskResponse(TaskBase):
    id: int
    project_id: int
    created_at: datetime
    updated_at: datetime
    assignee: UserResponse | None = None
    model_config = ConfigDict(from_attributes=True)

class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    limit: int
    total_pages: int

class ProjectAnalyticsResponse(BaseModel):
    project_id: int
    total_tasks: int
    completed_tasks: int
    in_progress_tasks: int
    todo_tasks: int
    completion_rate: float
    overdue_count: int
    priority_distribution: dict[str, int]
    workload_distribution: list[dict[str, Any]]
    cached: bool = False
    cache_source: str = "PostgreSQL"

class BackgroundJobResponse(BaseModel):
    id: str
    project_id: int
    triggered_by: int
    job_type: str
    status: str
    progress_percent: int
    result_data: dict[str, Any] | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

