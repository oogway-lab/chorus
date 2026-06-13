// Pure cost helpers, ported verbatim in behavior from
// src/core/chorus/api/CostAPI.ts (the SQLite-bound aggregation functions are
// intentionally NOT ported — the eval app aggregates against its own schema).

import type { UsageData } from "./types";

/** Identity/attribution headers for OpenRouter. Configurable per consuming app. */
export interface OpenRouterAttribution {
    referer: string;
    title: string;
}

interface OpenRouterGenerationResponse {
    data: {
        id: string;
        model: string;
        generation_time: number;
        tokens_prompt: number;
        tokens_completion: number;
        native_tokens_prompt?: number;
        native_tokens_completion?: number;
        usage: number;
        latency?: number;
        total_cost: number;
    };
}

/**
 * Authoritative cost from OpenRouter's generation endpoint (tiered pricing,
 * caching, etc.). Unlike the desktop version, this also surfaces the latency
 * fields OpenRouter already returns (KTD5) instead of discarding them.
 */
export async function fetchOpenRouterCost(
    generationId: string,
    apiKey: string,
    attribution: OpenRouterAttribution,
): Promise<{
    cost: number;
    promptTokens: number;
    completionTokens: number;
    generationTimeMs?: number;
    latencyMs?: number;
} | null> {
    try {
        const response = await fetch(
            `https://openrouter.ai/api/v1/generation?id=${generationId}`,
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "HTTP-Referer": attribution.referer,
                    "X-Title": attribution.title,
                },
            },
        );

        if (!response.ok) {
            console.warn(
                `Failed to fetch OpenRouter generation data: ${response.status}`,
            );
            return null;
        }

        const data = (await response.json()) as OpenRouterGenerationResponse;

        return {
            cost: data.data.total_cost,
            promptTokens:
                data.data.native_tokens_prompt ?? data.data.tokens_prompt,
            completionTokens:
                data.data.native_tokens_completion ??
                data.data.tokens_completion,
            generationTimeMs: data.data.generation_time,
            latencyMs: data.data.latency,
        };
    } catch (error) {
        console.error("Error fetching OpenRouter generation cost:", error);
        return null;
    }
}

/** Cost from token usage and per-token pricing (fallback for non-OpenRouter models). */
export function calculateCost(
    promptTokens: number,
    completionTokens: number,
    promptPricePerToken: number,
    completionPricePerToken: number,
): number {
    return (
        promptTokens * promptPricePerToken +
        completionTokens * completionPricePerToken
    );
}

/**
 * Compute cost from a UsageData + pricing, returning undefined when usage is
 * missing so callers can record a `cost_source: "unavailable"` cell rather than
 * a misleading $0.
 */
export function computeCostFromUsage(
    usage: UsageData,
    promptPricePerToken: number,
    completionPricePerToken: number,
): number | undefined {
    if (usage.promptTokens === undefined || usage.completionTokens === undefined)
        return undefined;
    return calculateCost(
        usage.promptTokens,
        usage.completionTokens,
        promptPricePerToken,
        completionPricePerToken,
    );
}

/**
 * Project a per-item average cost out to a production volume — the headline
 * leaderboard figure (R23), distinct from the eval-run cost.
 */
export function projectProductionCost(
    perItemCostsUsd: number[],
    volume = 1000,
): number | undefined {
    if (perItemCostsUsd.length === 0) return undefined;
    const mean =
        perItemCostsUsd.reduce((sum, c) => sum + c, 0) / perItemCostsUsd.length;
    return mean * volume;
}

/** Display formatting, ported verbatim from CostAPI.formatCost. */
export function formatCost(costUsd: number | null | undefined): string {
    if (costUsd === null || costUsd === undefined) return "–";
    if (costUsd === 0) return "$0.00";
    if (costUsd < 0.01) return `${(costUsd * 100).toFixed(2)}¢`;
    if (costUsd < 1.0) return `$${costUsd.toFixed(4)}`;
    return `$${costUsd.toFixed(2)}`;
}
