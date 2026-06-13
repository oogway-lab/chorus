---
date: 2026-06-13
topic: image-model-eval-webapp
---

# Image-Model Evaluation Webapp — Requirements

## Summary

A hosted, multi-user web app where a team runs an internal image dataset through several candidate models at once and reads a scored comparison matrix — per-image output, latency, cost, field-level accuracy against labels, and an LLM-judge score against a rubric — plus an aggregate leaderboard. The product centers on the comparison run: the team interprets the matrix and decides. Prompts are authored and versioned per model; the same harness also handles general text comparison, not just images. It is built as a new evaluation surface that reuses Chorus's model-provider and cost internals (`src/core/chorus/ModelProviders`, `src/core/chorus/api/CostAPI.ts`), not a re-skin of the whole Chorus app.

## Problem Frame

A client runs a production app that turns a photo of a food plate into structured output via an elaborate prompt and internal criteria. It runs on gpt-4o today, which gives decent results — but gpt-4o is heading toward deprecation, and the team wants to move to a newer model that costs less and ideally produces better results. They can't make that switch on vibes: they have an internal dataset of images and need to see, per model, whether quality holds (against partial ground-truth labels and against their criteria) and what it actually costs and how fast it is.

The pain is recurring, not one-time. New models ship continuously, and each time one does, the same question returns: is it cheaper, is it as good, should we switch? Today that comparison would be a manual, ad-hoc effort — run images by hand, eyeball JSON outputs, guess at cost. The team wants this turned into a repeatable workflow they own, so model migration becomes a routine they run rather than a project they dread.

## Key Decisions

- **Run-centered comparison matrix, not a decision cockpit.** The product is organized around the eval run and a scored matrix + leaderboard. The team reads the results and makes the migration call themselves; there is no automated pass/fail gating or formal "promote this model" artifact.
- **Dual scoring, because labels are only partial.** Each output is scored two ways where applicable: field-level diff against ground-truth labels where they exist, and an LLM-as-judge rubric score where they don't. Neither overrides the other — where both exist for an image, the matrix shows both side by side.
- **Manual per-model prompt variants over automated optimization.** Users author and version prompts per model by hand; the harness tracks which prompt version × model produced which scores, cost, and latency. An automated optimizer is explicitly a later phase, and the data model should leave room for it.
- **gpt-4o pinned as a reference column.** The current production model appears as a baseline column so candidates are always read against "what we run today," without turning that comparison into a gate.
- **Decision metric is projected production cost, not eval-run cost.** The matrix surfaces extrapolated cost per ~1,000 images per model+prompt as the headline cost number — the figure that actually drives the switch — separate from the (also-shown) cost of running the eval itself.
- **New hosted surface reusing Chorus internals.** Chorus today is a local Tauri/Mac app with local SQLite. This product is a hosted, multi-user web app and needs a server, a shared store, and accounts. It reuses Chorus's provider abstraction and cost calculation rather than reimplementing them. The specific architecture is for planning to settle.

## Actors

- A1. **Evaluator** — a client team member who configures and launches runs, authors prompt variants, and reads the matrix to decide on a model.
- A2. **Reviewer / labeler** — a team member who inspects outputs and may confirm or add ground-truth labels (lightweight; full labeling tooling is out of scope for v1).
- A3. **Eval system** — the background execution engine that fans a run out across images × models × prompts, calls providers, records cost/latency, and runs scorers.
- A4. **Model providers** — the external candidate models under test (and gpt-4o as reference), reached through the reused provider layer.
- A5. **Judge model** — a user-selected model invoked with a custom rubric prompt to score outputs. May be the same as or different from any candidate.

## Requirements

### Datasets and inputs

- R1. The app stores image datasets as first-class entities: a named, reusable collection of images that a run targets.
- R2. A dataset image may carry an optional ground-truth structured output (a label) and may have none; the dataset supports a mix of labeled and unlabeled images.
- R3. The app supports general text comparison inputs as well as images — a dataset item's input may be text-only, image(s), or image(s)+text.
- R4. The expected structured output has a defined schema per dataset (so field-level scoring knows what fields to compare); the app captures or references that schema.

### Run configuration

- R5. An Evaluator configures a run by selecting a dataset, a set of candidate models (3–6 typical), and the prompt variant to use for each model.
- R6. gpt-4o is includable as a reference model in any run and is visually distinguished as the incumbent baseline in results.
- R7. A run records its full configuration (dataset version, models, prompt versions, judge config) so results are reproducible and attributable.

### Prompt management

- R8. Prompts are authored and editable within the app, with a shared/default prompt as a starting point and per-model variants derived from it.
- R9. Prompts are versioned; every result is attributable to a specific prompt version × model, and prior versions remain readable for comparison.
- R10. The comparison surface lets an Evaluator compare the same model across prompt versions, and different models on their respective best prompts.

### Execution

- R11. A run executes as a background job: launching it does not block the UI, and the Evaluator sees live progress (cells completed / total, failures).
- R12. The engine handles partial failure — individual cell failures (one image × one model) are recorded and retryable without re-running the whole run.
- R13. Completed cells are cached/persisted so re-runs, retries, and added models reuse prior results instead of re-paying for them.
- R14. The engine enforces sane concurrency against provider rate limits and continues a run through transient provider errors.

### Scoring

- R15. For an image with a ground-truth label, the system computes a field-level diff between the model's structured output and the label, surfacing per-field correctness (so a regression in one field is visible, not hidden in an aggregate).
- R16. For any output, the system can run an LLM-as-judge scorer: a user-configured judge model invoked with a custom rubric prompt, returning a score plus a rationale.
- R17. Where both a label-diff score and a judge score exist for an image, both are shown side by side; neither is treated as canonical.
- R18. Scores aggregate to the model+prompt level for the leaderboard, while remaining drillable to the per-image cell.

### Judge configuration

- R19. The judge is configurable per run (or reusable across runs): the Evaluator picks the judge model and writes/edits the rubric prompt.
- R20. The judge prompt can reference the input, the model's output, and — where present — the ground-truth label and/or the gpt-4o reference output.

### Comparison surface

- R21. The central surface is a matrix of images (rows) × model-prompt cells (columns); each cell shows the structured output, latency, cost, and its score(s).
- R22. An aggregate leaderboard ranks model+prompt combinations across the dataset on quality score(s), latency, and cost.
- R23. The leaderboard surfaces projected production cost (extrapolated cost per ~1,000 items) per model+prompt as the headline cost figure, distinct from the eval-run cost.
- R24. Each cell records and displays measured latency and cost for that single query.

### Hosting and access

- R25. The app is hosted and multi-user: team members share datasets, runs, and results.
- R26. Runs and their results are persistent and shareable within the team (a teammate can open a completed run and read the same matrix).

## Key Flows

- F1. **Configure and launch a run**
  - **Trigger:** An Evaluator wants to compare candidate models on a dataset.
  - **Actors:** A1, A3
  - **Steps:** Select dataset → select candidate models (+ gpt-4o reference) → assign a prompt variant per model → configure the judge (model + rubric) → launch. The run starts as a background job.
  - **Covered by:** R1, R5, R6, R7, R11, R19

- F2. **Run executes and scores**
  - **Trigger:** A run is launched.
  - **Actors:** A3, A4, A5
  - **Steps:** The engine fans out across images × models, calling providers and recording per-cell latency and cost; completed cells persist. For each output it runs field-diff (where a label exists) and the judge scorer. Failed cells are recorded and retryable. Progress updates live.
  - **Covered by:** R11, R12, R13, R14, R15, R16, R24

- F3. **Read results and decide**
  - **Trigger:** A run completes (or partially completes).
  - **Actors:** A1
  - **Steps:** The Evaluator opens the leaderboard, compares candidates against the gpt-4o reference on quality, latency, and projected production cost, then drills into the matrix and individual cells (including per-field diffs and judge rationales) to confirm before choosing a model.
  - **Covered by:** R6, R17, R18, R21, R22, R23

- F4. **Iterate on a prompt**
  - **Trigger:** A candidate model underperforms on its current prompt.
  - **Actors:** A1
  - **Steps:** The Evaluator edits that model's prompt variant (creating a new version), re-runs only the affected cells (reusing cached results elsewhere), and compares the new prompt version against the prior one.
  - **Covered by:** R8, R9, R10, R13

## Acceptance Examples

- AE1. **Covers R2, R15, R17.** Given a dataset where image X has a ground-truth label and image Y does not, when a run completes, then X's cell shows a field-level diff score (and a judge score if the judge ran), and Y's cell shows only the judge score — and where both exist they appear side by side with neither marked canonical.
- AE2. **Covers R12, R13.** Given a run where 3 of 200 cells failed on a provider timeout, when the Evaluator retries, then only those 3 cells re-execute and the other 197 are reused from cache without additional cost.
- AE3. **Covers R15.** Given a model that gets the food items right but the calorie field wrong, when results render, then the per-field diff shows the calorie field as incorrect rather than collapsing the cell into a single pass/fail.
- AE4. **Covers R6, R23.** Given gpt-4o as the reference column and two candidate models, when the leaderboard renders, then each candidate's projected per-1,000-image production cost is shown next to gpt-4o's, distinct from the cost of running this eval.
- AE5. **Covers R3, R15, R16.** Given a text-only dataset item with no schema-defined label, when a run completes, then the cell is scored by the judge alone (no field diff), confirming the harness degrades cleanly from structured-image to general-text comparison.

## Success Criteria

- The team can, in one run, see for each candidate model: quality (field-diff and/or judge), latency, and projected production cost against the gpt-4o reference — enough to choose a replacement without manual spreadsheet work.
- A re-run after a prompt edit re-executes only what changed, so iterating on prompts is cheap in both time and API spend.
- A teammate who did not launch a run can open it later and read the same matrix and leaderboard.
- The same harness produces sensible results for a general text-comparison dataset, not only the food-image case.

## Scope Boundaries

### Deferred for later

- Automated prompt optimization (propose variants, use the judge as a fitness function, converge on the best prompt per model). The data model should not preclude it.
- Rich labeling/annotation tooling for building ground truth at scale (e.g., promoting trusted gpt-4o outputs to silver labels with human confirmation). v1 accepts existing partial labels and optional lightweight confirmation only.
- Formal pass/fail gating and a "promote this model" decision artifact (the cockpit framing set aside in favor of the run-centered matrix).

### Outside this product's identity

- This is not the production inference path. It is an offline evaluation tool; it does not serve live food-plate requests.
- It is not a port of Chorus's chat, projects, or ambient-chat features. It reuses Chorus's provider and cost internals but is a distinct evaluation surface.

## Dependencies / Assumptions

- Reuses Chorus's model-provider abstraction (`src/core/chorus/ModelProviders`) and cost calculation (`src/core/chorus/api/CostAPI.ts`); these are assumed adaptable to a server context.
- Assumes candidate models expose comparable structured-output behavior (JSON against the dataset schema) so field-level diffs are meaningful across providers.
- Assumes the client can provide their dataset, the output schema, their partial labels, and their evaluation criteria (for the judge rubric).
- Assumes "medium" run scale (≈100–1,000 images × 3–6 models per run), which sets background-execution and caching as baseline requirements rather than optional.
- Assumes the team supplies their own provider API keys (consistent with Chorus's bring-your-own-keys model).

## Outstanding Questions

### Resolve before planning

- Hosting and accounts: what server/store/auth foundation does the client want (new backend, extend the existing app.chorus.sh backend, or self-host)? This gates the architecture.
- Structured-output schema source: is there one canonical schema per dataset, or can it vary per image? Affects how field-diff is configured.
- Field-diff semantics: exact-match per field, normalized match, or tolerance for numeric/near-miss fields (e.g., calories within a range)? Determines what "correct" means.

### Deferred to planning

- Concrete background-job/queue mechanism and concurrency controls.
- How projected production cost is extrapolated (flat per-item average vs. token-weighted).
- Storage and handling of image data (size limits, retention, privacy).
- Whether judge configs are run-scoped only or reusable library objects.
