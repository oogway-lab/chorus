# Model Eval

A web app for comparing OpenAI models on image/text datasets — structured output,
latency, cost, field-level diff against labels, and LLM-as-judge scoring — to pick
a cheaper model that holds quality (e.g. migrating off gpt-4o).

> **Branch note:** this branch is focused on the eval web app. The original Chorus
> macOS desktop app lives on `main` and is intentionally not present here. Do not
> merge this branch into `main` as-is — it would remove the desktop app there.

## Workspace

- **`apps/eval-web`** — the Next.js + Postgres (Drizzle) + pg-boss web app. See its
  [README](apps/eval-web/README.md) for setup and the execution model.
- **`packages/llm-core`** — a Tauri-free OpenAI eval engine (single request/response
  call with latency capture, images, and JSON-schema structured output, plus cost
  helpers), extracted from the Chorus desktop internals.

## Quick start

```bash
pnpm install
cp apps/eval-web/.env.example apps/eval-web/.env   # set DATABASE_URL + OPENAI_API_KEY
pnpm --filter @chorus/eval-web db:migrate
pnpm --filter @chorus/eval-web dev                 # http://localhost:3000
```

## Design docs

- Requirements: `docs/brainstorms/2026-06-13-image-model-eval-webapp-requirements.md`
- Plans: `docs/plans/`
