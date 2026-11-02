import uuid
from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

def utcnow() -> datetime:
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="MEMBER", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    projects_owned: Mapped[list["Project"]] = relationship("Project", back_populates="owner", cascade="all, delete-orphan")
    tasks_assigned: Mapped[list["Task"]] = relationship("Task", back_populates="assignee")
    background_jobs: Mapped[list["BackgroundJob"]] = relationship("BackgroundJob", back_populates="triggerer")

class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    owner: Mapped["User"] = relationship("User", back_populates="projects_owned")
    tasks: Mapped[list["Task"]] = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    background_jobs: Mapped[list["BackgroundJob"]] = relationship("BackgroundJob", back_populates="project", cascade="all, delete-orphan")

class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    assignee_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="TODO", nullable=False, index=True)
    priority: Mapped[str] = mapped_column(String(50), default="MEDIUM", nullable=False, index=True)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    project: Mapped["Project"] = relationship("Project", back_populates="tasks")
    assignee: Mapped["User | None"] = relationship("User", back_populates="tasks_assigned")

class BackgroundJob(Base):
    __tablename__ = "background_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    triggered_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    job_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="PENDING", nullable=False, index=True)
    progress_percent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    result_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    project: Mapped["Project"] = relationship("Project", back_populates="background_jobs")
    triggerer: Mapped["User"] = relationship("User", back_populates="background_jobs")

