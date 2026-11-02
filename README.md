# TaskPulse — Collaborative Project Hub & Async Report Engine

TaskPulse is a team workspace and project management platform built with **FastAPI, PostgreSQL, SQLAlchemy 2.0, Redis, Celery, and Vite + React (TanStack Query)**. It features role-based access control (RBAC), Redis cache-aside analytics with live cache telemetry, and an asynchronous sprint report generation engine.

---

## ⚡ Key Highlights

* **1-Click Recruiter Demo:** Direct login button on the login screen to explore as **Demo Manager**, **Demo Admin**, or **Demo Member** without registration.
* **Modern Async Backend:** FastAPI + SQLAlchemy 2.0 `AsyncSession` using `selectinload` to eliminate the N+1 query problem.
* **Cache-Aside & Telemetry:** Redis caching with 300s TTL and event-driven invalidation. Includes a live **Cache Inspector** in the UI displaying `X-Cache: HIT | MISS` and a "Clear Redis Cache" button.
* **Decoupled Asynchronous Jobs:** Celery background worker backed by Redis for multi-stage sprint report generation (0% $\rightarrow$ 25% $\rightarrow$ 60% $\rightarrow$ 100%) and bulk sprint rollover.
* **Adaptive Polling & Optimistic UI:** TanStack Query `onMutate` with rollback for instant task status updates, hover prefetching on sidebar navigation, and smart adaptive polling during Celery job execution.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend API** | FastAPI, Python 3.12+, Pydantic v2, PyJWT, bcrypt |
| **Database & ORM** | PostgreSQL 16 (or SQLite fallback), SQLAlchemy 2.0 Async, Alembic |
| **Cache & Broker** | Redis 7, Celery 5 (optimized worker pool flags for free tiers) |
| **Frontend Web** | Vite, React 18, TypeScript, TanStack Query v5, Tailwind CSS, Axios |
| **Containerization**| Docker & Docker Compose |

---

## 🚀 Quickstart

### Option A: Running with Docker Compose (Recommended)

```bash
docker compose up --build
```

* Frontend: `http://localhost:5173`
* Backend API & Docs: `http://localhost:8000/docs`
* PostgreSQL: `localhost:5432`
* Redis: `localhost:6379`

---

### Option B: Running Standalone Locally

#### 1. Backend Setup

```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt

# Run migrations and seed sample workspace (3 projects, 40 tasks)
python -m app.seed

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```

#### 2. Celery Worker (Optional if Redis is running)

```bash
cd backend
celery -A app.worker.celery_app.celery_app worker --loglevel=info --pool=solo --without-gossip --without-mingle --without-heartbeat
```

*Note: If Celery or Redis is not running locally, the backend gracefully executes background jobs using FastAPI's asynchronous background task runner and in-memory cache fallback.*

#### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 👤 Demo Accounts

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@taskpulse.io` | `password123` | Delete projects, full workspace administration |
| **Manager** | `manager@taskpulse.io` | `password123` | Create tasks, trigger reports, bulk rollover |
| **Member** | `member@taskpulse.io` | `password123` | Move and edit own assigned tasks |

*Tip: You can also click **"Explore as Demo Manager"** directly on the login screen.*

---

## 📡 Core API Endpoints

### Authentication & RBAC
* `POST /api/auth/demo-login` — 1-click login for Demo Manager / Admin / Member
* `POST /api/auth/login` — Standard email & password authentication
* `POST /api/auth/refresh` — Silent token refresh
* `GET  /api/auth/me` — Current user profile and role

### Projects & Caching
* `GET    /api/projects` — List projects with task counts
* `POST   /api/projects` — Create project (`ADMIN` or `MANAGER`)
* `GET    /api/projects/{id}/analytics` — Redis cache-aside analytics (`X-Cache: HIT | MISS`)
* `DELETE /api/projects/{id}/cache` — Manually invalidate Redis cache

### Tasks & Optimistic Mutations
* `GET    /api/projects/{id}/tasks` — Paginated tasks with status, priority, and search filters
* `POST   /api/projects/{id}/tasks` — Create task (invalidates cache)
* `PATCH  /api/tasks/{id}` — Update task status or priority (invalidates cache)
* `DELETE /api/tasks/{id}` — Delete task (`ADMIN` or `MANAGER`)

### Background Jobs
* `POST /api/projects/{id}/reports` — Trigger async Celery sprint report (returns `202 Accepted`)
* `POST /api/projects/{id}/bulk-rollover` — Bulk archive / sprint rollover job
* `GET  /api/jobs/{id}` — Job status and progress percentage (`0-100%`)

---

## ☁️ $0/Month Free-Tier Deployment

* **Frontend:** Vercel Hobby Plan (deploys from `/frontend`)
* **Backend + Celery:** Render Free Web Service (runs `backend/start.sh`)
* **Database:** Neon Serverless PostgreSQL Free Tier (1 GB)
* **Redis Broker:** Upstash Redis Free Tier (500k commands/month)

