// Pure cost helpers. Cost is computed from OpenAI token usage × pricing; there is
// no authoritative external cost source.

import type { UsageData } from "./types";

/** Cost from token usage and per-token pricing. */
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
 * leaderboard figure, distinct from the eval-run cost.
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

/** Display formatting. Examples: "$0.0023", "0.20¢", "$3.20". */
export function formatCost(costUsd: number | null | undefined): string {
    if (costUsd === null || costUsd === undefined) return "–";
    if (costUsd === 0) return "$0.00";
    if (costUsd < 0.01) return `${(costUsd * 100).toFixed(2)}¢`;
    if (costUsd < 1.0) return `$${costUsd.toFixed(4)}`;
    return `$${costUsd.toFixed(2)}`;
}
