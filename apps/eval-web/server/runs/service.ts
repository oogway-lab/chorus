import { eq, and, inArray, desc } from "drizzle-orm";
import { db } from "../db/client";
import {
    runs,
    runModels,
    runCells,
    datasetItems,
    cellScores,
} from "../db/schema";
import type { RunModelSpec } from "../db/jsonTypes";

export async function createRun(
    teamId: string,
    datasetId: string,
    models: RunModelSpec[],
    maxTokens: number,
    judgeConfigId: string | undefined,
    createdBy: string,
): Promise<string> {
    const [run] = await db
        .insert(runs)
        .values({
            teamId,
            datasetId,
            judgeConfigId,
            status: "pending",
            configSnapshot: { datasetId, models, judgeConfigId, maxTokens },
            createdBy,
        })
        .returning();

    const insertedModels = await db
        .insert(runModels)
        .values(
            models.map((m) => ({
                runId: run.id,
                modelId: m.modelId,
                promptVersionId: m.promptVersionId,
                isReference: m.isReference,
            })),
        )
        .returning();

    const items = await db
        .select({ id: datasetItems.id })
        .from(datasetItems)
        .where(eq(datasetItems.datasetId, datasetId));

    if (items.length > 0) {
        await db.insert(runCells).values(
            insertedModels.flatMap((rm) =>
                items.map((item) => ({
                    runId: run.id,
                    datasetItemId: item.id,
                    runModelId: rm.id,
                    status: "pending" as const,
                })),
            ),
        );
    }

    return run.id;
}

export async function listRuns(teamId: string) {
    return db
        .select()
        .from(runs)
        .where(eq(runs.teamId, teamId))
        .orderBy(desc(runs.createdAt));
}

export async function getRun(runId: string) {
    const [row] = await db
        .select()
        .from(runs)
        .where(eq(runs.id, runId))
        .limit(1);
    return row;
}

export async function getRunModels(runId: string) {
    return db.select().from(runModels).where(eq(runModels.runId, runId));
}

export async function getRunCells(runId: string) {
    return db.select().from(runCells).where(eq(runCells.runId, runId));
}

export async function getRunProgress(runId: string) {
    const cells = await getRunCells(runId);
    const total = cells.length;
    const done = cells.filter(
        (c) => c.status === "succeeded" || c.status === "cached",
    ).length;
    const failed = cells.filter((c) => c.status === "failed").length;
    return { total, done, failed, pending: total - done - failed };
}

export async function getScoresForCells(cellIds: string[]) {
    if (cellIds.length === 0) return [];
    return db
        .select()
        .from(cellScores)
        .where(inArray(cellScores.runCellId, cellIds));
}

/**
 * Prior succeeded/cached generation for the same item × model × prompt version,
 * from any run. The join already scopes the match to the right model + prompt, so
 * identical inputs reuse the earlier output regardless of which run produced it.
 */
export async function findCachedCell(
    datasetItemId: string,
    modelId: string,
    promptVersionId: string,
) {
    const rows = await db
        .select({
            outputJson: runCells.outputJson,
            latencyMs: runCells.latencyMs,
            costUsd: runCells.costUsd,
            costSource: runCells.costSource,
            promptTokens: runCells.promptTokens,
            completionTokens: runCells.completionTokens,
        })
        .from(runCells)
        .innerJoin(runModels, eq(runCells.runModelId, runModels.id))
        .where(
            and(
                eq(runCells.datasetItemId, datasetItemId),
                eq(runModels.modelId, modelId),
                eq(runModels.promptVersionId, promptVersionId),
                inArray(runCells.status, ["succeeded", "cached"]),
            ),
        )
        .limit(1);
    return rows[0];
}
