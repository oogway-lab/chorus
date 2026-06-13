# @chorus/eval-web

Hosted, multi-user web app for comparing models on image/text datasets — structured
output, latency, cost, field-level diff, and LLM-judge scoring. Built on the
Tauri-free `@chorus/llm-core` package.

> **Status: scaffold (U4).** This app type-checks but is **not yet runtime-verified**.
> It needs a Postgres instance and real auth wiring before it runs. The data model,
> job-queue wiring, and the `llm-core` call seam (`server/jobs/runOrchestrator.ts`)
> are in place; datasets, runs, scoring, matrix, and leaderboard surfaces (U5–U10)
> are not yet implemented.

## Setup (when ready to run)

1. `cp .env.example .env` and set `DATABASE_URL` to a Postgres instance.
2. `pnpm --filter @chorus/eval-web db:generate` then `db:migrate` to create tables.
3. Wire `server/auth/session.ts` `requirePrincipal()` to a real auth provider.
4. `pnpm --filter @chorus/eval-web dev`.

## Layout

- `server/db/` — Drizzle schema (normal Postgres constraints, KTD6) + client.
- `server/jobs/` — pg-boss queue + cell execution (the `llm-core` call seam).
- `server/auth/` — team-scoped principal contract (stub — wire before deploy).
- `app/` — Next.js App Router shell.

## Validate against real providers

Two `llm-core` behaviors to exercise once keys + a model list are available:

- Newer OpenAI models may require `max_completion_tokens` instead of the
  `max_tokens` mirrored from the desktop app.
- The Anthropic forced-tool structured-output path should be run against the real
  output schema.
