// Pure, Tauri-free types shared by the eval engine.
//
// These mirror the equivalents in the Chorus desktop app
// (src/core/chorus/Models.ts, src/core/chorus/api/CostAPI.ts) but are intentionally
// scoped to what a server-side eval harness needs: a single request/response call,
// optional images, optional JSON-schema-constrained output, and per-call usage/latency.
// Nothing here imports @tauri-apps/*, so the package is safe to run in Node.

/** Providers the eval engine can target. Mirrors the desktop app's provider set. */
export type ProviderName =
    | "anthropic"
    | "openai"
    | "google"
    | "openrouter"
    | "grok"
    | "perplexity"
    | "ollama"
    | "lmstudio";

/** Bring-your-own provider API keys. Matches the desktop `ApiKeys` shape. */
export interface ApiKeys {
    anthropic?: string;
    openai?: string;
    perplexity?: string;
    openrouter?: string;
    google?: string;
    grok?: string;
}

/** Token usage returned by a provider. All optional — some providers omit it. */
export interface UsageData {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    /** OpenRouter generation id, used to fetch authoritative cost after the call. */
    generationId?: string;
}

/**
 * Which source produced a cell's cost. Pinned per call so a leaderboard never
 * silently mixes authoritative OpenRouter cost with statically-computed cost (KTD4).
 */
export type CostSource =
    | "openrouter_authoritative"
    | "computed"
    | "unavailable";

/** An already-encoded image. The Node image source produces these (no Tauri fs). */
export interface EvalImage {
    /** e.g. "image/jpeg", "image/png". */
    mimeType: string;
    /** Base64-encoded bytes, no data: prefix. */
    base64Data: string;
}

/** A JSON-schema the model output must conform to (structured output, U3). */
export interface ResponseSchema {
    /** Schema name (required by OpenAI json_schema mode). */
    name: string;
    /** A JSON Schema object describing the expected output. */
    schema: Record<string, unknown>;
}

/** A single eval completion request. */
export interface CompletionRequest {
    /** Bare model name without the `provider::` prefix (e.g. "gpt-4o"). */
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
    /** Wall-clock duration of the call in milliseconds (KTD5 — new to Chorus). */
    latencyMs: number;
}

/** Tauri-free completion interface for batch eval (cf. desktop ISimpleCompletionProvider). */
export interface IEvalCompletionProvider {
    complete(req: CompletionRequest): Promise<CompletionResult>;
}

/**
 * Split a `provider::model` id into its provider.
 * Mirrors `getProviderName` in the desktop Models.ts.
 */
export function getProviderName(modelId: string): ProviderName | undefined {
    const [provider] = modelId.split("::");
    const known: ProviderName[] = [
        "anthropic",
        "openai",
        "google",
        "openrouter",
        "grok",
        "perplexity",
        "ollama",
        "lmstudio",
    ];
    return known.includes(provider as ProviderName)
        ? (provider as ProviderName)
        : undefined;
}

/** Strip the `provider::` prefix, returning the bare model name. */
export function getBareModelName(modelId: string): string {
    const idx = modelId.indexOf("::");
    return idx === -1 ? modelId : modelId.slice(idx + 2);
}
