# TaskFlow

A multi-tenant backend for a lightweight project management system: organizations, projects, tasks, assignments, and asynchronous email notifications — built for the TaskFlow Backend Developer Technical Assignment.

## Description

Users register into an organization, create projects, manage tasks with status/priority workflows, assign tasks to teammates, and receive background email notifications on assignment. The system enforces strict organization-level (multi-tenant) data isolation and organization-scoped RBAC (`org_admin`, `member`).

## Features

- JWT authentication (15-min access / 7-day refresh) with bcrypt (cost ≥ 12) password hashing
- Organization-scoped RBAC: `org_admin`, `member`
- Full CRUD for projects and tasks, strictly scoped to the caller's organization
- Task filtering by status, priority, assignee, and due-date range, with pagination
- Task assignment/unassignment with same-organization validation
- Project dashboard: task counts grouped by status
- Asynchronous email notification on task assignment via Redis + BullMQ, with retries, exponential backoff, and a dead-letter queue
- `GET /jobs/:id` job status endpoint
- OpenAPI/Swagger documentation and a Postman collection
- Automated unit + integration tests, including cross-tenant access tests
- Full Docker Compose setup (API, Worker, PostgreSQL, Redis)

> Bonus features implemented:
> - [x] Coverage report (`npm run test:coverage`)
> - [x] Queue-job creation test

## Technology Stack

Node.js 20 + TypeScript, Express, PostgreSQL 16, Prisma, Redis 7 + BullMQ, Zod, Docker Compose. See `ARCHITECTURE.md` and `DECISIONS.md` for the full rationale.

## Architecture Overview

Route → Controller → Service → Repository layering, with a separate Worker process consuming BullMQ jobs.

```
Client → API (Express) → PostgreSQL
               ↓
            Redis (BullMQ) → Worker → Mock Email
```

## Project Structure

```
taskflow/
├── src/
│   ├── config/
│   │   ├── env.ts              # Zod-validated environment variables
│   │   └── logger.ts           # Pino logger instance
│   ├── common/
│   │   ├── errors.ts           # AppError hierarchy
│   │   ├── asyncHandler.ts     # Async route wrapper
│   │   └── pagination.ts       # Pagination helpers
│   ├── database/
│   │   └── prisma.ts           # Shared PrismaClient instance
│   ├── middleware/
│   │   ├── auth.middleware.ts       # JWT verification
│   │   ├── orgContext.middleware.ts  # Multi-tenant org context
│   │   ├── rbac.middleware.ts       # Role-based access control
│   │   ├── rateLimit.middleware.ts  # Redis-backed rate limiting
│   │   └── errorHandler.middleware.ts # Centralized error handler
│   ├── modules/
│   │   ├── auth/               # Register, login, refresh, logout
│   │   ├── projects/           # Project CRUD + dashboard
│   │   ├── tasks/              # Task CRUD, filters, assignments
│   │   └── jobs/               # BullMQ job status endpoint
│   ├── queues/
│   │   ├── connection.ts       # Shared ioredis connection
│   │   └── email.queue.ts      # Email notification queue
│   ├── workers/
│   │   ├── email.worker.ts     # Worker process entrypoint
│   │   └── mockEmailService.ts # Mock email provider
│   ├── app.ts                  # Express app configuration
│   └── server.ts               # API process entrypoint
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── tests/
│   ├── setup/                  # Test infrastructure
│   ├── unit/                   # Unit tests
│   └── integration/            # Integration tests
├── docker-compose.yml
├── docker-compose.override.yml
├── Dockerfile
├── openapi.yaml
├── postman_collection.json
├── .env.example
└── README.md
```

## Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local, non-Docker development)
- npm

## Environment Variables

Copy `.env.example` to `.env` and fill in values. Never commit `.env`.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string used by Prisma |
| `REDIS_URL` | Redis connection string used by BullMQ |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Signing secrets for access/refresh JWTs |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | Token lifetimes (15m / 7d per assignment) |
| `BCRYPT_COST_FACTOR` | bcrypt work factor, must be ≥ 12 |
| `AUTH_RATE_LIMIT_WINDOW_MS` / `AUTH_RATE_LIMIT_MAX` | Auth endpoint rate limiting (10/min/IP per assignment) |
| `EMAIL_QUEUE_NAME` / `EMAIL_QUEUE_DLQ_NAME` | BullMQ queue names for notifications and dead-letter |
| `JOB_RETRY_ATTEMPTS` / `JOB_BACKOFF_BASE_MS` | Retry policy (3 attempts, 1s/2s/4s backoff) |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins |
| `LOG_LEVEL` | Logging verbosity |
| `TEST_DATABASE_URL` | Isolated database used only by the test suite |

## Docker Setup (recommended)

```bash
cp .env.example .env
docker compose up --build
```

This starts four services: `api`, `worker`, `postgres`, `redis`. Migrations run automatically on API container startup.

## Local Development Setup (without full Docker)

```bash
npm install
cp .env.example .env   # point DATABASE_URL/REDIS_URL at local or docker-hosted services
npm run migrate:dev
npm run seed
npm run dev             # API with hot reload
npm run dev:worker      # Worker, in a second terminal
```

## Database Migrations

```bash
npm run migrate:dev       # create + apply a new migration (dev)
npm run migrate:deploy    # apply pending migrations (prod-like)
```

## Seed Data

```bash
npm run seed
```

Seeds 2 organizations, 5 users (with at least one `org_admin` each), multiple projects, 10+ tasks across all statuses/priorities, task assignments, and comments. Seeded credentials are printed to the console — for local testing only, never real credentials.

## Running the API Server

```bash
npm run dev        # local
docker compose up api   # docker
```

Default: `http://localhost:3000`

## Running the Worker

```bash
npm run dev:worker      # local
docker compose up worker   # docker
```

## Running Tests

```bash
npm test                 # unit + integration
npm run test:unit
npm run test:integration
npm run test:coverage    # coverage report
```

Integration tests run against `TEST_DATABASE_URL`, an isolated database, per `TESTING.md`.

## Swagger UI

Once the API is running:

```
http://localhost:3000/docs
```

Served from `openapi.yaml` via `swagger-ui-express`.

## Postman Collection

Import `postman_collection.json` into Postman. The collection is self-contained — no manual edits required beyond setting `baseUrl`.

## Example API Workflow

```bash
# 1. Register
curl -X POST localhost:3000/api/v1/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"alice@acme.com","password":"StrongPassw0rd!","fullName":"Alice","organizationName":"Acme"}'

# 2. Login
curl -X POST localhost:3000/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"alice@acme.com","password":"StrongPassw0rd!"}'

# 3. Create a project (Authorization: Bearer <accessToken>)
curl -X POST localhost:3000/api/v1/projects -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' -d '{"name":"Website Revamp"}'

# 4. Create a task, assign it, check job status
```

## Authentication Flow

Register → Login (receive 15-min access token + 7-day refresh token) → use access token on all protected routes → refresh before expiry → logout revokes the refresh token.

## Background Job Flow

Assigning a user to a task persists the assignment and enqueues an `email-notifications` BullMQ job in the same request — the API never waits on email sending. The worker processes the job, retrying up to 3 times with exponential backoff (1s/2s/4s) before routing to a dead-letter queue. Poll `GET /jobs/:id` for status.

## Security Notes

See `SECURITY.md` for the full write-up: bcrypt cost ≥ 12, short-lived JWTs, hashed+revocable refresh tokens, auth rate limiting, org-scoped queries everywhere, parameterized queries only (via Prisma), no secrets in source control, generic error responses.

## Multi-Tenancy Explanation

Every request's organization context comes from the verified JWT and a server-side `org_members` lookup — never from client-supplied `org_id`/body fields. All queries for org-owned resources are filtered by that server-derived org ID. Cross-tenant access attempts return `403 Forbidden` with no resource data.

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| API can't reach Postgres | Ensure `postgres` service is healthy (`docker compose ps`); check `DATABASE_URL` host matches the compose service name (`postgres`, not `localhost`, inside containers). |
| Worker not processing jobs | Confirm `REDIS_URL` matches between `api` and `worker` services; check worker logs for connection errors. |
| 401 on every request | Access token expired (15 min) — call `POST /auth/refresh`. |
| 403 on a resource you expect to own | You're likely using an ID from a different organization/seed user — re-check which org your logged-in user belongs to. |
| Migrations fail on startup | Ensure Postgres is fully healthy before the API starts (compose `depends_on: condition: service_healthy`); rerun `npm run migrate:deploy`. |
| Rate-limited (429) on auth endpoints | Expected after 10 requests/minute/IP — wait for the window to reset. |

## Documentation Index

| File | Contents |
|---|---|
| `ARCHITECTURE.md` | System architecture, diagrams, flows, rationale |
| `DATABASE.md` | Schema, ERD, indexes, migration/seed strategy |
| `API.md` | Human-readable endpoint reference |
| `openapi.yaml` | Machine-readable OpenAPI 3.0 spec (Swagger UI) |
| `postman_collection.json` | Postman collection |
| `TESTING.md` | Test strategy and requirement mapping |
| `SECURITY.md` | Security practices |
| `DECISIONS.md` | ADR log of key technical decisions |
