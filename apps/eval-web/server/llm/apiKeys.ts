import type { ApiKeys } from "@chorus/llm-core";

/**
 * Resolve provider API keys for an eval run. Local/dev fallback that reads the
 * OpenAI key from the environment. Per-team key storage (DB, encrypted) will
 * supersede this — when a team key exists it should take precedence over env.
 */
export function apiKeysFromEnv(): ApiKeys {
    return { openai: process.env.OPENAI_API_KEY };
}
