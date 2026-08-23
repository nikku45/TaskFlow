# TaskFlow — Technical Decisions (ADR Log)

Each entry follows: Context → Decision → Reason → Alternatives Considered → Trade-offs. Fill in the "Decision" line for the choice you actually implement — both options satisfy the assignment brief, which explicitly permits either.

---

## ADR-01: Express vs Fastify

- **Context**: assignment allows either. Need a mature, well-documented HTTP framework with strong middleware ecosystem for auth/rate-limiting/validation.
- **Decision**: _Express_ (swap to Fastify if preferred — both are compliant).
- **Reason**: Larger ecosystem of battle-tested middleware (rate limiters, Swagger UI integration, auth libraries); most contributors are already familiar with its middleware model, which maps cleanly onto the Route → Controller → Service layering.
- **Alternatives considered**: Fastify (faster raw throughput, built-in schema validation) — a fully valid alternative per the assignment.
- **Trade-offs**: Fastify would give better out-of-the-box JSON-schema validation and slightly better performance; Express gives broader familiarity and a larger set of drop-in middleware for the specific cross-cutting concerns this assignment needs (rate limiting, error handling, auth).

## ADR-02: TypeScript

- **Context**: assignment specifies Node.js, doesn't mandate TypeScript.
- **Decision**: TypeScript.
- **Reason**: Compile-time safety for the layered architecture (Controller/Service/Repository contracts), and the assignment explicitly asks for Zod validation, which pairs naturally with TS-inferred types.
- **Alternatives considered**: Plain JavaScript — faster to start, no build step, but loses type safety across service/repository boundaries.
- **Trade-offs**: extra build tooling (tsconfig, ts-node/tsx) vs. materially fewer runtime type bugs in a multi-layer codebase.

## ADR-03: ORM Choice (Prisma / TypeORM / Drizzle)

- **Context**: assignment allows any of Prisma, TypeORM, Drizzle (or SQLAlchemy for a Python supporting service).
- **Decision**: _Prisma_.
- **Reason**: First-class migration tooling (`prisma migrate`) satisfies the "migration files, no manual schema.sql" requirement out of the box; generated client gives type-safe, parameterized queries by default (mitigating SQL injection risk, `SECURITY.md` §A.10); schema-as-code (`schema.prisma`) doubles as living documentation of `DATABASE.md`.
- **Alternatives considered**: TypeORM (more flexible/older, decorator-based, migration DX less opinionated); Drizzle (lighter, SQL-like, excellent type inference, younger migration tooling at time of writing).
- **Trade-offs**: Prisma's generated client adds a build step and some abstraction over raw SQL; Drizzle would give closer-to-SQL control at the cost of more hand-written query code for complex filters (status/priority/assignee/date-range combinations).

## ADR-04: PostgreSQL Schema Design (org_id placement)

- **Context**: tenant isolation needs to be enforced consistently across `projects`, `tasks`, `task_assignments`, `comments`.
- **Decision**: `org_id` lives directly on `organizations`-owned tables (`org_members`, `projects`) but is **not duplicated** onto `tasks`/`task_assignments`/`comments` — those reach their org transitively via `project_id`/`task_id` joins.
- **Reason**: avoids data-integrity risk of a denormalized `org_id` column on `tasks` going out of sync with its parent project's `org_id`; a single join keeps every tenant check correct by construction.
- **Alternatives considered**: denormalizing `org_id` onto every table for simpler/faster filtering.
- **Trade-offs**: denormalization would save a join on hot-path queries but introduces a class of bugs where `task.org_id` and `task.project.org_id` could theoretically diverge if not updated together — an unacceptable risk for a system whose core evaluation criterion is tenant isolation.

## ADR-05: JWT Strategy

- **Context**: need access + refresh tokens with the assignment's exact TTLs.
- **Decision**: two separately-signed JWTs (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`), access token 15 min, refresh token 7 days, refresh token also persisted (hashed) in Postgres for revocation.
- **Reason**: a pure-stateless refresh JWT can't be revoked before its natural expiry; persisting a hash gives revocation/logout support, which the assignment explicitly requires ("store refresh tokens in DB with revocation support").
- **Alternatives considered**: single long-lived token with no refresh flow (rejected — assignment mandates both TTLs and revocation); storing refresh tokens in Redis instead of Postgres (viable, but Postgres keeps a single durable source of truth and simpler backup story for a system already centered on Postgres).
- **Trade-offs**: an extra DB round-trip on every refresh call, in exchange for real revocation.

## ADR-06: Refresh-Token Strategy (Rotation)

- **Context**: bonus requirement — refresh token rotation.
- **Decision**: rotate on every `/auth/refresh` call — issue a new refresh token, revoke the old one.
- **Reason**: limits a stolen refresh token's usefulness to a single exchange; a reused, already-rotated token is a strong signal of theft and can trigger revoking the whole token family (optional hardening).
- **Alternatives considered**: static refresh token until expiry (simpler, but a leaked token remains valid for up to 7 days).
- **Trade-offs**: slightly more complex client-side token handling (must always store the newest refresh token) for materially better theft containment.

## ADR-07: RBAC Strategy

- **Context**: two roles (`org_admin`, `member`), enforcement needs to be testable and consistent.
- **Decision**: role checks live in the **service layer** as explicit guard clauses (e.g. `assertOrgAdmin(caller)`), not in route middleware alone.
- **Reason**: keeps authorization logic unit-testable without spinning up HTTP, and keeps a single source of truth per action rather than scattering role checks across routes and services.
- **Alternatives considered**: policy/middleware-only RBAC (e.g. route-level `requireRole('org_admin')` middleware) — simpler for uniform per-route rules, but doesn't compose well when a rule depends on resource state (e.g. "only the assigning org's admin").
- **Trade-offs**: slightly more boilerplate per service method vs. a single declarative middleware list.

## ADR-08: Multi-Tenant Isolation Strategy

- **Context**: shared database vs. schema-per-tenant vs. database-per-tenant.
- **Decision**: single shared database/schema, logical isolation via mandatory `org_id`-scoped queries (see `ARCHITECTURE.md` §14).
- **Reason**: schema/database-per-tenant would add significant operational complexity (migrations × N tenants, connection pooling per tenant) disproportionate to this assignment's scope, and the assignment's own evaluation focus ("strong multi-tenant isolation") is about *access control correctness*, not physical partitioning.
- **Alternatives considered**: PostgreSQL Row-Level Security (RLS) policies as a defense-in-depth layer on top of application-level filtering.
- **Trade-offs**: shared-schema isolation depends entirely on disciplined application code (mitigated by centralizing all org-scoped queries in the repository layer and covering them with cross-tenant integration tests); RLS would add a second enforcement layer at the cost of additional Postgres configuration complexity — noted as a good future hardening step, not implemented for this assignment.

## ADR-09: BullMQ Architecture

- **Context**: async email notification with retries/backoff/DLQ.
- **Decision**: single `email-notifications` queue, worker as a separate process/container, `attempts: 3`, exponential backoff starting at 1000ms.
- **Reason**: matches the assignment's exact retry/backoff/DLQ spec; separating the worker process lets it scale independently of the API and ensures API latency is unaffected by email-processing load.
- **Alternatives considered**: in-process job processing (setTimeout-based) — rejected, doesn't survive process restarts and doesn't meet the "Redis + BullMQ" requirement.
- **Trade-offs**: an extra running service (operational overhead) in exchange for real durability and horizontal scalability of job processing.

## ADR-10: Queue Failure Consistency Strategy

- **Context**: assignment must persist even if enqueueing the notification job fails.
- **Decision**: commit the assignment regardless of enqueue outcome; mark `notification_status = 'enqueue_failed'` on failure; reconcile via a scheduled sweep/replay.
- **Reason**: detailed in `ARCHITECTURE.md` §16 — prioritizes not losing a valid assignment over guaranteeing synchronous notification delivery, since the assignment itself is the primary domain fact and email is a best-effort side effect.
- **Alternatives considered**: (a) roll back the assignment if enqueueing fails — rejected, turns a transient Redis blip into a lost assignment; (b) synchronous email send inline — rejected, directly violates "must not block the API request"; (c) true two-phase commit / transactional outbox with a separate outbox table polled by a relay — a more robust production pattern, noted as a future improvement.
- **Trade-offs**: the chosen approach can have a small window where a notification is delayed until the reconciliation sweep runs, in exchange for simplicity and zero risk of losing the assignment itself.

## ADR-11: Pagination Approach

- **Context**: assignment allows offset OR cursor pagination, with two different specified response shapes.
- **Decision**: offset pagination — `{ data, total, page, limit }`.
- **Reason**: task/project lists in this assignment are modest in size (tens to low-hundreds of rows per org), where offset pagination's simplicity and "jump to page N" UX outweigh cursor pagination's benefits, which matter most at very large scale.
- **Alternatives considered**: cursor pagination (`{ data, next_cursor }`) — better for large, frequently-mutated lists, avoids the "page drift" problem when rows are inserted/deleted between requests.
- **Trade-offs**: offset pagination can show minor duplication/skipping under concurrent writes at page boundaries; acceptable for this system's scale and explicitly permitted by the assignment.

## ADR-12: Testing Strategy

- **Context**: need both unit and integration coverage with reliable isolation.
- **Decision**: Vitest (or Jest) + Supertest, dedicated test Postgres database, per-test transactional rollback where the ORM supports it (Prisma via `prisma-test-environment` pattern or manual transaction wrapping), otherwise truncate-between-tests.
- **Reason**: fast unit tests for pure logic, realistic integration tests against real Postgres/Redis catch issues mocks would hide (e.g. actual FK/CASCADE behavior, actual enum constraints).
- **Alternatives considered**: fully mocked repository layer for all tests — rejected as the sole strategy because it can't validate the actual SQL-level tenant-isolation joins, which is this assignment's central risk area.
- **Trade-offs**: integration tests are slower and require Docker services running; mitigated by keeping the unit-test suite fast and reserving integration tests for the flows that matter most (auth, cross-tenant, CRUD).

## ADR-13: Docker Compose Architecture

- **Context**: assignment requires API, Worker, PostgreSQL, Redis all started via Docker Compose.
- **Decision**: one Dockerfile (multi-stage build), two services (`api`, `worker`) built from the same image with different `command:` overrides, plus `postgres` and `redis` services with healthchecks and `depends_on: condition: service_healthy`.
- **Reason**: single image avoids drift between API and worker dependencies/build steps; healthcheck-gated startup avoids the classic "API crashes because Postgres isn't ready yet" race condition.
- **Alternatives considered**: separate Dockerfiles per service — more isolation, more duplication to keep in sync.
- **Trade-offs**: a shared image is marginally larger than two narrowly-scoped images, in exchange for guaranteed dependency parity between API and worker.
