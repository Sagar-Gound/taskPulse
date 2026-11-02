import asyncio
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from app.core.database import AsyncSessionLocal, engine, init_db
from app.core.security import hash_password
from app.models import Project, Task, User

async def seed_database():
    await init_db()
    async with AsyncSessionLocal() as session:
        # Skip seeding if already populated
        existing = await session.execute(select(User))
        if existing.scalars().first():
            return

        users_data = [
            ("admin@taskpulse.io", "Demo Admin", "ADMIN"),
            ("manager@taskpulse.io", "Demo Manager", "MANAGER"),
            ("member@taskpulse.io", "Demo Member", "MEMBER"),
            ("sarah.dev@taskpulse.io", "Sarah Chen", "MEMBER"),
            ("alex.eng@taskpulse.io", "Alex Rivera", "MEMBER"),
        ]
        users: list[User] = []
        for email, name, role in users_data:
            u = User(
                email=email,
                full_name=name,
                hashed_password=hash_password("password123"),
                role=role,
            )
            session.add(u)
            users.append(u)
        await session.commit()
        for u in users:
            await session.refresh(u)

        admin = users[0]
        manager = users[1]

        projects_data = [
            ("Sprint 24: Core Platform Modernization", "Upgrading FastAPI, SQLAlchemy 2.0 async, Redis cache integration, and Celery pipelines.", manager.id),
            ("Mobile App v2 Redesign", "Cross-platform mobile client revamp with offline caching and biometric auth.", manager.id),
            ("Q4 Security & Compliance Audit", "SOC2 compliance readiness, JWT rotation hardening, and role-based access verification.", admin.id),
        ]
        projects: list[Project] = []
        for name, desc, owner_id in projects_data:
            p = Project(name=name, description=desc, owner_id=owner_id)
            session.add(p)
            projects.append(p)
        await session.commit()
        for p in projects:
            await session.refresh(p)

        now = datetime.now(timezone.utc)
        
        # 40 realistic tasks distributed across projects
        task_templates = [
            # Project 1: Sprint 24 (18 tasks)
            (0, "Implement Redis cache-aside for analytics", "Store JSON payload with 300s TTL and check X-Cache header", "DONE", "HIGH", -2, 1),
            (0, "Set up SQLAlchemy 2.0 selectinload", "Eliminate N+1 queries when retrieving project tasks", "DONE", "HIGH", -1, 3),
            (0, "Configure Celery report worker pool", "Optimize worker pool flags for low idle Redis commands", "DONE", "MEDIUM", 0, 4),
            (0, "Build optimistic status drag-and-drop", "Update TanStack query cache on mutate with rollback on failure", "IN_PROGRESS", "URGENT", 2, 2),
            (0, "Add silent token refresh interceptor", "Axios queue replay on 401 token expiration", "IN_PROGRESS", "HIGH", 3, 3),
            (0, "Write Alembic migration for background_jobs", "Create initial schema version for PostgreSQL", "DONE", "MEDIUM", -3, 1),
            (0, "Add adaptive polling to report modal", "Poll every 1.5s until job reaches COMPLETED state", "IN_PROGRESS", "HIGH", 1, 2),
            (0, "Benchmark Redis vs Postgres latency", "Collect response times for cache hit badge telemetry", "TODO", "MEDIUM", 4, 4),
            (0, "Refactor task filter query parameters", "Sync status, priority, and search keyword with URL", "TODO", "LOW", 5, 2),
            (0, "Create 1-click recruiter demo buttons", "Instant login bypass for Admin, Manager, and Member", "DONE", "HIGH", -4, 1),
            (0, "Implement bulk sprint rollover job", "Move incomplete tasks to new sprint in worker process", "TODO", "MEDIUM", 6, 4),
            (0, "Add task creation modal with validation", "Pydantic v2 validation feedback in form dialog", "DONE", "MEDIUM", -1, 3),
            (0, "Set up Docker compose for local dev", "Orchestrate Postgres, Redis, API, and Vite web client", "DONE", "HIGH", -5, 1),
            (0, "Add hover prefetching for project sidebar", "Prefetch project query on mouseenter with 150ms debounce", "TODO", "LOW", 7, 2),
            (0, "Implement RBAC guard for project deletion", "Only ADMIN can execute project drop operations", "DONE", "HIGH", -2, 0),
            (0, "Optimize Celery heartbeat settings", "Disable gossip and heartbeats for Upstash tier limit", "DONE", "MEDIUM", -1, 4),
            (0, "Add unit tests for auth dependency", "Verify 401 and 403 status code boundaries", "TODO", "MEDIUM", 8, 3),
            (0, "Prepare Render deployment start.sh script", "Run uvicorn and celery worker within single container", "TODO", "HIGH", 3, 1),

            # Project 2: Mobile App v2 (12 tasks)
            (1, "Audit Figma mobile UI design system", "Extract color palette, typography, and card components", "DONE", "MEDIUM", -4, 3),
            (1, "Implement biometric authentication bridge", "FaceID and TouchID secure enclave key storage", "IN_PROGRESS", "HIGH", 2, 4),
            (1, "Offline SQLite synchronizer", "Queue pending mutations in local SQLite when offline", "IN_PROGRESS", "URGENT", 1, 2),
            (1, "Push notification registration endpoint", "APNs and FCM device token registration service", "TODO", "HIGH", 4, 1),
            (1, "Dark mode styling consistency check", "Ensure contrast ratios meet WCAG AA specifications", "DONE", "LOW", -2, 3),
            (1, "Task filter bottom sheet component", "Mobile bottom sheet for priority and status filtering", "TODO", "MEDIUM", 6, 2),
            (1, "Deep link routing support", "Support /projects/:id and /tasks/:id universal links", "TODO", "HIGH", 5, 4),
            (1, "Battery usage optimization on polling", "Switch to WebSocket push for active job tracking", "TODO", "MEDIUM", 9, 1),
            (1, "End-to-end mobile smoke tests", "Detox automated smoke testing suite across iOS & Android", "TODO", "MEDIUM", 11, 3),
            (1, "App Store submission assets & copy", "Generate screenshots and privacy manifest declarations", "TODO", "LOW", 14, 0),
            (1, "Sentry mobile crash reporting integration", "Capture unhandled runtime exceptions with breadcrumbs", "DONE", "HIGH", -3, 4),
            (1, "Gesture-based swipe to complete", "Swipe left to mark task DONE with haptic feedback", "IN_PROGRESS", "MEDIUM", 3, 2),

            # Project 3: Security & Compliance Audit (10 tasks)
            (2, "Rotate JWT production signing keys", "Cycle HS256 secret keys with grace period verification", "DONE", "URGENT", -6, 0),
            (2, "Review PostgreSQL SSL connection mode", "Enforce sslmode=require for cloud database hosts", "DONE", "HIGH", -4, 1),
            (2, "CORS origin restriction hardening", "Eliminate wildcard origins and whitelist verified domains", "DONE", "HIGH", -3, 1),
            (2, "Audit RBAC route permissions", "Ensure MEMBER role cannot access administrative endpoints", "DONE", "HIGH", -1, 0),
            (2, "Implement rate limiting middleware", "Prevent brute force login attempts on /api/auth/login", "IN_PROGRESS", "URGENT", 1, 3),
            (2, "SQL injection vulnerability scan", "Verify parameterized queries across all dynamic filters", "DONE", "HIGH", -5, 4),
            (2, "Third-party dependency CVE scan", "Run safety and pip-audit across all Python packages", "IN_PROGRESS", "MEDIUM", 2, 1),
            (2, "Data encryption at rest compliance check", "Confirm transparent disk encryption on Neon PostgreSQL", "DONE", "MEDIUM", -2, 0),
            (2, "Automate audit log archiving", "Stream security events to immutable cloud storage bucket", "TODO", "HIGH", 8, 4),
            (2, "Write incident response playbook", "Document procedure for compromised API tokens", "TODO", "MEDIUM", 12, 0),
        ]

        for p_idx, title, desc, status_str, priority_str, days_offset, user_idx in task_templates:
            due = now + timedelta(days=days_offset)
            t = Task(
                project_id=projects[p_idx].id,
                assignee_id=users[user_idx].id,
                title=title,
                description=desc,
                status=status_str,
                priority=priority_str,
                due_date=due,
            )
            session.add(t)

        await session.commit()
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(seed_database())
