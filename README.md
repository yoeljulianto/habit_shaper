# Habit Shaper

Lightweight habit tracker — build good habits, break bad ones, track streaks.

See [`PLANNING.md`](PLANNING.md) for architecture and data model.

## Stack
React + TS (Vite) · Node.js + TS (Express) · MySQL 8 · Docker Compose

## Run it

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:5173
- API: http://localhost:4000/api (health: `/api/health`)

Schema migrations run automatically on backend startup — no manual DB setup needed.

Stop with `docker compose down` (add `-v` to wipe data).

## Env vars

| Variable | Default | Notes |
|---|---|---|
| `DB_NAME` | `habit_shaper` | |
| `DB_USER` | `habit_user` | |
| `DB_PASSWORD` | `habit_password` | |
| `DB_ROOT_PASSWORD` | `rootpassword` | |
| `JWT_SECRET` | `dev_change_me` | change for real deployments |
| `VITE_API_URL` | `http://localhost:4000/api` | frontend build-time API URL |

## API

```
POST /api/auth/register  { email, password }
POST /api/auth/login     { email, password } -> { token }

GET    /api/goals
POST   /api/goals              { title, type: 'build'|'break' }
PUT    /api/goals/:id          { title }
DELETE /api/goals/:id
POST   /api/goals/:id/log      mark today done/relapsed
DELETE /api/goals/:id/log      undo today's log
```

All `/api/goals*` routes need `Authorization: Bearer <token>`.

## Dev without Docker (optional)

```bash
cd backend && npm install && npm run dev   # needs MySQL reachable via DB_* env vars
cd frontend && npm install && npm run dev
```
