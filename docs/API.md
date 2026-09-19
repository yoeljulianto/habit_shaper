# API Reference

Base URL: `http://localhost:4000/api` (configurable via `VITE_API_URL` for the frontend; the backend itself always listens on `PORT`, default `4000`).

All request/response bodies are JSON. All protected routes require:
```
Authorization: Bearer <token>
```

---

## Health

### `GET /health`

No auth required.

**Response `200`**
```json
{ "status": "ok" }
```

---

## Auth

### `POST /auth/register`

No auth required.

**Request body**
```json
{ "email": "user@example.com", "password": "at least 6 chars" }
```

**Response `201`**
```json
{
  "token": "eyJhbGciOi...",
  "user": { "id": 1, "email": "user@example.com" }
}
```

**Errors**
| Status | Condition | Body |
|---|---|---|
| `400` | Missing email or password | `{"error":"email and password are required"}` |
| `400` | Invalid email format | `{"error":"invalid email format"}` |
| `400` | Password under 6 characters | `{"error":"password must be at least 6 characters"}` |
| `409` | Email already registered | `{"error":"email already registered"}` |

### `POST /auth/login`

No auth required.

**Request body**
```json
{ "email": "user@example.com", "password": "..." }
```

**Response `200`**
```json
{
  "token": "eyJhbGciOi...",
  "user": { "id": 1, "email": "user@example.com" }
}
```

**Errors**
| Status | Condition | Body |
|---|---|---|
| `400` | Missing email or password | `{"error":"email and password are required"}` |
| `401` | Email not found, or wrong password | `{"error":"invalid credentials"}` |

> Note: login intentionally returns the same `401` message for "no such user" and "wrong password" — this avoids leaking which emails are registered.

Tokens are signed with `JWT_SECRET`, expire after **7 days**, and carry `{ userId }` as payload.

---

## Goals

All routes below require `Authorization: Bearer <token>`. Every goal is scoped to the authenticated user — you can never read or modify another user's goals, even with a valid token for a different account (attempting to returns `404`, not `403`, to avoid confirming the goal exists).

### `GET /goals`

List all goals for the authenticated user, each enriched with computed stats.

**Response `200`**
```json
[
  {
    "id": 5,
    "user_id": 1,
    "title": "Meditate",
    "type": "build",
    "created_at": "2026-08-20T00:00:00.000Z",
    "updated_at": "2026-08-20T00:00:00.000Z",
    "streak": 3,
    "weekly": { "completed": 5, "missed": 2 },
    "loggedToday": true
  },
  {
    "id": 6,
    "user_id": 1,
    "title": "Smoking",
    "type": "break",
    "created_at": "2026-08-15T00:00:00.000Z",
    "updated_at": "2026-08-15T00:00:00.000Z",
    "cleanStreak": 4,
    "relapsedToday": false
  }
]
```

Fields `streak` / `weekly` / `loggedToday` only appear on `type: "build"` goals. Fields `cleanStreak` / `relapsedToday` only appear on `type: "break"` goals. See `docs/ERD.md` for how these are derived from `goal_logs`.

**Errors**
| Status | Condition |
|---|---|
| `401` | Missing/invalid/expired token |

### `POST /goals`

Create a new goal.

**Request body**
```json
{ "title": "Meditate", "type": "build" }
```
`type` must be `"build"` or `"break"`.

**Response `201`** — the created goal, same shape as one item from `GET /goals`.

**Errors**
| Status | Condition | Body |
|---|---|---|
| `400` | Missing title, or `type` not `build`/`break` | `{"error":"title and a valid type ('build'|'break') are required"}` |
| `401` | Missing/invalid/expired token | |

### `PUT /goals/:id`

Rename a goal. (Type cannot be changed after creation — create a new goal instead.)

**Request body**
```json
{ "title": "Meditate 10min" }
```

**Response `200`** — the updated goal.

**Errors**
| Status | Condition | Body |
|---|---|---|
| `400` | Missing title | `{"error":"title is required"}` |
| `401` | Missing/invalid/expired token | |
| `404` | Goal doesn't exist, or belongs to another user | `{"error":"goal not found"}` |

### `DELETE /goals/:id`

Delete a goal and all its logs (cascade).

**Response `204`** — empty body.

**Errors**
| Status | Condition |
|---|---|
| `401` | Missing/invalid/expired token |
| `404` | Goal doesn't exist, or belongs to another user |

### `POST /goals/:id/log`

Mark **today** for this goal — "completed" for a `build` goal, "relapsed" for a `break` goal. Idempotent: calling it twice on the same day has no additional effect (`INSERT IGNORE` on the unique `(goal_id, log_date)` key).

**Response `200`** — the goal with updated stats (same shape as `GET /goals` item).

**Errors**
| Status | Condition |
|---|---|
| `401` | Missing/invalid/expired token |
| `404` | Goal doesn't exist, or belongs to another user |

### `DELETE /goals/:id/log`

Undo today's log entry for this goal (correct an accidental click). Only affects today's date — cannot undo a past day through this endpoint.

**Response `200`** — the goal with updated stats.

**Errors**
| Status | Condition |
|---|---|
| `401` | Missing/invalid/expired token |
| `404` | Goal doesn't exist, or belongs to another user |

---

## Error response shape

All error responses follow the same shape:
```json
{ "error": "human-readable message" }
```

## Common status codes across all endpoints

| Status | Meaning |
|---|---|
| `400` | Bad request — missing/invalid fields in the body |
| `401` | Missing, malformed, expired, or invalid JWT |
| `404` | Resource not found, or not owned by the authenticated user |
| `409` | Conflict (currently only: email already registered) |
| `500` | Unexpected server error. Caught centrally by the Express error handler in `index.ts` (via `asyncHandler` wrapping every controller — see `docs/DEVELOPMENT_PROCESS.md` for why this was added) so a single failed request never crashes the whole server. |
