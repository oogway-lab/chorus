// Cell execution: the seam where the eval app calls llm-core. This is the core of
// U7 — given a resolved request, call the provider, capture latency, and pin a
// canonical cost source per cell (KTD4). DB persistence and fan-out enqueueing are
// marked TODO; this file establishes the typed contract and the llm-core wiring.

import {
    getEvalProvider,
    getProviderName,
    getBareModelName,
    computeCostFromUsage,
    fetchOpenRouterCost,
    type ApiKeys,
    type CompletionRequest,
    type CostSource,
    type OpenRouterAttribution,
    type UsageData,
} from "@chorus/llm-core";

export interface ModelPricing {
    promptPricePerToken: number;
    completionPricePerToken: number;
}

export interface ExecutedCell {
    outputText: string;
    parsed?: unknown;
    schemaViolation: boolean;
    usage: UsageData;
    latencyMs: number;
    costUsd?: number;
    costSource: CostSource;
}

export function attributionFromEnv(): OpenRouterAttribution {
    return {
        referer: process.env.OPENROUTER_REFERER ?? "https://example.com",
        title: process.env.OPENROUTER_TITLE ?? "Model Eval",
    };
}

/**
 * Execute a single cell: call the model and resolve cost from one canonical source.
 * `modelId` is the full `provider::model` id; the request carries the bare name.
 */
export async function executeCell(
    modelId: string,
    request: Omit<CompletionRequest, "model">,
    apiKeys: ApiKeys,
    pricing: ModelPricing | undefined,
): Promise<ExecutedCell> {
    const attribution = attributionFromEnv();
    const provider = getEvalProvider(modelId, apiKeys, attribution);

    const result = await provider.complete({
        ...request,
        model: getBareModelName(modelId),
    });

    const { costUsd, costSource } = await resolveCost(
        modelId,
        result.usage,
        apiKeys,
        pricing,
        attribution,
    );

    return {
        outputText: result.text,
        parsed: result.parsed,
        schemaViolation: result.schemaViolation ?? false,
        usage: result.usage,
        latencyMs: result.latencyMs,
        costUsd,
        costSource,
    };
}

async function resolveCost(
    modelId: string,
    usage: UsageData,
    apiKeys: ApiKeys,
    pricing: ModelPricing | undefined,
    attribution: OpenRouterAttribution,
): Promise<{ costUsd?: number; costSource: CostSource }> {
    // Prefer OpenRouter's authoritative cost when available.
    if (
        getProviderName(modelId) === "openrouter" &&
        usage.generationId &&
        apiKeys.openrouter
    ) {
        const authoritative = await fetchOpenRouterCost(
            usage.generationId,
            apiKeys.openrouter,
            attribution,
        );
        if (authoritative) {
            return {
                costUsd: authoritative.cost,
                costSource: "openrouter_authoritative",
            };
        }
    }

    // Otherwise compute from token usage × static pricing.
    if (pricing) {
        const computed = computeCostFromUsage(
            usage,
            pricing.promptPricePerToken,
            pricing.completionPricePerToken,
        );
        if (computed !== undefined) {
            return { costUsd: computed, costSource: "computed" };
        }
    }

    return { costSource: "unavailable" };
}
