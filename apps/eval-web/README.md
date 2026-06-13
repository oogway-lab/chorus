# @chorus/eval-web

Hosted, multi-user web app for comparing **OpenAI** models on image/text datasets —
structured output, latency, cost, field-level diff against labels, and LLM-judge
scoring. Built on the Tauri-free `@chorus/llm-core` package.

## What works

End-to-end: create a dataset → define its output schema + per-field match rules →
add items and ground-truth labels → author a versioned prompt → configure a run
across candidate models (with gpt-4o as the reference) and an optional judge →
execute → read the **comparison matrix** and **leaderboard** (quality, latency,
cost, and projected cost per 1k items).

- Fan-out execution with bounded concurrency, cross-run generation caching, and
  partial-failure retry.
- Dual scoring: configurable per-field diff (exact / numeric tolerance / set F1)
  and an LLM judge (configured model + rubric → score + rationale).
- Cost computed from OpenAI usage × static pricing; `unavailable` when usage is
  missing.

## Run locally

1. `cp .env.example .env` and set `DATABASE_URL` (Postgres) and `OPENAI_API_KEY`.
2. `pnpm --filter @chorus/eval-web db:migrate` to create tables.
3. `pnpm --filter @chorus/eval-web dev` — open http://localhost:3000.

Dev mode seeds a single default team/user (no auth provider needed). With a
production build (`next start`), the dev principal is refused unless `AUTH_DEV=true`
is set — wire `server/auth/session.ts` `requirePrincipal()` to a real provider
before any real deployment.

## Layout

- `server/db/` — Drizzle schema (normal Postgres constraints, KTD6) + client.
- `server/datasets`, `server/prompts`, `server/judges`, `server/runs` — domain services.
- `server/runs/executor.ts` — the fan-out + scoring engine (the `llm-core` seam).
- `server/scoring/` — field diff + judge.
- `app/` — Next.js App Router UI + server actions.

## Execution model

Runs execute in the background: `createRunAction` enqueues the run and redirects
immediately; a pg-boss worker (started at server boot via `instrumentation.ts`)
drains the durable queue and runs the two-phase executor (all generations, then
all scoring). A crash leaves the job in the queue and `recoverOrphanedRuns` re-queues
runs stuck in `running`. Data access is team-scoped and ownership-checked; the
identity itself (`requirePrincipal`) is still the dev stub — wire a real provider
before a hosted deployment.

## Known follow-ups

- Single-instance worker: the queue is durable, but image storage is local disk
  (`.uploads/`) — a multi-instance deployment needs shared object storage.
- Per-team API-key storage supersedes the `OPENAI_API_KEY` env fallback.
- OpenAI pricing is a static map; live pricing fetch is deferred.
