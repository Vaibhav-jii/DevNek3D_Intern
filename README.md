# ⚡ DevNek3D — Scalable REST API with Auth, RBAC & Task Management

A production-ready full-stack application built as a Backend Developer Intern assignment.

---

## 🗂️ Project Structure

```
DevNek3D/
├── backend/
│   ├── src/
│   │   ├── controllers/    auth.controller.js, task.controller.js
│   │   ├── routes/         auth.routes.js, task.routes.js
│   │   ├── middleware/     auth.middleware.js, error.middleware.js, validate.middleware.js
│   │   ├── validators/     auth.validator.js, task.validator.js
│   │   ├── config/         prisma.js, logger.js
│   │   └── utils/          jwt.utils.js, response.utils.js
│   ├── prisma/
│   │   └── schema.prisma
│   ├── server.js
│   ├── swagger.js
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/          Login.jsx, Register.jsx, Dashboard.jsx
│   │   ├── components/     ProtectedRoute.jsx
│   │   ├── api/            axios.js
│   │   └── context/        AuthContext.jsx
│   ├── App.jsx
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ running locally

### 1. Clone & install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure environment

```bash
cd backend
cp .env.example .env
# Edit .env — set DATABASE_URL and JWT secrets
```

### 3. Set up the database

```bash
cd backend
npx prisma db push        # Push schema to DB (dev)
# OR
npm run db:migrate        # Create a proper migration
```

### 4. Run both servers

```bash
# Terminal 1 — Backend (http://localhost:5000)
cd backend && npm run dev

# Terminal 2 — Frontend (http://localhost:5173)
cd frontend && npm run dev
```

### 5. View API docs

Open → **http://localhost:5000/api-docs**

---

## 🐳 Docker (Full Stack)

```bash
# Set secrets in your shell or a root .env
export JWT_ACCESS_SECRET=your_secret_here
export JWT_REFRESH_SECRET=your_refresh_secret_here

docker-compose up --build
```

Services:
| Service   | Port  | URL                        |
|-----------|-------|----------------------------|
| Backend   | 5000  | http://localhost:5000      |
| Frontend  | 5173  | http://localhost:5173      |
| Postgres  | 5432  | localhost:5432             |
| API Docs  | 5000  | http://localhost:5000/api-docs |

---

## 🔑 Environment Variables

| Variable               | Description                         | Default          |
|------------------------|-------------------------------------|------------------|
| `PORT`                 | Backend port                        | `5000`           |
| `DATABASE_URL`         | PostgreSQL connection string        | —                |
| `JWT_ACCESS_SECRET`    | Secret for access tokens (32+ chars)| —                |
| `JWT_REFRESH_SECRET`   | Secret for refresh tokens (32+ chars)| —               |
| `JWT_ACCESS_EXPIRES_IN`| Access token TTL                    | `15m`            |
| `JWT_REFRESH_EXPIRES_IN`| Refresh token TTL                  | `7d`             |
| `FRONTEND_URL`         | CORS allowed origin                 | `http://localhost:5173` |

---

## 📡 API Reference

### Auth — `/api/v1/auth`

| Method | Route       | Auth | Description              |
|--------|-------------|------|--------------------------|
| POST   | /register   | —    | Register new user        |
| POST   | /login      | —    | Login → access + refresh |
| POST   | /refresh    | —    | Rotate tokens via cookie |
| POST   | /logout     | ✅   | Invalidate refresh token |
| GET    | /me         | ✅   | Get current user         |

### Tasks — `/api/v1/tasks`

| Method | Route       | Auth | RBAC               | Description           |
|--------|-------------|------|--------------------|-----------------------|
| GET    | /stats      | ✅   | User/Admin         | Task counts by status |
| GET    | /           | ✅   | User → own, Admin → all | Paginated list  |
| POST   | /           | ✅   | Any                | Create task           |
| GET    | /:id        | ✅   | Owner or Admin     | Get single task       |
| PUT    | /:id        | ✅   | Owner or Admin     | Update task           |
| DELETE | /:id        | ✅   | Owner or Admin     | Delete task           |

### Query params (GET /tasks)
- `status` — filter by `PENDING | IN_PROGRESS | COMPLETED | CANCELLED`
- `page` — page number (default: 1)
- `limit` — items per page (default: 10)

---

## 🔒 Security Implementation

- **JWT Strategy**: Short-lived access tokens (15m) in memory/`sessionStorage`, long-lived refresh tokens (7d) in `httpOnly` cookies only
- **Token rotation**: Every `/refresh` call issues new access + refresh token pair
- **Refresh tokens hashed**: Stored as bcrypt hash in DB — raw token never persisted
- **Password hashing**: `bcryptjs` with salt rounds = 12
- **Rate limiting**: 20 req/15min on auth routes, 100 req/15min globally
- **Helmet**: HTTP security headers
- **CORS**: Configured for specific frontend origin only
- **Input validation**: `express-validator` on all routes with consistent 422 error format

---

## 📈 Scalability Architecture

### Microservices Split

The monolith can be split into:

```
auth-service     → handles /auth/*, users table, JWT issuance
task-service     → handles /tasks/*, tasks table
api-gateway      → nginx/Kong — routes, rate limits, auth header forwarding
```

Each service communicates via HTTP/gRPC internally. The api-gateway validates tokens by calling `auth-service/validate` before forwarding to task-service.

### Redis Caching Strategy

```
GET /tasks → check Redis key "tasks:{userId}:{page}:{status}"
  HIT  → return cached JSON (TTL: 60s)
  MISS → query Postgres → store in Redis → return

Invalidation: on POST/PUT/DELETE /tasks, del "tasks:{userId}:*"
For ADMIN: del "tasks:*" (or use tagging with ioredis)
```

### Horizontal Scaling with Nginx

```nginx
upstream backend_pool {
    least_conn;
    server backend1:5000;
    server backend2:5000;
    server backend3:5000;
}
```

Stateless JWT means any instance can validate tokens — no sticky sessions needed. Use a shared Postgres primary + read replicas for heavy GET workloads.

### Docker + Compose Production Tips

- Use `postgres:16` with volume mounts for persistence
- Backend: `NODE_ENV=production` disables verbose Prisma logging
- Add `HEALTHCHECK` to backend container
- Use Docker secrets (not env vars) for JWT secrets in Swarm mode

---

## 🗃️ Database Schema

```sql
-- Users
CREATE TABLE "User" (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  email        TEXT UNIQUE NOT NULL,
  password     TEXT NOT NULL,           -- bcrypt hash
  role         ENUM('USER','ADMIN') DEFAULT 'USER',
  refreshToken TEXT,                    -- bcrypt hash of token
  createdAt    TIMESTAMP DEFAULT NOW(),
  updatedAt    TIMESTAMP
);

-- Tasks
CREATE TABLE "Task" (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  status      ENUM('PENDING','IN_PROGRESS','COMPLETED','CANCELLED') DEFAULT 'PENDING',
  userId      UUID REFERENCES "User"(id) ON DELETE CASCADE,
  createdAt   TIMESTAMP DEFAULT NOW(),
  updatedAt   TIMESTAMP
);
```

---

## ✅ Deliverables Checklist

- [x] All backend routes — auth + task CRUD + stats
- [x] JWT access + refresh token rotation with httpOnly cookies
- [x] RBAC: USER sees own tasks, ADMIN sees all
- [x] Prisma ORM with PostgreSQL
- [x] Input validation on all endpoints (express-validator)
- [x] Global error handler with consistent JSON format
- [x] Swagger UI at `/api-docs`
- [x] Winston logging to console + file
- [x] Rate limiting on auth routes (20/15min)
- [x] Helmet + CORS security
- [x] Frontend: Login, Register, Dashboard pages
- [x] Axios with JWT injection + silent refresh + 401 redirect
- [x] AuthContext with sessionStorage (not localStorage)
- [x] Task CRUD UI with filter, pagination, modals
- [x] Password strength meter on Register
- [x] React Hot Toast notifications
- [x] `.env.example` with all keys
- [x] `docker-compose.yml` with Postgres + backend + frontend
- [x] Scalability note in README
