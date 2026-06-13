# Claude's Onboarding Doc

## What is this?

An OpenAI **model-evaluation web app**. You give it a dataset (images and/or text)
with an expected JSON output schema and optional ground-truth labels, author a
versioned prompt, then run several candidate OpenAI models over the dataset. For
each model it captures the structured output, latency, and cost, scores it
(field-level diff against labels + an LLM-as-judge rubric), and shows a comparison
matrix and a leaderboard (quality, latency, and projected production cost per 1k).
The point is picking a cheaper/newer model that holds quality — e.g. migrating off
gpt-4o.

It's a pnpm workspace:

- **`apps/eval-web`** — the web app: Next.js (App Router), Postgres via Drizzle,
  pg-boss for background run execution.
- **`packages/llm-core`** (`@chorus/llm-core`) — a Tauri-free OpenAI eval engine
  (a single request/response `complete()` with latency capture, base64 images, and
  JSON-schema structured output) plus pure cost helpers. Extracted from the Chorus
  desktop app's internals.

> This branch is dedicated to the web app. The original **Chorus macOS desktop app**
> lives on `main` and is not present here. **Do not merge this branch into `main`** —
> it would delete the desktop app there. This branch is its own line.

## Your role

You write code. You can run the app (`pnpm --filter @chorus/eval-web dev`), the
type-checker, the build, and migrations against a local Postgres. When a change is
behavioral, prefer to verify it by actually running it (a run end-to-end, a build)
rather than only type-checking. If I report a bug, fix it and ask me to confirm.

## Workflow

We use GitHub issues and PRs; tag anything you open `by-claude`. Use `gh`.

- Branch off this branch (e.g. `claude/feature-name`). **Never commit to `main`.**
- Commit often. Reconcile branches with rebase or cherry-pick, never merge.
- Run `git add` and `git commit` as **separate** commands.
- pnpm manages dependencies. There is no pre-commit hook — run `typecheck`/`build`
  yourself before committing.

## Running it

```bash
pnpm install
cp apps/eval-web/.env.example apps/eval-web/.env   # DATABASE_URL + OPENAI_API_KEY
pnpm --filter @chorus/eval-web db:migrate
pnpm --filter @chorus/eval-web dev                 # http://localhost:3000
```

`requirePrincipal` seeds a single dev team/user in development; a production build
(`next start`) refuses it unless `AUTH_DEV=true`. Wire a real auth provider before
any real deployment.

## Structure (`apps/eval-web`)

- `app/` — App Router pages and `actions.ts` (server actions — every mutation goes
  through these; the only API route is `/api/health`).
- `server/db/` — Drizzle `schema.ts`, `client.ts`, shared jsonb types in
  `jsonTypes.ts`, generated `migrations/`.
- `server/{datasets,prompts,judges,runs}/service.ts` — domain logic (plain,
  framework-free; this is where to add capabilities).
- `server/runs/executor.ts` — the run executor.
- `server/runs/reads.ts` — matrix + leaderboard read models.
- `server/jobs/runQueue.ts` — pg-boss enqueue + worker + crash recovery.
- `server/scoring/` — `fieldDiff.ts` and `judge.ts`.
- `server/images/source.ts` — local-disk image store (base64 for the providers).
- `server/llm/pricing.ts` — static OpenAI pricing (longest-key match).
- `instrumentation.ts` — starts the run worker at server boot.

## How a run executes

1. `createRunAction` validates + persists the run (cells `pending`), **enqueues**
   it, and redirects immediately (non-blocking).
2. The pg-boss worker (started in `instrumentation.ts`) calls `executeRun(runId)`.
3. `executeRun` **atomically claims** its cells (`pending`/`failed` → `running`),
   then runs in **two phases**: (1) generate every cell, (2) score every cell.
   Two-phase ordering guarantees the gpt-4o reference output exists before the
   judge runs.
4. A cross-run cache reuses a prior generation for the same
   `(item, model, prompt version, maxTokens)` — never a schema-violating one.
5. On crash, `recoverOrphanedRuns` re-queues runs stuck in `running`.

## Data model

Entities: `teams`/`users`, `datasets`/`dataset_schemas`/`dataset_items`/`labels`,
`prompts`/`prompt_versions`, `judge_configs`, `runs`/`run_models`/`run_cells`/
`cell_scores`. All team-owned rows carry `team_id`; reads/writes are team-scoped
and ownership-checked via `assertSameTeam`.

Schema changes:

- Edit `server/db/schema.ts` (use foreign keys + indexes; type jsonb with `.$type<>`).
- `pnpm --filter @chorus/eval-web db:generate` to emit a migration, then `db:migrate`.

## Coding style

- **TypeScript:** strict, ES2020. Use `as` only in exceptional cases, with an
  explanatory comment (it's the entry points where untyped JSON/`unknown` is
  narrowed). Prefer type hints.
- **Paths:** `@/*` alias in `eval-web` over relative imports.
- **Nulls:** prefer `undefined`; coerce DB `null` → `undefined` at the boundary.
- **DB:** foreign keys and indexes are expected (Postgres, not the desktop SQLite
  no-FK rule).
- **Formatting:** 4-space indent, Prettier. Handle every promise.

## Testing

There is no test harness yet. The highest-value targets are the pure, deterministic
units: `packages/llm-core` (`cost.ts`, `providers/structuredOutput.ts`,
`getBareModelName`, `isReasoningModel`) and `server/scoring/fieldDiff.ts` and
`server/llm/pricing.ts`.

## Troubleshooting

When a change to provider requests/cost/scoring misbehaves, the fastest signal is a
real run: create a tiny dataset + prompt, launch a run, and read the matrix. To
inspect what's sent to OpenAI, log inside `packages/llm-core/src/providers/openai.ts`
before the `chat.completions.create` call.

### Scratchpad

(Add anything future-you would want to know here.)
