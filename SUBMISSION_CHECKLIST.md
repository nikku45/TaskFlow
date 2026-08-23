# TaskFlow — Final Submission Checklist

Legend: **Impl** = implementation, **Doc** = documentation, **Test** = automated test, **Demo** = shown in screen recording. Check off each cell as you complete it.

## Task 01 — Data Modeling & Database

| Requirement | Impl | Doc | Test | Demo |
|---|---|---|---|---|
| Tables: users, organizations, org_members, projects, tasks, task_assignments, comments | ☐ | `DATABASE.md` §3 | ☐ | ☐ |
| Projects reference organizations | ☐ | `DATABASE.md` §3.4 | ☐ | |
| Tasks reference projects | ☐ | `DATABASE.md` §3.5 | ☐ | |
| task_assignments references task + user | ☐ | `DATABASE.md` §3.6 | ☐ | |
| comments references task + user (author) | ☐ | `DATABASE.md` §3.7 | ☐ | |
| Documented CASCADE/RESTRICT decisions | ☐ | `DATABASE.md` §4 | | |
| Enums: status (todo/in_progress/review/done), priority (low/medium/high/urgent) | ☐ | `DATABASE.md` §2 | ☐ | |
| Indexes justified | ☐ | `DATABASE.md` §5 | | |
| Migration files (no manual schema.sql) | ☐ | `DATABASE.md` §8, `README.md` | | ☐ |
| Seed data (2 orgs, 5 users, multiple projects, 10+ tasks, assignments, comments) | ☐ | `DATABASE.md` §9 | | ☐ |
| ★ Bonus: soft delete (`deleted_at`) | ☐ | `DATABASE.md` §10 | ☐ | |
| ★ Bonus: full-text search on title+description | ☐ | `DATABASE.md` §10 | ☐ | |

## Task 02 — Authentication & Authorization

| Requirement | Impl | Doc | Test | Demo |
|---|---|---|---|---|
| POST /auth/register, /login, /refresh, /logout | ☐ | `API.md`, `openapi.yaml` | ☐ | ☐ |
| bcrypt cost ≥ 12 | ☐ | `SECURITY.md` §A.1 | ☐ | |
| JWT access 15m / refresh 7d | ☐ | `SECURITY.md` §A.2–A.3 | ☐ | ☐ |
| Refresh tokens stored + revocable | ☐ | `DATABASE.md` §3.8, `SECURITY.md` §A.4 | ☐ | |
| Roles: org_admin, member | ☐ | `ARCHITECTURE.md` §13 | ☐ | ☐ |
| Admins manage members & delete projects | ☐ | `API.md` (Projects) | ☐ | ☐ |
| JWT middleware attaches user + org context | ☐ | `ARCHITECTURE.md` §12 | ☐ | ☐ |
| Service-layer queries scoped by org_id | ☐ | `ARCHITECTURE.md` §14 | ☐ | |
| Client-provided org_id never trusted | ☐ | `ARCHITECTURE.md` §14 | ☐ | |
| Cross-tenant access → 403, no data leak | ☐ | `ARCHITECTURE.md` §14, `SECURITY.md` §A.8 | ☐ | ☐ |
| Auth endpoints rate-limited 10/min/IP | ☐ | `SECURITY.md` §A.6 | ☐ | |
| Bonus: refresh token rotation | ☐ | `DECISIONS.md` ADR-06 | ☐ | |
| Bonus: logout all devices | ☐ | | ☐ | |

## Task 03 — REST API: Projects & Tasks

| Requirement | Impl | Doc | Test | Demo |
|---|---|---|---|---|
| Route → Controller → Service → Data separation | ☐ | `ARCHITECTURE.md` §7 | | ☐ |
| Full CRUD: projects | ☐ | `API.md` (Projects) | ☐ | ☐ |
| Full CRUD: tasks | ☐ | `API.md` (Tasks) | ☐ | ☐ |
| Projects scoped to caller's org | ☐ | `ARCHITECTURE.md` §14 | ☐ | |
| Tasks scoped to project within caller's org | ☐ | `ARCHITECTURE.md` §14 | ☐ | |
| Filters: status, priority, assignee, due-date range | ☐ | `API.md` (Tasks) | ☐ | ☐ |
| Pagination (offset or cursor, mandated shape) | ☐ | `API.md` | ☐ | ☐ |
| Zod validation | ☐ | `ARCHITECTURE.md` §18 | ☐ | |
| Consistent error format `{error, code, details}` | ☐ | `API.md` | ☐ | |
| Assign/unassign endpoints | ☐ | `API.md` (Assignments) | ☐ | ☐ |
| Assigned user must be same org as task | ☐ | `API.md` (Assignments) | ☐ | ☐ |
| Project dashboard — counts by status | ☐ | `API.md` (Projects) | ☐ | |
| Bonus: bulk task status update | ☐ | | ☐ | |
| Bonus: full-text task search | ☐ | | ☐ | |

## Task 04 — Background Jobs & Email Notifications

| Requirement | Impl | Doc | Test | Demo |
|---|---|---|---|---|
| Redis + BullMQ | ☐ | `ARCHITECTURE.md` §11 | | ☐ |
| Assignment persists + enqueues before responding, non-blocking | ☐ | `ARCHITECTURE.md` §15–16 | ☐ | ☐ |
| Consistency strategy documented for enqueue failure | ☐ | `ARCHITECTURE.md` §16, `DECISIONS.md` ADR-10 | | |
| Worker processes email jobs (mock OK) | ☐ | `ARCHITECTURE.md` §9 | ☐ | ☐ |
| Retry 3× with backoff 1s/2s/4s | ☐ | `ARCHITECTURE.md` §9 | ☐ | |
| Dead-letter queue after exhausted retries, status "failed" | ☐ | `ARCHITECTURE.md` §9 | ☐ | |
| GET /jobs/:id with pending/active/completed/failed | ☐ | `API.md` (Jobs), `openapi.yaml` | ☐ | ☐ |
| Docker Compose: API + Worker + Postgres + Redis | ☐ | `README.md`, `ARCHITECTURE.md` §20 | | ☐ |
| Bonus: dedupe assignments within 5s | ☐ | | ☐ | |
| Bonus: global email rate limit 50/min | ☐ | `SECURITY.md` §B | ☐ | |

## Task 05 — Testing & API Documentation

| Requirement | Impl | Doc | Test | Demo |
|---|---|---|---|---|
| Unit: auth logic | | `TESTING.md` §2 | ☐ | |
| Unit: task assignment validation | | `TESTING.md` §2 | ☐ | |
| Unit: pagination helper | | `TESTING.md` §2 | ☐ | |
| Integration: login flow | | `TESTING.md` §3 | ☐ | |
| Integration: task CRUD | | `TESTING.md` §3 | ☐ | |
| Integration: cross-tenant access → 403 | | `TESTING.md` §3 | ☐ | ☐ |
| Integration: validation/error scenarios | | `TESTING.md` §3 | ☐ | |
| Test isolation (transactions/dedicated DB) | | `TESTING.md` §4 | | |
| OpenAPI/Swagger, Swagger UI accessible locally | ☐ | `openapi.yaml`, `README.md` | | ☐ |
| Postman/Bruno collection, imports without manual edits | ☐ | `API_COLLECTION.md`, `postman_collection.json` | | ☐ |
| Bonus: coverage report | ☐ | `TESTING.md` §6 | ☐ | |
| Bonus: test that assignment creates a queue job | | `TESTING.md` §3 | ☐ | |

## Submission Guidelines (from PDF "Submission Guidelines" section)

| Requirement | Status | Notes |
|---|---|---|
| 1. Public GitHub repository, clean code + README.md | ☐ | `README.md` provided |
| 2. Architecture Document | ☐ | `ARCHITECTURE.md` provided |
| 3. API Documentation (Swagger/OpenAPI preferred) | ☐ | `API.md` + `openapi.yaml` provided |
| 4. Screen recording & demo | ☐ | Script ready: `DEMO_SCRIPT.md` — record and link |
| 5. Setup instructions incl. required env vars | ☐ | `README.md` + `.env.example` provided |
| 6. No committed secrets/credentials | ☐ | `.env.example` only, `.env` git-ignored |
| 7. Share all links/documents in one place | ☐ | Compile final links (repo, video, any hosted docs) into one submission note |

## Evaluation Focus Cross-Check (from PDF)

| Evaluation Criterion | Where addressed |
|---|---|
| Clean architecture and naming | `ARCHITECTURE.md` §7, actual repo structure |
| Correct authentication & authorization | `SECURITY.md` §A.1–A.7, `ARCHITECTURE.md` §12–13 |
| Strong multi-tenant isolation | `ARCHITECTURE.md` §14, `SECURITY.md` §A.8, `TESTING.md` §3 |
| Reliable background jobs/retries | `ARCHITECTURE.md` §9, §16 |
| Normalized database and indexes | `DATABASE.md` §3–5 |
| Meaningful tests | `TESTING.md` |
| Working Docker setup | `ARCHITECTURE.md` §20, `README.md` |
| Clear README and technical decisions | `README.md`, `DECISIONS.md` |
