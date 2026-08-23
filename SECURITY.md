# TaskFlow — Security Documentation

## A. Mandatory Assignment Requirements

### A.1 Password Hashing

- All passwords hashed with **bcrypt, cost factor ≥ 12**, before storage. Plaintext passwords are never logged or persisted.

### A.2 JWT Access Token — 15 Minute TTL

- Access tokens are short-lived (15 minutes) to limit the blast radius of a leaked token. Signed with a dedicated `JWT_ACCESS_SECRET`, verified on every protected request.

### A.3 Refresh Token — 7 Day TTL

- Refresh tokens live for 7 days and are used only to mint new access tokens via `POST /auth/refresh`.

### A.4 Refresh Token Storage and Revocation

- Refresh tokens are stored **hashed** (not in plaintext) in the `refresh_tokens` table, with `expires_at` and a nullable `revoked_at`.
- `POST /auth/logout` sets `revoked_at`, immediately invalidating that token even though it hasn't expired.
- `POST /auth/refresh` checks both expiry and revocation before issuing a new access token.

### A.5 Refresh Token Rotation (bonus, if implemented)

- On each `POST /auth/refresh`, the old refresh token is revoked and a new one issued and returned, limiting the usefulness of a stolen refresh token to a single use.

### A.6 Authentication Rate Limiting

- `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` are rate-limited to **10 requests/minute/IP**, mandated by the assignment, implemented via Redis-backed middleware so the limit holds across multiple API replicas.

### A.7 Organization-Level RBAC

- Two roles: `org_admin`, `member`, scoped **per organization** (a user could theoretically hold different roles in different orgs, if multi-org membership is supported).
- Enforced in the service layer: `org_admin`-only actions (managing members, deleting projects) explicitly check `role === 'org_admin'` before proceeding, independent of which org the resource belongs to.

### A.8 Cross-Tenant Isolation

- `org_id` is **never** trusted from client input (body, query, path). It is always derived server-side from the verified JWT plus a live `org_members` lookup.
- Every query on an org-owned (or transitively org-owned) resource filters by that server-derived org ID.
- Any attempt to access another organization's resource returns **403 Forbidden** with a generic message and no resource data in `details` — confirmed by dedicated integration tests (`TESTING.md` §3).

### A.9 Input Validation

- Every request body/query/params object is validated with a Zod schema at the controller boundary before it reaches business logic. Invalid input never reaches the database layer.

### A.10 SQL Injection Protection

- All database access goes through the ORM's parameterized query builder (Prisma/TypeORM/Drizzle). No raw string concatenation into SQL anywhere in the codebase; if a raw query is ever unavoidable, it must use parameterized placeholders, never template-string interpolation of user input.

### A.11 Sensitive Data Handling

- `password_hash` and refresh `token_hash` are never included in any API response serializer.
- Structured logs redact/omit request bodies for auth endpoints and never log tokens or password fields.

### A.12 Environment Variables / Secrets Management

- All secrets (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, DB credentials) are supplied via environment variables, documented (names only, no values) in `README.md`, with safe placeholders in `.env.example`. `.env` is git-ignored. No credentials are committed to the repository at any point in its history.

### A.13 Error Information Disclosure

- The centralized error handler returns the mandated `{ error, code, details }` shape for known errors, and a generic `500 { "error": "Internal server error", "code": "INTERNAL_ERROR", "details": {} }` for unexpected errors — no stack traces, SQL fragments, or internal file paths are ever returned to the client. Full detail is logged server-side only.

## B. Optional / Additional Improvements (not explicitly mandated by the PDF)

These are reasonable production-hardening measures, not assignment requirements, and are called out separately so they aren't mistaken for graded criteria:

- **CORS**: restrict `Access-Control-Allow-Origin` to an explicit allow-list (`CORS_ALLOWED_ORIGINS`) rather than `*`, especially once cookies or credentials are involved.
- **Docker security**: run the API/worker containers as a non-root user, use minimal base images (e.g. `node:20-slim`), and avoid baking secrets into image layers (inject via runtime env vars only).
- **Logging**: use structured JSON logging with request IDs for traceability, and ensure log aggregation doesn't capture PII (emails, names) beyond what's operationally necessary.
- **Security headers**: `helmet` (or Fastify equivalent) for standard headers (`X-Content-Type-Options`, `X-Frame-Options`, etc.).
- **Dependency scanning**: `npm audit` / Dependabot in CI.
- **Global email rate limit** (50/min, bonus): protects the mock/real email provider from being overwhelmed and doubles as basic abuse protection for the assignment flow.
