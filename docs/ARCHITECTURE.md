# Architecture

## System diagram

```mermaid
flowchart LR
    subgraph client["User's Machine"]
        Browser["Browser<br/>localhost:5173"]
    end

    subgraph docker["Docker Compose network"]
        subgraph fe["frontend container"]
            Nginx["nginx<br/>serves static React build<br/>port 80 → host 5173"]
        end

        subgraph be["backend container"]
            Express["Express API<br/>port 4000 → host 4000"]
            AuthMW["JWT auth middleware<br/>(requireAuth)"]
            Express --> AuthMW
        end

        subgraph dbc["db container"]
            MySQL["MySQL 8<br/>port 3306 → host 3306"]
        end
    end

    Browser -- "1 . GET / (load app)" --> Nginx
    Browser -- "2 . fetch /api/* (JSON + JWT)" --> Express
    AuthMW -- "3 . verified requests only" --> MySQL
    Express -- "/api/auth/*  (no token required)" -.-> MySQL
```

## Request flow

1. Browser loads the React app from **nginx** (`localhost:5173`), which just serves the pre-built static bundle — no server-side logic here.
2. The React app calls the backend directly at `localhost:4000/api/*` (configured via `VITE_API_URL`, baked in at build time).
3. `/api/auth/register` and `/api/auth/login` are **public** — no token required. On success they return a JWT signed with `JWT_SECRET`.
4. Every other route (`/api/goals*`) is protected by the `requireAuth` middleware (`backend/src/middleware/auth.ts`), which:
   - Rejects requests with no or malformed `Authorization: Bearer <token>` header (`401`)
   - Verifies the JWT signature and expiry
   - Attaches the decoded `userId` to the request for the controller to use
5. Controllers scope every query by `user_id`, so one user can never read or modify another user's goals — even with a valid token.

## Where auth is enforced

| Layer | Enforcement |
|---|---|
| Frontend | None (trusts the backend). Token is stored in `localStorage` and attached to every request. |
| Backend — routing | `goalsRoutes.ts` calls `router.use(requireAuth)` before any goal route is registered, so **all** goal endpoints are gated in one place. |
| Backend — middleware | `requireAuth` (`middleware/auth.ts`) verifies the JWT before the request reaches any controller. |
| Backend — data access | Every goal query filters `WHERE user_id = ?` (see `ownedGoal()` in `goalsController.ts`) — this is the actual authorization boundary, not just authentication. |
| Database | No row-level security; enforcement is entirely at the application layer above. |

## Ports & networking

| Service | Container port | Host port | Reachable from |
|---|---|---|---|
| `frontend` | 80 (nginx) | `5173` | Browser |
| `backend` | 4000 | `4000` | Browser (direct API calls), and other containers via service name `backend` |
| `db` | 3306 | `3306` | `backend` container via service name `db`; also exposed to host for debugging with a MySQL client |

All three containers share the `habit_shaper_default` Docker network (created automatically by Compose), so `backend` reaches MySQL via the hostname `db`, not `localhost`.

## Startup ordering

`backend` has `depends_on: db: condition: service_healthy` — Compose won't start the backend container until MySQL's healthcheck passes. On top of that, `backend` also has its own internal retry loop (`waitForDb` in `db/pool.ts`) before running migrations, since MySQL's first boot can take much longer than a typical healthcheck window (this was discovered during local testing — see `docs/DEVELOPMENT_PROCESS.md`).
