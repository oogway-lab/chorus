---
title: "refactor: OpenAI-only providers (remove OpenRouter + others)"
date: 2026-06-13
type: refactor
depth: lightweight
origin: docs/brainstorms/2026-06-13-image-model-eval-webapp-requirements.md
---

# refactor: OpenAI-Only Providers

## Summary

Narrow the just-built eval foundation to OpenAI only. Remove OpenRouter and the other non-OpenAI providers (Anthropic, Google, Grok, Perplexity) from `@chorus/llm-core` and `@chorus/eval-web`, collapse cost to a single computed-from-usage source (drop the OpenRouter authoritative-cost path), and trim the API-key and provider surface to OpenAI. Comparison becomes OpenAI-model-vs-OpenAI-model, with gpt-4o still usable as the reference column. This is a trim of existing code, runtime-verifiable now that local Postgres is configured.

---

## Problem Frame

The user only wants to evaluate OpenAI models and has an OpenAI API key; OpenRouter and the multi-provider machinery are unwanted complexity. The current foundation (built earlier this session) carries a multi-provider abstraction: a multi-base-URL OpenAI-compatible provider, a native Anthropic provider, provider-precedence gating, and a two-source cost model (OpenRouter authoritative vs. computed). With OpenAI as the only target, the authoritative-cost path and the non-OpenAI providers are dead weight, and the `cost_source` enum carries a value that can never occur.

---

## Key Technical Decisions

- KTD1. **Single computed cost source.** With OpenRouter gone, every cell's cost is computed from OpenAI token usage × pricing, or `unavailable` when usage is missing. This supersedes the origin plan's two-cost-source decision (KTD4 in `docs/plans/2026-06-13-001-feat-image-model-eval-webapp-plan.md`).
- KTD2. **Drop the multi-provider abstraction, keep one OpenAI provider.** Replace the parameterized OpenAI-compatible provider with a single dedicated OpenAI provider; delete the Anthropic provider. The factory resolves directly to it. The user chose full removal over keeping a dormant seam.
- KTD3. **Trim the type surface to OpenAI.** `ApiKeys` reduces to an OpenAI key; `CostSource` reduces to `computed | unavailable`. Model ids are treated as bare OpenAI model names (no `provider::` prefix required).
- KTD4. **Regenerate the `cost_source` enum.** Migrations have not been applied yet, so the enum is changed to `computed | unavailable` and the migration regenerated cleanly — no enum-alter migration needed.

---

## Implementation Units

### U1. Trim llm-core core types and cost

- **Goal:** Remove OpenRouter/non-OpenAI concepts from the package's pure modules.
- **Dependencies:** none.
- **Files:**
  - `packages/llm-core/src/types.ts` (modify)
  - `packages/llm-core/src/cost.ts` (modify)
  - `packages/llm-core/src/proxy.ts` (delete)
- **Approach:** In `types.ts`, reduce `ApiKeys` to `{ openai?: string }`, reduce `CostSource` to `"computed" | "unavailable"`, and remove `ProviderName` and `getProviderName` (keep `getBareModelName` to tolerate a stray prefix). In `cost.ts`, delete `fetchOpenRouterCost`, `OpenRouterAttribution`, and the OpenRouter response interface; keep `calculateCost`, `computeCostFromUsage`, `projectProductionCost`, `formatCost`. Delete `proxy.ts` — provider gating is now just "is an OpenAI key present", checked at the factory.
- **Patterns to follow:** Existing pure-module style in the package; `undefined` over `null`.
- **Test scenarios:**
  - `computeCostFromUsage` returns a number for populated usage and `undefined` when prompt/completion tokens are missing.
  - `projectProductionCost` returns mean-per-item × 1000 for a known fixture and `undefined` for an empty array.
  - `formatCost` sub-cent / sub-dollar / dollar formatting unchanged.
- **Verification:** Package type-checks; no remaining references to OpenRouter or non-OpenAI keys.

### U2. Single OpenAI provider in llm-core

- **Goal:** One OpenAI completion provider with latency capture, images, and JSON-schema output; remove the others.
- **Dependencies:** U1.
- **Files:**
  - `packages/llm-core/src/providers/openai.ts` (new — replaces `openaiCompatible.ts`)
  - `packages/llm-core/src/providers/openaiCompatible.ts` (delete)
  - `packages/llm-core/src/providers/anthropic.ts` (delete)
  - `packages/llm-core/src/providers/factory.ts` (modify)
  - `packages/llm-core/src/providers/structuredOutput.ts` (unchanged)
  - `packages/llm-core/src/index.ts` (modify)
- **Approach:** `openai.ts` keeps the existing call shape (chat completions, `response_format` json_schema, `image_url` blocks, `performance.now()` latency) minus the base-URL parameterization, OpenRouter attribution headers, and `generationId` capture. The factory becomes `getEvalProvider(modelId, apiKeys)` returning the OpenAI provider from `apiKeys.openai` (throws a clear error if absent). Update `index.ts` exports: drop `AnthropicEvalProvider`, `OpenAICompatibleProvider`, and OpenRouter attribution; export the OpenAI provider. Keep `parseStructuredOutput`.
- **Patterns to follow:** Current `openaiCompatible.ts` request construction and `structuredOutput.ts` parsing.
- **Test scenarios:**
  - Happy path: a mocked OpenAI client returns content; result carries `text` and a populated `latencyMs`.
  - Structured output: with a `responseSchema`, valid JSON parses into `parsed`; non-JSON yields `schemaViolation: true` (via existing `parseStructuredOutput`).
  - Images: an `EvalImage` produces a `data:<mime>;base64,...` `image_url` part, text part first.
  - Missing usage: result marks tokens absent so the caller can record `unavailable`.
- **Verification:** Package type-checks; factory resolves only OpenAI; no Anthropic/compat symbols remain.

### U3. OpenAI-only wiring in eval-web

- **Goal:** Cost resolution computes only; remove OpenRouter env/enum; keep the cell-execution seam working.
- **Dependencies:** U1, U2.
- **Files:**
  - `apps/eval-web/server/jobs/runOrchestrator.ts` (modify)
  - `apps/eval-web/server/db/schema.ts` (modify — `costSource` enum)
  - `apps/eval-web/server/db/migrations/*` (regenerate)
  - `apps/eval-web/.env.example` (modify)
- **Approach:** In `runOrchestrator.ts`, drop `attributionFromEnv` and the OpenRouter authoritative branch in `resolveCost`; cost is `computeCostFromUsage` → `computed`, else `unavailable`. Simplify `executeCell`'s signature to drop the attribution argument and call `getEvalProvider(modelId, apiKeys)`. In `schema.ts`, change the `costSource` pgEnum to `["computed", "unavailable"]` and regenerate the Drizzle migration (clean — migrations not yet applied). In `.env.example`, remove `OPENROUTER_REFERER` / `OPENROUTER_TITLE`.
- **Patterns to follow:** Existing `executeCell` structure; Drizzle enum + `db:generate` flow.
- **Test scenarios:**
  - `executeCell` with usage present records `cost_source = "computed"` and a numeric `costUsd`.
  - `executeCell` with no usage records `cost_source = "unavailable"` and no `costUsd`.
  - Generated migration contains only `computed` / `unavailable` for `cost_source`.
- **Verification:** `eval-web` type-checks; `db:generate` produces a clean migration; no OpenRouter references remain in the app.

---

## Scope Boundaries

### Deferred to Follow-Up Work
- Updating the origin brainstorm (`docs/brainstorms/2026-06-13-image-model-eval-webapp-requirements.md`) and the U1 plan (`docs/plans/2026-06-13-001-feat-image-model-eval-webapp-plan.md`) to retire their OpenRouter / two-cost-source language. This plan marks those decisions superseded (KTD1); rewriting those docs is a separate cleanup.
- Adding a test runner to `@chorus/llm-core` if one is wanted for the scenarios above — the package has no test harness yet; scenarios may be wired during execution or deferred.

### Outside scope
- The rest of the plan-001 units (dataset ingestion, scoring, matrix, leaderboard) are unchanged by this trim.

---

## Dependencies / Assumptions

- Local Postgres is configured (`DATABASE_URL` set) and migrations have **not** been applied yet, so the `cost_source` enum can change without an alter-migration.
- API keys remain bring-your-own; only the OpenAI key is now relevant.
- Assumes OpenAI chat-completions `response_format` json_schema and `image_url` inputs for the model ids under test (validate `max_tokens` vs `max_completion_tokens` against the specific models when running — carried over from the U1 plan).

---

## Sources & Research

- Origin: `docs/brainstorms/2026-06-13-image-model-eval-webapp-requirements.md`; supersedes provider/cost scope in `docs/plans/2026-06-13-001-feat-image-model-eval-webapp-plan.md`.
- Target code (built earlier this session): `packages/llm-core/src/` (types, cost, proxy, providers, index) and `apps/eval-web/server/` (jobs/runOrchestrator, db/schema, .env.example).
