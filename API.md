# TaskFlow — API Documentation

Base URL (local): `http://localhost:3000/api/v1`

## Standard Error Format (assignment-mandated)

Every non-2xx response uses this exact shape:

```json
{
  "error": "Task not found",
  "code": "TASK_NOT_FOUND",
  "details": {}
}
```

| HTTP Status | Typical `code` values |
|---|---|
| 400 | `VALIDATION_ERROR` |
| 401 | `UNAUTHORIZED`, `INVALID_CREDENTIALS`, `TOKEN_EXPIRED` |
| 403 | `FORBIDDEN` (includes all cross-tenant access attempts) |
| 404 | `TASK_NOT_FOUND`, `PROJECT_NOT_FOUND`, `USER_NOT_FOUND`, `JOB_NOT_FOUND` |
| 409 | `EMAIL_ALREADY_REGISTERED`, `ALREADY_ASSIGNED` |
| 429 | `RATE_LIMITED` |
| 500 | `INTERNAL_ERROR` |

## Pagination (offset-based, assignment-mandated shape)

```json
{ "data": [], "total": 0, "page": 1, "limit": 20 }
```

`page` and `limit` are query parameters; `limit` is capped server-side (implementation decision, e.g. max 100).

---

## Authentication

### POST /auth/register

- **Auth required:** No
- **Rate limit:** 10 req/min/IP
- **Purpose:** Create a user, an organization, and make the user an `org_admin` of it.

**Request body**
```json
{
  "email": "alice@acme.com",
  "password": "StrongPassw0rd!",
  "fullName": "Alice Nguyen",
  "organizationName": "Acme Inc"
}
```

**Validation rules:** email format; password min length (implementation decision, e.g. 8 chars); all fields required.

**Success — 201**
```json
{
  "user": { "id": "uuid", "email": "alice@acme.com", "fullName": "Alice Nguyen" },
  "organization": { "id": "uuid", "name": "Acme Inc" }
}
```

**Errors:** `400 VALIDATION_ERROR`, `409 EMAIL_ALREADY_REGISTERED`

---

### POST /auth/login

- **Auth required:** No
- **Rate limit:** 10 req/min/IP
- **Purpose:** Authenticate and issue access + refresh tokens.

**Request body**
```json
{ "email": "alice@acme.com", "password": "StrongPassw0rd!" }
```

**Success — 200**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "expiresIn": 900
}
```

**Errors:** `400 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS`, `429 RATE_LIMITED`

---

### POST /auth/refresh

- **Auth required:** No (refresh token in body substitutes for it)
- **Rate limit:** 10 req/min/IP
- **Purpose:** Exchange a valid, non-revoked refresh token for a new access token (and, if rotation is implemented, a new refresh token).

**Request body**
```json
{ "refreshToken": "eyJ..." }
```

**Success — 200**
```json
{ "accessToken": "eyJ...", "expiresIn": 900 }
```

**Errors:** `401 TOKEN_EXPIRED`, `401 UNAUTHORIZED` (revoked/invalid)

---

### POST /auth/logout

- **Auth required:** Yes (access token)
- **Rate limit:** 10 req/min/IP
- **Purpose:** Revoke the supplied refresh token.

**Request body**
```json
{ "refreshToken": "eyJ..." }
```

**Success — 204** (no body)

**Errors:** `401 UNAUTHORIZED`

---

## Projects

All project endpoints require `Authorization: Bearer <accessToken>`. The organization is always taken from the authenticated user's token/membership — **never** from the request body (see `ARCHITECTURE.md` §14).

### POST /projects

- **Required role:** `member` or `org_admin`
- **Body:** `{ "name": "Website Revamp", "description": "Q3 redesign" }`
- **Success — 201:** `{ "id": "uuid", "orgId": "uuid", "name": "...", "description": "...", "createdAt": "..." }`
- **Errors:** `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`

### GET /projects

- **Required role:** `member` or `org_admin`
- **Query params:** `page`, `limit`
- **Success — 200:** paginated list, `{ "data": [...], "total": N, "page": 1, "limit": 20 }`
- **Multi-tenant:** results filtered to caller's `org_id` only.

### GET /projects/:id

- **Required role:** `member` or `org_admin`
- **Success — 200:** project object
- **Errors:** `403 FORBIDDEN` if the project belongs to another org (no data leaked); `404 PROJECT_NOT_FOUND` if it doesn't exist at all.

### PATCH /projects/:id

- **Required role:** `member` or `org_admin` (implementation decision: any org member may edit; only `org_admin` may delete, per assignment)
- **Body:** any subset of `{ "name", "description" }`
- **Success — 200:** updated project
- **Errors:** `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `404 PROJECT_NOT_FOUND`

### DELETE /projects/:id

- **Required role:** `org_admin` only — **"Admins can manage members and delete projects"** per assignment
- **Success — 204**
- **Errors:** `403 FORBIDDEN` (wrong org **or** insufficient role), `404 PROJECT_NOT_FOUND`

### GET /projects/:id/dashboard

- **Required role:** `member` or `org_admin`
- **Purpose:** task counts grouped by status (assignment-required dashboard)
- **Success — 200**
```json
{ "projectId": "uuid", "counts": { "todo": 4, "in_progress": 2, "review": 1, "done": 5 } }
```

---

## Tasks

All task endpoints require `Authorization: Bearer <accessToken>`. A task's org is resolved via `task.project.orgId`.

### POST /projects/:projectId/tasks

- **Required role:** `member` or `org_admin`
- **Body:**
```json
{ "title": "Set up CI", "description": "GitHub Actions", "priority": "high", "dueDate": "2026-09-01" }
```
- **Success — 201:** task object (`status` defaults to `todo`)
- **Errors:** `400 VALIDATION_ERROR`, `403 FORBIDDEN` (project not in caller's org), `404 PROJECT_NOT_FOUND`

### GET /projects/:projectId/tasks

- **Required role:** `member` or `org_admin`
- **Query params (all optional, combinable):**
  - `status` — one of `todo`, `in_progress`, `review`, `done`
  - `priority` — one of `low`, `medium`, `high`, `urgent`
  - `assigneeId` — uuid, filters to tasks assigned to that user
  - `dueDateFrom`, `dueDateTo` — ISO dates, inclusive range
  - `page`, `limit` — pagination
- **Success — 200:** `{ "data": [...tasks], "total": N, "page": 1, "limit": 20 }`

### GET /tasks/:id

- **Success — 200:** task object with embedded `assignments` and `comments` summary
- **Errors:** `403 FORBIDDEN` (cross-tenant), `404 TASK_NOT_FOUND`

### PATCH /tasks/:id

- **Body:** any subset of `{ "title", "description", "status", "priority", "dueDate" }`
- **Success — 200:** updated task
- **Errors:** `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `404 TASK_NOT_FOUND`

### DELETE /tasks/:id

- **Required role:** `member` or `org_admin` (implementation decision — the PDF only specifies project deletion is admin-only; task deletion permission is not specified and is treated as a reasonable default of "any org member")
- **Success — 204**
- **Errors:** `403 FORBIDDEN`, `404 TASK_NOT_FOUND`

### POST /tasks/:id/assign

- **Required role:** `member` or `org_admin`
- **Body:** `{ "userId": "uuid" }`
- **Authorization rule:** the target `userId` **must** belong to the same organization as the task (assignment-mandated). Validated server-side against `org_members`, not trusted from the client.
- **Success — 201**
```json
{
  "assignment": { "id": "uuid", "taskId": "uuid", "userId": "uuid", "assignedAt": "..." },
  "jobId": "bullmq-job-id"
}
```
- **Errors:** `400 VALIDATION_ERROR`, `403 FORBIDDEN` (task cross-tenant, or target user in a different org), `404 TASK_NOT_FOUND` / `USER_NOT_FOUND`, `409 ALREADY_ASSIGNED`

### DELETE /tasks/:id/assign/:userId

- **Purpose:** unassign a user from a task
- **Success — 204**
- **Errors:** `403 FORBIDDEN`, `404 TASK_NOT_FOUND` (or assignment not found)

---

## Jobs

### GET /jobs/:id

- **Auth required:** Yes
- **Purpose:** return current status/metadata of a background email-notification job.
- **Success — 200**
```json
{
  "jobId": "bullmq-job-id",
  "status": "completed",
  "attemptsMade": 1,
  "queuedAt": "2026-08-20T10:00:00Z",
  "processedAt": "2026-08-20T10:00:01Z",
  "failedReason": null
}
```
`status` is one of the assignment-mandated values: `pending`, `active`, `completed`, `failed`.

- **Errors:** `403 FORBIDDEN` (job belongs to a task outside caller's org), `404 JOB_NOT_FOUND`

---

## Cross-Cutting Rules Applied to Every Endpoint Above

- **Authentication:** `Authorization: Bearer <accessToken>` header, verified JWT, 15-minute TTL.
- **Multi-tenancy:** the org is derived server-side from the caller's membership; any resource ID belonging to a different org yields `403 FORBIDDEN` with no data in `details`.
- **Validation:** Zod schemas on every request body/query; failures yield `400 VALIDATION_ERROR` with field-level `details`.
