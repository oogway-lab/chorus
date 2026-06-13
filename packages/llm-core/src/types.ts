// Pure, Tauri-free types for the OpenAI-only eval engine.
//
// Scoped to what a server-side eval harness needs: a single request/response call,
// optional images, optional JSON-schema-constrained output, and per-call
// usage/latency. Nothing here imports @tauri-apps/*, so the package runs in Node.

/** Bring-your-own provider API keys. OpenAI only. */
export interface ApiKeys {
    openai?: string;
}

/** Token usage returned by a provider. All optional — some responses omit it. */
export interface UsageData {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
}

/**
 * Which source produced a cell's cost. Cost is always computed from usage ×
 * pricing, or unavailable when usage is missing.
 */
export type CostSource = "computed" | "unavailable";

/** An already-encoded image. The Node image source produces these (no Tauri fs). */
export interface EvalImage {
    /** e.g. "image/jpeg", "image/png". */
    mimeType: string;
    /** Base64-encoded bytes, no data: prefix. */
    base64Data: string;
}

/** A JSON-schema the model output must conform to (structured output). */
export interface ResponseSchema {
    /** Schema name (required by OpenAI json_schema mode). */
    name: string;
    /** A JSON Schema object describing the expected output. */
    schema: Record<string, unknown>;
}

/** A single eval completion request. */
export interface CompletionRequest {
    /** OpenAI model name (e.g. "gpt-4o"). */
    model: string;
    system?: string;
    prompt: string;
    images?: EvalImage[];
    /** When set, the provider is asked to return JSON conforming to this schema. */
    responseSchema?: ResponseSchema;
    maxTokens: number;
    temperature?: number;
}

/** The result of a single eval completion. */
export interface CompletionResult {
    /** Raw text output. */
    text: string;
    /** Parsed object when `responseSchema` was provided and parsing succeeded. */
    parsed?: unknown;
    /**
     * True when `responseSchema` was provided but the output could not be parsed
     * into JSON. Distinct from a transport error — scoring handles this explicitly.
     */
    schemaViolation?: boolean;
    usage: UsageData;
    /** Wall-clock duration of the call in milliseconds. */
    latencyMs: number;
}

/** Tauri-free completion interface for batch eval. */
export interface IEvalCompletionProvider {
    complete(req: CompletionRequest): Promise<CompletionResult>;
}

/**
 * Strip a `provider::` prefix if one is present, returning the bare model name.
 * Kept so a stray prefixed id still resolves to a usable OpenAI model name.
 */
export function getBareModelName(modelId: string): string {
    const idx = modelId.indexOf("::");
    return idx === -1 ? modelId : modelId.slice(idx + 2);
}
