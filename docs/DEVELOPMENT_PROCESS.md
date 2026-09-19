# Development Process

## Coding agent used

I used **Claude** (Anthropic's coding assistant) as my primary coding agent throughout this project, working conversationally rather than in a fully autonomous mode — I reviewed and tested every change before committing it.

## Process overview

### 1. Planning first
Before any code was written, I had Claude read the take-home spec and produce `docs/PLANNING.md` — architecture, data model, API surface, and a task breakdown — which I reviewed and committed as the first commit, per the instructions.

### 2. Scaffolding
From the plan, I had Claude generate the initial scaffold in one pass: `compose.yml`, the MySQL migration, the Express/TypeScript backend (auth, goals CRUD, streak logic), and the React/Vite frontend. I reviewed the generated code section by section — reading through the streak/clean-streak calculation logic in particular, since that's the core business logic of the app, and asked Claude to walk me through the exact algorithm in plain language before I trusted it (see the "date/gap" reasoning in `goalsController.ts`).

### 3. Iterative testing and debugging
I ran the stack locally with `docker compose up --build` and worked through problems as they came up, rather than assuming the first version was correct. Issues found and fixed during this phase:

- **`vite-env.d.ts` missing** — `import.meta.env` failed to type-check during the frontend Docker build (`TS2339`). Fixed by adding the Vite client type reference.
- **MySQL slow first boot** — on my machine, MySQL's first-time initialization took several minutes (Docker resource limits), which exceeded both the Compose healthcheck window and the backend's own DB-connection retry loop, causing the backend container to crash-loop. Fixed by increasing `healthcheck.start_period`/`retries` in `compose.yml` and the retry budget in `waitForDb()` in `backend/src/db/pool.ts`.
- **Non-idempotent migration** — `CREATE INDEX` statements in the migration failed with `ER_DUP_KEYNAME` on backend restart, since the index already existed from the first run. Fixed by removing the redundant explicit indexes (the FK constraint and the `UNIQUE` key on `goal_logs` already provide equivalent indexes).
- **`TypeError: createdAt.slice is not a function`** — `computeCleanStreak` assumed `created_at` was always a string, but `mysql2` returns `DATETIME` columns as JS `Date` objects. Fixed the function to accept `string | Date` and construct the `Date` directly instead of slicing a string.
- **Unhandled async errors crashing the whole server** — an error inside any `async` controller (e.g. the FK-constraint failure below) was an unhandled promise rejection, which crashed the entire Node process rather than returning a `500` to just that request. Added an `asyncHandler` wrapper (`backend/src/utils/asyncHandler.ts`) around every route handler so errors are forwarded to Express's error middleware instead.
- **Stale JWT after a manual DB reset** — after wiping the database (`docker compose down -v`) during testing, the browser still held a JWT for a `user_id` that no longer existed, so goal creation failed on the FK constraint. This surfaced the unhandled-error bug above; the fix there also made this failure mode return a clean error instead of a crash.

Each of these was found by actually running the app and reading the container logs (`docker compose logs backend`), not by static review alone.

### 4. Manual functional verification
Beyond fixing crashes, I verified the actual business logic by hand:
- Register/login, including the negative cases (wrong password, duplicate email)
- Build habit: mark done, undo, streak increments/resets correctly across day gaps
- Break habit: relapse, undo, clean-streak calculation from the *last* relapse (not creation date, once a relapse exists)
- Weekly completion rate as an independent 7-day rolling count, distinct from streak
- Edit/delete goals, data persistence across container restarts

For scenarios I couldn't wait for in real time (habits crossing multiple real days), I connected directly to the MySQL container (`docker compose exec db mysql ...`) and inserted `goal_logs` rows with backdated `log_date` values to simulate multi-day sequences, then confirmed the API/UI reflected the expected streak numbers. I asked Claude to explain the exact streak/clean-streak algorithm before relying on this test method, so I knew what result to expect rather than just checking "does it look plausible."

### 5. Commit history
Commits were made incrementally by feature area (planning → infra → backend skeleton → auth → utility → bug fixes → goals logic → frontend → docs), reflecting the order things were actually built and debugged, rather than squashed into one commit at the end.

## What I did not do

I did not blindly accept generated code — every bug listed above was found by me running the app, reading real error output, and asking follow-up questions until I understood the root cause (not just applying a suggested fix without understanding why it worked). Where the fix touched core logic (the streak calculations), I had it explained back to me and validated it against constructed test cases before considering it correct.
