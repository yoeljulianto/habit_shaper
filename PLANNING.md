# Habit Shaper — Planning

## Architecture
React (Vite) → Express/TS API (JWT auth) → MySQL. 3 Docker services: `frontend`, `backend`, `db`. Migrations run automatically when backend starts.

## Data Model

**users**: id, email, password_hash, created_at

**goals**: id, user_id, title, type (`build`|`break`), created_at, updated_at

**goal_logs**: id, goal_id, log_date (unique per goal+date)
- build goal + log row = completed that day
- break goal + log row = relapsed that day

Streaks are calculated from `goal_logs`, not stored.

## API

```
POST /api/auth/register  { email, password }
POST /api/auth/login     { email, password } -> { token }

GET    /api/goals
POST   /api/goals              { title, type }
PUT    /api/goals/:id          { title }
DELETE /api/goals/:id
POST   /api/goals/:id/log      mark today
DELETE /api/goals/:id/log      undo today
```

## Tasks
1. Planning + compose skeleton
2. DB schema/migration
3. Backend: express, DB pool, auto-migrate
4. Auth (register/login)
5. Goals CRUD
6. Streak + weekly-rate logic
7. Frontend: auth screen
8. Frontend: goal list/CRUD UI
9. Frontend: mark-done/relapse + stats
10. Full docker-compose test
11. README
12. Push + invite reviewers

## Out of scope
Email verification, password reset, notifications.