// LLM-as-judge: a configured OpenAI model scores an output against a rubric,
// returning a structured { score, rationale }. The judge can see the input, the
// model output, and (when present) the ground-truth label and gpt-4o reference.

import { getEvalProvider, type ApiKeys } from "@chorus/llm-core";

const JUDGE_SCHEMA = {
    name: "judge_verdict",
    schema: {
        type: "object",
        additionalProperties: false,
        required: ["score", "rationale"],
        properties: {
            score: {
                type: "number",
                description: "Quality from 0 (worst) to 1 (best).",
            },
            rationale: { type: "string" },
        },
    },
};

export interface JudgeInput {
    judgeModelId: string;
    rubricPrompt: string;
    apiKeys: ApiKeys;
    inputText?: string;
    hasImage: boolean;
    output: unknown;
    label?: unknown;
    reference?: unknown;
    maxTokens?: number;
}

export type JudgeOutcome =
    | { ok: true; score: number; rationale: string }
    | { ok: false; error: string };

export async function runJudge(input: JudgeInput): Promise<JudgeOutcome> {
    const provider = getEvalProvider(input.apiKeys);

    const sections: string[] = [input.rubricPrompt, ""];
    if (input.inputText) sections.push(`# Input\n${input.inputText}`);
    if (input.hasImage) sections.push(`# Input\n(an image was provided)`);
    sections.push(`# Model output\n${JSON.stringify(input.output, null, 2)}`);
    if (input.label !== undefined)
        sections.push(
            `# Ground-truth label\n${JSON.stringify(input.label, null, 2)}`,
        );
    if (input.reference !== undefined)
        sections.push(
            `# gpt-4o reference output\n${JSON.stringify(input.reference, null, 2)}`,
        );

    try {
        const result = await provider.complete({
            model: input.judgeModelId,
            system: "You are a strict evaluator. Score the model output per the rubric and return JSON.",
            prompt: sections.join("\n\n"),
            responseSchema: JUDGE_SCHEMA,
            maxTokens: input.maxTokens ?? 500,
        });

        if (result.schemaViolation || result.parsed === undefined) {
            return { ok: false, error: "Judge returned unparseable output" };
        }
        // result.parsed is JSON validated against JUDGE_SCHEMA on the wire
        // (strict mode); narrow it here to read the two known fields.
        const parsed = result.parsed as { score?: unknown; rationale?: unknown };
        const score = Number(parsed.score);
        if (Number.isNaN(score)) {
            return { ok: false, error: "Judge score was not a number" };
        }
        return {
            ok: true,
            score: Math.min(1, Math.max(0, score)),
            rationale:
                typeof parsed.rationale === "string" ? parsed.rationale : "",
        };
    } catch (err) {
        return {
            ok: false,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}
