// Drizzle schema for the eval app. Uses normal Postgres constraints (foreign keys),
// per KTD6 — Chorus's "no foreign keys" rule is a SQLite-app policy, not carried here.
// All team-owned rows carry team_id and reads/writes are team-scoped in the app layer.

import {
    pgTable,
    pgEnum,
    uuid,
    text,
    integer,
    doublePrecision,
    jsonb,
    boolean,
    timestamp,
    unique,
    index,
} from "drizzle-orm/pg-core";
import type {
    FieldRule,
    JsonSchemaObject,
    LabelJson,
    OutputJson,
    RunConfigSnapshot,
} from "./jsonTypes";

export const itemType = pgEnum("item_type", ["image", "text", "mixed"]);
export const promptScope = pgEnum("prompt_scope", ["shared", "model"]);
export const runStatus = pgEnum("run_status", [
    "pending",
    "running",
    "completed",
    "partial",
    "failed",
]);
export const cellStatus = pgEnum("cell_status", [
    "pending",
    "running",
    "succeeded",
    "failed",
    "cached",
]);
export const costSource = pgEnum("cost_source", ["computed", "unavailable"]);
export const scorerType = pgEnum("scorer_type", ["field_diff", "judge"]);

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () =>
    timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const teams = pgTable("teams", {
    id: id(),
    name: text("name").notNull(),
    createdAt: createdAt(),
});

export const users = pgTable("users", {
    id: id(),
    teamId: uuid("team_id")
        .notNull()
        .references(() => teams.id),
    email: text("email").notNull().unique(),
    name: text("name"),
    createdAt: createdAt(),
}, (t) => [index("users_team_id_idx").on(t.teamId)]);

export const datasets = pgTable("datasets", {
    id: id(),
    teamId: uuid("team_id")
        .notNull()
        .references(() => teams.id),
    name: text("name").notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: createdAt(),
}, (t) => [index("datasets_team_id_idx").on(t.teamId)]);

// One canonical output schema per dataset (resolved assumption). field_rules maps
// each schema field to its matcher: exact | numeric_tolerance | set_overlap (KTD7).
export const datasetSchemas = pgTable("dataset_schemas", {
    id: id(),
    datasetId: uuid("dataset_id")
        .notNull()
        .references(() => datasets.id)
        .unique(),
    jsonSchema: jsonb("json_schema").$type<JsonSchemaObject>().notNull(),
    fieldRules: jsonb("field_rules").$type<FieldRule[]>().notNull(),
    createdAt: createdAt(),
});

export const datasetItems = pgTable("dataset_items", {
    id: id(),
    datasetId: uuid("dataset_id")
        .notNull()
        .references(() => datasets.id),
    type: itemType("type").notNull(),
    inputText: text("input_text"),
    // Object-storage key or blob reference for image bytes (substrate TBD in impl).
    storageKey: text("storage_key"),
    mimeType: text("mime_type"),
    createdAt: createdAt(),
}, (t) => [index("dataset_items_dataset_id_idx").on(t.datasetId)]);

// Optional ground-truth label per item (partial labels supported).
export const labels = pgTable("labels", {
    id: id(),
    datasetItemId: uuid("dataset_item_id")
        .notNull()
        .references(() => datasetItems.id)
        .unique(),
    labelJson: jsonb("label_json").$type<LabelJson>().notNull(),
    createdAt: createdAt(),
});

export const prompts = pgTable("prompts", {
    id: id(),
    teamId: uuid("team_id")
        .notNull()
        .references(() => teams.id),
    name: text("name").notNull(),
    scope: promptScope("scope").notNull(),
    // For per-model variants: the shared prompt they derive from.
    basePromptId: uuid("base_prompt_id"),
    createdAt: createdAt(),
}, (t) => [index("prompts_team_id_idx").on(t.teamId)]);

export const promptVersions = pgTable(
    "prompt_versions",
    {
        id: id(),
        promptId: uuid("prompt_id")
            .notNull()
            .references(() => prompts.id),
        version: integer("version").notNull(),
        content: text("content").notNull(),
        createdBy: uuid("created_by").references(() => users.id),
        createdAt: createdAt(),
    },
    (t) => [unique().on(t.promptId, t.version)],
);

export const judgeConfigs = pgTable("judge_configs", {
    id: id(),
    teamId: uuid("team_id")
        .notNull()
        .references(() => teams.id),
    name: text("name").notNull(),
    modelId: text("model_id").notNull(),
    rubricPrompt: text("rubric_prompt").notNull(),
    createdAt: createdAt(),
}, (t) => [index("judge_configs_team_id_idx").on(t.teamId)]);

export const runs = pgTable("runs", {
    id: id(),
    teamId: uuid("team_id")
        .notNull()
        .references(() => teams.id),
    datasetId: uuid("dataset_id")
        .notNull()
        .references(() => datasets.id),
    judgeConfigId: uuid("judge_config_id").references(() => judgeConfigs.id),
    status: runStatus("status").notNull().default("pending"),
    // Frozen config snapshot for reproducibility (R7).
    configSnapshot: jsonb("config_snapshot")
        .$type<RunConfigSnapshot>()
        .notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: createdAt(),
}, (t) => [index("runs_team_id_idx").on(t.teamId)]);

export const runModels = pgTable("run_models", {
    id: id(),
    runId: uuid("run_id")
        .notNull()
        .references(() => runs.id),
    modelId: text("model_id").notNull(),
    promptVersionId: uuid("prompt_version_id")
        .notNull()
        .references(() => promptVersions.id),
    // gpt-4o reference column flag (R6).
    isReference: boolean("is_reference").notNull().default(false),
}, (t) => [index("run_models_run_id_idx").on(t.runId)]);

export const runCells = pgTable(
    "run_cells",
    {
        id: id(),
        runId: uuid("run_id")
            .notNull()
            .references(() => runs.id),
        datasetItemId: uuid("dataset_item_id")
            .notNull()
            .references(() => datasetItems.id),
        runModelId: uuid("run_model_id")
            .notNull()
            .references(() => runModels.id),
        status: cellStatus("status").notNull().default("pending"),
        outputJson: jsonb("output_json").$type<OutputJson>(),
        latencyMs: doublePrecision("latency_ms"),
        costUsd: doublePrecision("cost_usd"),
        costSource: costSource("cost_source"),
        promptTokens: integer("prompt_tokens"),
        completionTokens: integer("completion_tokens"),
        error: text("error"),
        createdAt: createdAt(),
    },
    (t) => [
        unique().on(t.runId, t.datasetItemId, t.runModelId),
        index("run_cells_run_id_idx").on(t.runId),
        index("run_cells_dataset_item_id_idx").on(t.datasetItemId),
    ],
);

export const cellScores = pgTable("cell_scores", {
    id: id(),
    runCellId: uuid("run_cell_id")
        .notNull()
        .references(() => runCells.id),
    scorerType: scorerType("scorer_type").notNull(),
    score: doublePrecision("score"),
    // Per-field diff results, or judge structured detail.
    detailsJson: jsonb("details_json"),
    rationale: text("rationale"),
    createdAt: createdAt(),
}, (t) => [index("cell_scores_run_cell_id_idx").on(t.runCellId)]);
