# Eval Web App — Agent Guide

A pnpm workspace for an OpenAI model-evaluation web app. (The Chorus macOS desktop
app lives on `main`; this branch does not contain it — do not merge this branch
into `main`.)

## Workspace

- **`apps/eval-web`** — Next.js (App Router) + Postgres (Drizzle) + pg-boss.
- **`packages/llm-core`** (`@chorus/llm-core`) — Tauri-free OpenAI eval engine:
  one request/response `complete()` call with latency capture, images, and
  JSON-schema structured output, plus pure cost helpers.

## Commands

- **Dev:** `pnpm --filter @chorus/eval-web dev` (http://localhost:3000)
- **Build:** `pnpm --filter @chorus/eval-web build`
- **Type-check:** `pnpm --filter @chorus/eval-web typecheck` / `... @chorus/llm-core typecheck`
- **DB:** `pnpm --filter @chorus/eval-web db:generate` then `db:migrate`
- Env: copy `apps/eval-web/.env.example` → `.env`, set `DATABASE_URL` + `OPENAI_API_KEY`.

## Code style

- **TypeScript:** strict, ES2020. Use `as` only with an explanatory comment.
- **Paths:** `@/*` alias in `eval-web` (maps to its root) over relative imports.
- **Nulls:** prefer `undefined`; coerce DB `null` → `undefined` at the boundary.
- **DB:** the Postgres app uses foreign keys and indexes (unlike the desktop
  SQLite no-FK rule). Type jsonb columns with Drizzle `.$type<...>()`.
- **Formatting:** 4-space indent, Prettier. Handle every promise.

## Structure (`apps/eval-web`)

- `app/` — App Router pages + `actions.ts` (server actions; all mutations).
- `server/db/` — Drizzle `schema.ts`, `client.ts`, `jsonTypes.ts`, `migrations/`.
- `server/{datasets,prompts,judges,runs}/` — domain services.
- `server/runs/executor.ts` — two-phase run executor (generate all, then score all).
- `server/jobs/runQueue.ts` — pg-boss worker + enqueue + crash recovery.
- `server/scoring/` — `fieldDiff.ts` (exact / numeric-tolerance / set-F1) + `judge.ts`.
- `server/auth/session.ts` — `requirePrincipal` (dev stub) + `assertSameTeam`.
- `instrumentation.ts` — boots the run worker at server start.

## Workflow

- Branch from this branch (`claude/...`); never commit to `main`. Rebase/cherry-pick,
  not merge. Tag PRs/issues `by-claude`. Use `gh` for GitHub.
- Run `git add` and `git commit` as separate commands.
