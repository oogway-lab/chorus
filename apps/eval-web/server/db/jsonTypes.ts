// Shared shapes for jsonb columns and scoring, so schema columns can be typed
// with `.$type<...>()` and the rest of the app reads them without casts.

export type FieldMatcher = "exact" | "numeric_tolerance" | "set_overlap";

export type FieldRule =
    | { field: string; matcher: "exact" }
    | {
          field: string;
          matcher: "numeric_tolerance";
          /** Allowed deviation. Relative (fraction of expected) when `relative`. */
          tolerance: number;
          relative?: boolean;
      }
    | { field: string; matcher: "set_overlap" };

export type JsonSchemaObject = Record<string, unknown>;
export type LabelJson = Record<string, unknown>;
export type OutputJson = Record<string, unknown>;

export interface RunModelSpec {
    modelId: string;
    promptVersionId: string;
    isReference: boolean;
}

export interface RunConfigSnapshot {
    datasetId: string;
    models: RunModelSpec[];
    judgeConfigId?: string;
    /** Max output tokens per call. */
    maxTokens: number;
}

export interface FieldResult {
    field: string;
    matcher: FieldMatcher;
    score: number;
    expected: unknown;
    actual: unknown;
}

export interface FieldDiffDetails {
    fields: FieldResult[];
}
