// Cell execution: the seam where the eval app calls llm-core. Given a resolved
// request, call OpenAI, capture latency, and record cost computed from usage ×
// pricing (or unavailable when usage is missing). DB persistence and fan-out
// enqueueing are marked TODO; this file establishes the typed contract.

import {
    getEvalProvider,
    getBareModelName,
    computeCostFromUsage,
    type ApiKeys,
    type CompletionRequest,
    type CostSource,
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

/**
 * Execute a single cell: call the model and compute cost from usage × pricing.
 * `modelId` is the OpenAI model name (a stray `provider::` prefix is tolerated).
 */
export async function executeCell(
    modelId: string,
    request: Omit<CompletionRequest, "model">,
    apiKeys: ApiKeys,
    pricing: ModelPricing | undefined,
): Promise<ExecutedCell> {
    const provider = getEvalProvider(apiKeys);

    const result = await provider.complete({
        ...request,
        model: getBareModelName(modelId),
    });

    const { costUsd, costSource } = resolveCost(result.usage, pricing);

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

function resolveCost(
    usage: UsageData,
    pricing: ModelPricing | undefined,
): { costUsd?: number; costSource: CostSource } {
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
