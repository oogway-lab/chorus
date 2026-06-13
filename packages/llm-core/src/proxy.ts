// Tauri-free port of canProceedWithProvider from src/core/utilities/ProxyUtils.ts.

import type { ApiKeys } from "./types";

export interface CanProceedResult {
    canProceed: boolean;
    reason?: string;
}

const PROVIDER_TO_API_KEY: Record<string, keyof ApiKeys> = {
    anthropic: "anthropic",
    openai: "openai",
    google: "google",
    perplexity: "perplexity",
    openrouter: "openrouter",
    grok: "grok",
};

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
    anthropic: "Anthropic",
    openai: "OpenAI",
    google: "Google AI",
    perplexity: "Perplexity",
    openrouter: "OpenRouter",
    grok: "xAI",
};

export function hasApiKey(
    providerKey: keyof ApiKeys,
    apiKeys: ApiKeys,
): boolean {
    return Boolean(apiKeys[providerKey]);
}

export function canProceedWithProvider(
    providerKey: string,
    apiKeys: ApiKeys,
): CanProceedResult {
    // Local models don't require API keys.
    if (providerKey === "ollama" || providerKey === "lmstudio") {
        return { canProceed: true };
    }

    const apiKeyField = PROVIDER_TO_API_KEY[providerKey];
    if (!apiKeyField) {
        return { canProceed: false, reason: `Unknown provider: ${providerKey}` };
    }

    if (!hasApiKey(apiKeyField, apiKeys)) {
        const displayName = PROVIDER_DISPLAY_NAMES[providerKey] || providerKey;
        return {
            canProceed: false,
            reason: `Please add your ${displayName} API key in Settings to use this model.`,
        };
    }

    return { canProceed: true };
}
