// Run executor. Two phases so scoring is deterministic under concurrency:
//   1. Generation — every claimed cell calls the model (or reuses a cache hit).
//   2. Scoring — runs only after all generations are persisted, so the judge
//      always sees a computed gpt-4o reference output.
// Cells are claimed atomically (status -> 'running'), so a retry racing the
// background worker never double-processes or double-bills a cell. Invoked
// in-process by the pg-boss run worker.

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
    claimRunCells,
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
    // The guard narrows the unknown jsonb value to a plain object before the cast.
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
    const maxTokens = run.configSnapshot.maxTokens;

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

    // Atomically claim this invocation's cells so a concurrent run can't share them.
    const claimed = await claimRunCells(runId);

    // ---- Phase 1: generation ----
    await runPool(claimed, CONCURRENCY, async (cell) => {
        const rm = modelById.get(cell.runModelId);
        const item = itemById.get(cell.datasetItemId);
        if (!rm || !item) {
            await db
                .update(runCells)
                .set({ status: "failed", error: "missing model or item" })
                .where(eq(runCells.id, cell.id));
            return;
        }

        try {
            const cached = await findCachedCell(
                item.id,
                rm.modelId,
                rm.promptVersionId,
                maxTokens,
            );

            if (cached) {
                await db
                    .update(runCells)
                    .set({
                        status: "cached",
                        outputJson: cached.outputJson,
                        latencyMs: cached.latencyMs,
                        costUsd: cached.costUsd,
                        costSource: cached.costSource,
                        promptTokens: cached.promptTokens,
                        completionTokens: cached.completionTokens,
                        schemaViolation: false,
                        maxTokens,
                        error: null,
                    })
                    .where(eq(runCells.id, cell.id));
                return;
            }

            const content = await promptContent(rm.promptVersionId);
            const prompt = item.inputText
                ? `${content}\n\n${item.inputText}`
                : content;
            const images: EvalImage[] = [];
            if (item.storageKey && item.mimeType) {
                images.push(await loadImage(item.storageKey, item.mimeType));
            }
            const exec = await executeCell(
                rm.modelId,
                { prompt, images, responseSchema, maxTokens },
                apiKeys,
                pricingFor(rm.modelId),
            );
            const obj = asObject(exec.parsed);

            await db
                .update(runCells)
                .set({
                    status: "succeeded",
                    outputJson: obj ?? { text: exec.outputText },
                    latencyMs: exec.latencyMs,
                    costUsd: exec.costUsd,
                    costSource: exec.costSource,
                    promptTokens: exec.usage.promptTokens,
                    completionTokens: exec.usage.completionTokens,
                    schemaViolation: exec.schemaViolation,
                    maxTokens,
                    error: null,
                })
                .where(eq(runCells.id, cell.id));
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

    // ---- Phase 2: scoring (all reference outputs now exist) ----
    const claimedIds = new Set(claimed.map((c) => c.id));
    const toScore = (await getRunCells(runId)).filter(
        (c) =>
            claimedIds.has(c.id) &&
            (c.status === "succeeded" || c.status === "cached"),
    );

    await runPool(toScore, CONCURRENCY, async (cell) => {
        const item = itemById.get(cell.datasetItemId);
        if (!item) return;
        try {
            await scoreCell({
                cellId: cell.id,
                itemId: item.id,
                inputText: item.inputText ?? undefined,
                hasImage: Boolean(item.storageKey),
                outputJson: cell.outputJson,
                fieldRules,
                judge,
                referenceModelId: referenceModel?.id,
                apiKeys,
                maxTokens,
            });
        } catch (scoreErr) {
            console.error(`scoring failed for cell ${cell.id}:`, scoreErr);
        }
    });

    // ---- Finalize ----
    const final = await getRunCells(runId);
    const stillBusy = final.some(
        (c) => c.status === "running" || c.status === "pending",
    );
    if (!stillBusy && final.length > 0) {
        const done = final.filter(
            (c) => c.status === "succeeded" || c.status === "cached",
        ).length;
        const failed = final.filter((c) => c.status === "failed").length;
        const status =
            failed === 0 ? "completed" : done > 0 ? "partial" : "failed";
        await db.update(runs).set({ status }).where(eq(runs.id, runId));
    }
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
