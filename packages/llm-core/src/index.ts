// @chorus/llm-core — Tauri-free LLM eval engine extracted from the Chorus desktop
// app. Provides a single request/response completion call with latency capture,
// images, and JSON-schema-constrained structured output, plus pure cost helpers.
//
// Scope note: this package deliberately does NOT yet replace the desktop app's own
// provider/cost code. Rewiring the desktop app to consume it (U1's second half) is
// a separate, runtime-verified step. Today this is purely additive.

export * from "./types";
export * from "./cost";
export * from "./proxy";
export { getEvalProvider } from "./providers/factory";
export { OpenAICompatibleProvider } from "./providers/openaiCompatible";
export { AnthropicEvalProvider } from "./providers/anthropic";
export { parseStructuredOutput } from "./providers/structuredOutput";
