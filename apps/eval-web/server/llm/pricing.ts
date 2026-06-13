// Static OpenAI pricing (USD per token). Live pricing fetch is deferred; this
// covers the current OpenAI eval models. Unknown models return undefined so the
// cell records cost_source = "unavailable" rather than a wrong number.

export interface ModelPricing {
    promptPricePerToken: number;
    completionPricePerToken: number;
}

const M = 1_000_000;

// USD per 1M tokens → per token, [prompt, completion].
const PRICING: Record<string, [number, number]> = {
    "gpt-4o": [2.5 / M, 10 / M],
    "gpt-4o-mini": [0.15 / M, 0.6 / M],
    "gpt-4.1": [2 / M, 8 / M],
    "gpt-4.1-mini": [0.4 / M, 1.6 / M],
    "gpt-4.1-nano": [0.1 / M, 0.4 / M],
    "o3": [2 / M, 8 / M],
    "o4-mini": [1.1 / M, 4.4 / M],
    "gpt-5": [1.25 / M, 10 / M],
    "gpt-5-mini": [0.25 / M, 2 / M],
    "gpt-5-nano": [0.05 / M, 0.4 / M],
};

export function pricingFor(modelId: string): ModelPricing | undefined {
    // Prefer the most specific (longest) key so "gpt-4o-mini" matches its own
    // entry instead of the "gpt-4o" prefix — otherwise -mini/-nano variants get
    // billed at the (much higher) parent model's rate.
    const key = Object.keys(PRICING)
        .sort((a, b) => b.length - a.length)
        .find((k) => modelId === k || modelId.startsWith(`${k}-`));
    if (!key) return undefined;
    const [promptPricePerToken, completionPricePerToken] = PRICING[key];
    return { promptPricePerToken, completionPricePerToken };
}
