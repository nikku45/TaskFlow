# TaskFlow — Testing Documentation

## 1. Testing Strategy

Two layers, matching the assignment's explicit split:

- **Unit tests** — pure logic, no network/DB/Redis, fast, run on every commit.
- **Integration tests** — exercise the real HTTP layer against a dedicated Dockerized PostgreSQL + Redis test environment via Supertest.

## 2. Unit Tests (assignment-required)

| Area | What's covered |
|---|---|
| Authentication logic | Password hashing/verification, JWT issuance/verification, token expiry handling, refresh-token hash comparison |
| Task assignment validation | Same-org check for target user, duplicate-assignment rejection, missing-user handling — tested against mocked repositories, not a live DB |
| Pagination helper | `page`/`limit` → SQL offset/limit conversion, boundary values (page=0, negative limit, limit above max), response shape (`data`, `total`, `page`, `limit`) |

## 3. Integration Tests (assignment-required)

| Area | What's covered |
|---|---|
| Login flow | Register → login → receive valid access/refresh tokens → use access token on a protected route |
| Task CRUD | Create/read/update/delete task within the caller's project/org, including empty-list and not-found paths |
| Cross-tenant access attempt | A user from Org B calling `GET /projects/:id`, `GET /tasks/:id`, and `POST /tasks/:id/assign` against Org A's resources — **must return 403**, with a response body containing no Org A data |
| Validation/error scenarios | Missing required fields, invalid enum values (bad `status`/`priority`), malformed UUIDs — all expect `400 VALIDATION_ERROR` with the mandated error shape |
| Auth rate limiting | 11th request within a minute to `/auth/login` returns `429 RATE_LIMITED` |
| Assignment authorization | Assigning a user from a different org to a task returns `403`/`400`, not `201` |

### Additional bonus-aligned tests (optional)

- Queue/job tests: assert that `POST /tasks/:id/assign` enqueues a BullMQ job (job exists in the queue with the expected payload) — the assignment's explicit bonus ("Test that task assignment creates a queue job").
- Retry/backoff test: force a worker failure and assert the job is retried up to 3 times before landing in the dead-letter queue.

## 4. Test Database / Isolation Strategy

Per the assignment ("clean state through transactions, dedicated test DB, or another reliable isolation strategy"), TaskFlow uses:

- A **dedicated test database** (`TEST_DATABASE_URL`, e.g. `taskflow_test`), separate from the dev database, spun up by the same `docker-compose` Postgres service or a `docker-compose.test.yml` override.
- Migrations applied once before the suite runs.
- **Per-test isolation** via one of:
  - Wrapping each test in a database transaction that is rolled back afterward, or
  - Truncating all tables between tests (`TRUNCATE ... RESTART IDENTITY CASCADE`).
- A **separate Redis database index** (or a flushed test Redis instance) for queue-related integration tests, so job state doesn't leak between tests.

## 5. How to Run Tests

```bash
# All tests
npm test

# Unit only
npm run test:unit

# Integration only (requires test DB/Redis running — see docker-compose.test.yml or docker compose up -d postgres redis)
npm run test:integration

# Watch mode
npm run test:watch

# Coverage report (bonus)
npm run test:coverage
```

## 6. Coverage Strategy (bonus)

- Coverage collected via the test runner's built-in instrumentation (e.g. Vitest `--coverage` / Jest `--coverage`).
- Report output to `coverage/` (git-ignored) and summarized in CI logs; HTML report locally at `coverage/index.html`.
- Priority coverage targets: services (business logic + authorization), repository-layer org-scoping filters, and the pagination/validation helpers — these are where correctness matters most for the assignment's evaluation criteria.

## 7. Requirement-to-Test Mapping

| Assignment Requirement | Test(s) |
|---|---|
| Login flow | `tests/integration/auth.login.test.ts` |
| Task CRUD | `tests/integration/tasks.crud.test.ts` |
| Cross-tenant access → 403 | `tests/integration/security.cross-tenant.test.ts` |
| Validation/error scenarios | `tests/integration/validation.test.ts` |
| Auth logic (unit) | `tests/unit/auth.test.ts` |
| Task assignment validation (unit) | `tests/unit/task-assignment.test.ts` |
| Pagination helper (unit) | `tests/unit/pagination.test.ts` |
| Rate limiting | `tests/integration/auth.rate-limit.test.ts` |
| Queue job creation on assignment (bonus) | `tests/integration/jobs.enqueue.test.ts` |
| Retry/backoff/DLQ (bonus) | `tests/integration/jobs.retry.test.ts` |
