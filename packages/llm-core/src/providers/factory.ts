// Selects the right eval provider for a `provider::model` id, given the team's
// API keys. Base URLs mirror the desktop app's OpenAI-compatible providers.

import type { ApiKeys, IEvalCompletionProvider } from "../types";
import { getProviderName } from "../types";
import { canProceedWithProvider } from "../proxy";
import type { OpenRouterAttribution } from "../cost";
import { AnthropicEvalProvider } from "./anthropic";
import {
    OpenAICompatibleProvider,
    type OpenAICompatibleConfig,
} from "./openaiCompatible";

const OPENAI_COMPATIBLE_BASE_URLS: Partial<Record<string, string>> = {
    google: "https://generativelanguage.googleapis.com/v1beta/openai",
    openrouter: "https://openrouter.ai/api/v1",
    grok: "https://api.x.ai/v1",
    perplexity: "https://api.perplexity.ai",
    // openai uses the SDK default base URL.
};

export function getEvalProvider(
    modelId: string,
    apiKeys: ApiKeys,
    attribution: OpenRouterAttribution,
): IEvalCompletionProvider {
    const provider = getProviderName(modelId);
    if (!provider) {
        throw new Error(`Unknown provider in model id: ${modelId}`);
    }

    const check = canProceedWithProvider(provider, apiKeys);
    if (!check.canProceed) {
        throw new Error(check.reason ?? `Cannot use provider ${provider}`);
    }

    if (provider === "anthropic") {
        return new AnthropicEvalProvider(apiKeys.anthropic!);
    }

    const apiKeyByProvider: Partial<Record<string, string | undefined>> = {
        openai: apiKeys.openai,
        google: apiKeys.google,
        openrouter: apiKeys.openrouter,
        grok: apiKeys.grok,
        perplexity: apiKeys.perplexity,
    };
    const apiKey = apiKeyByProvider[provider];
    if (!apiKey) {
        throw new Error(`No API key configured for provider ${provider}`);
    }

    const config: OpenAICompatibleConfig = {
        apiKey,
        baseURL: OPENAI_COMPATIBLE_BASE_URLS[provider],
        capturesGenerationId: provider === "openrouter",
        defaultHeaders:
            provider === "openrouter"
                ? {
                      "HTTP-Referer": attribution.referer,
                      "X-Title": attribution.title,
                  }
                : undefined,
    };
    return new OpenAICompatibleProvider(config);
}
