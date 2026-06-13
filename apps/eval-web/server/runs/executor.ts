// Run executor: fans a run out across its pending cells with bounded concurrency,
// reuses prior generations (cache), calls the model, persists each cell, and runs
// scoring (field diff + judge) inline. Invoked in-process for local dev; the same
// per-cell work is what a pg-boss worker would call in the hosted path.

import { and, eq, inArray } from "drizzle-orm";
import { getBareModelName } from "@chorus/llm-core";
import { db } from "../db/client";
import {
    runs,
    runCells,
    cellScores,
    datasetItems,
    judgeConfigs,
} from "../db/schema";
import type { OutputJson } from "../db/jsonTypes";
import {
    getRun,
    getRunModels,
    getRunCells,
    findCachedCell,
} from "./service";
import { getPromptVersion } from "../prompts/service";
import { getDatasetSchema, getLabelForItem } from "../datasets/service";
import { loadImage } from "../images/source";
import { executeCell } from "../jobs/runOrchestrator";
import { apiKeysFromEnv } from "../llm/apiKeys";
import { pricingFor } from "../llm/pricing";
import { scoreFieldDiff } from "../scoring/fieldDiff";
import { runJudge } from "../scoring/judge";
import type { EvalImage } from "@chorus/llm-core";

const CONCURRENCY = Number(process.env.EVAL_CONCURRENCY ?? 5);

function asObject(v: unknown): Record<string, unknown> | undefined {
    return v && typeof v === "object" && !Array.isArray(v)
        ? (v as Record<string, unknown>)
        : undefined;
}

async function runPool<T>(
    items: T[],
    limit: number,
    worker: (item: T) => Promise<void>,
): Promise<void> {
    let idx = 0;
    const lanes = Array.from(
        { length: Math.min(limit, items.length) },
        async () => {
            while (idx < items.length) {
                const i = idx++;
                await worker(items[i]);
            }
        },
    );
    await Promise.all(lanes);
}

export async function executeRun(runId: string): Promise<void> {
    const run = await getRun(runId);
    if (!run) throw new Error(`run ${runId} not found`);

    const apiKeys = apiKeysFromEnv();
    const schemaRow = await getDatasetSchema(run.datasetId);
    const responseSchema = schemaRow
        ? { name: "output", schema: schemaRow.jsonSchema }
        : undefined;
    const fieldRules = schemaRow?.fieldRules ?? [];

    const runModelRows = await getRunModels(runId);
    const modelById = new Map(runModelRows.map((rm) => [rm.id, rm]));
    const referenceModel = runModelRows.find((rm) => rm.isReference);

    let judge: typeof judgeConfigs.$inferSelect | undefined;
    if (run.judgeConfigId) {
        const [j] = await db
            .select()
            .from(judgeConfigs)
            .where(eq(judgeConfigs.id, run.judgeConfigId))
            .limit(1);
        judge = j;
    }

    const itemRows = await db
        .select()
        .from(datasetItems)
        .where(eq(datasetItems.datasetId, run.datasetId));
    const itemById = new Map(itemRows.map((i) => [i.id, i]));

    const promptCache = new Map<string, string>();
    const promptContent = async (pvId: string): Promise<string> => {
        if (!promptCache.has(pvId)) {
            const pv = await getPromptVersion(pvId);
            promptCache.set(pvId, pv?.content ?? "");
        }
        return promptCache.get(pvId) ?? "";
    };

    await db.update(runs).set({ status: "running" }).where(eq(runs.id, runId));

    const cells = (await getRunCells(runId)).filter(
        (c) => c.status === "pending" || c.status === "failed",
    );

    await runPool(cells, CONCURRENCY, async (cell) => {
        const rm = modelById.get(cell.runModelId);
        const item = itemById.get(cell.datasetItemId);
        if (!rm || !item) return;

        try {
            let outputJson: OutputJson | null;
            let latencyMs: number | null;
            let costUsd: number | undefined;
            let costSource: "computed" | "unavailable";
            let promptTokens: number | undefined;
            let completionTokens: number | undefined;
            let status: "succeeded" | "cached";

            const cached = await findCachedCell(
                item.id,
                rm.id,
                rm.modelId,
                rm.promptVersionId,
                runId,
            );

            if (cached) {
                outputJson = cached.outputJson;
                latencyMs = cached.latencyMs;
                costUsd = cached.costUsd ?? undefined;
                costSource = cached.costSource ?? "unavailable";
                promptTokens = cached.promptTokens ?? undefined;
                completionTokens = cached.completionTokens ?? undefined;
                status = "cached";
            } else {
                const content = await promptContent(rm.promptVersionId);
                const prompt = item.inputText
                    ? `${content}\n\n${item.inputText}`
                    : content;
                const images: EvalImage[] = [];
                if (item.storageKey && item.mimeType) {
                    images.push(
                        await loadImage(item.storageKey, item.mimeType),
                    );
                }
                const exec = await executeCell(
                    rm.modelId,
                    {
                        prompt,
                        images,
                        responseSchema,
                        maxTokens: run.configSnapshot.maxTokens,
                    },
                    apiKeys,
                    pricingFor(rm.modelId),
                );
                const obj = asObject(exec.parsed);
                outputJson = obj ?? { text: exec.outputText };
                latencyMs = exec.latencyMs;
                costUsd = exec.costUsd;
                costSource = exec.costSource;
                promptTokens = exec.usage.promptTokens;
                completionTokens = exec.usage.completionTokens;
                status = "succeeded";
            }

            await db
                .update(runCells)
                .set({
                    status,
                    outputJson,
                    latencyMs,
                    costUsd,
                    costSource,
                    promptTokens,
                    completionTokens,
                    error: null,
                })
                .where(eq(runCells.id, cell.id));

            await scoreCell({
                cellId: cell.id,
                itemId: item.id,
                inputText: item.inputText ?? undefined,
                hasImage: Boolean(item.storageKey),
                outputJson,
                fieldRules,
                judge,
                referenceModelId: referenceModel?.id,
                apiKeys,
                maxTokens: run.configSnapshot.maxTokens,
            });
        } catch (err) {
            await db
                .update(runCells)
                .set({
                    status: "failed",
                    error: err instanceof Error ? err.message : String(err),
                })
                .where(eq(runCells.id, cell.id));
        }
    });

    const final = await getRunCells(runId);
    const done = final.filter(
        (c) => c.status === "succeeded" || c.status === "cached",
    ).length;
    const failed = final.filter((c) => c.status === "failed").length;
    const status =
        failed === 0 ? "completed" : done > 0 ? "partial" : "failed";
    await db.update(runs).set({ status }).where(eq(runs.id, runId));
}

interface ScoreArgs {
    cellId: string;
    itemId: string;
    inputText?: string;
    hasImage: boolean;
    outputJson: OutputJson | null;
    fieldRules: NonNullable<
        Awaited<ReturnType<typeof getDatasetSchema>>
    >["fieldRules"];
    judge?: typeof judgeConfigs.$inferSelect;
    referenceModelId?: string;
    apiKeys: ReturnType<typeof apiKeysFromEnv>;
    maxTokens: number;
}

async function scoreCell(args: ScoreArgs): Promise<void> {
    // Idempotent: clear any prior scores for this cell first.
    await db.delete(cellScores).where(eq(cellScores.runCellId, args.cellId));

    const structured = asObject(args.outputJson);
    const label = await getLabelForItem(args.itemId);

    if (label && args.fieldRules.length > 0 && structured) {
        const { score, details } = scoreFieldDiff(
            structured,
            label,
            args.fieldRules,
        );
        await db.insert(cellScores).values({
            runCellId: args.cellId,
            scorerType: "field_diff",
            score: score ?? null,
            detailsJson: details,
            rationale: null,
        });
    }

    if (args.judge) {
        const reference = args.referenceModelId
            ? await referenceOutputFor(args.itemId, args.referenceModelId)
            : undefined;
        const verdict = await runJudge({
            judgeModelId: getBareModelName(args.judge.modelId),
            rubricPrompt: args.judge.rubricPrompt,
            apiKeys: args.apiKeys,
            inputText: args.inputText,
            hasImage: args.hasImage,
            output: args.outputJson,
            label,
            reference,
            maxTokens: args.maxTokens,
        });
        await db.insert(cellScores).values({
            runCellId: args.cellId,
            scorerType: "judge",
            score: verdict.ok ? verdict.score : null,
            detailsJson: null,
            rationale: verdict.ok
                ? verdict.rationale
                : `judge error: ${verdict.error}`,
        });
    }
}

async function referenceOutputFor(
    itemId: string,
    referenceRunModelId: string,
): Promise<unknown> {
    const [row] = await db
        .select({ outputJson: runCells.outputJson })
        .from(runCells)
        .where(
            and(
                eq(runCells.datasetItemId, itemId),
                eq(runCells.runModelId, referenceRunModelId),
                inArray(runCells.status, ["succeeded", "cached"]),
            ),
        )
        .limit(1);
    return row?.outputJson ?? undefined;
}
