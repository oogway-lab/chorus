import { eq, and, inArray, desc, sql } from "drizzle-orm";
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
    const items = await db
        .select({ id: datasetItems.id })
        .from(datasetItems)
        .where(eq(datasetItems.datasetId, datasetId));

    if (items.length === 0) {
        throw new Error("Cannot start a run on a dataset with no items.");
    }
    if (models.length === 0) {
        throw new Error("Cannot start a run with no candidate models.");
    }

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
    // Count by status in SQL — avoids loading every cell's jsonb payload, which
    // matters since this runs on every progress poll and per-row in list reads.
    const rows = await db
        .select({
            status: runCells.status,
            count: sql<number>`count(*)::int`,
        })
        .from(runCells)
        .where(eq(runCells.runId, runId))
        .groupBy(runCells.status);

    let total = 0;
    let done = 0;
    let failed = 0;
    for (const r of rows) {
        total += r.count;
        if (r.status === "succeeded" || r.status === "cached") done += r.count;
        else if (r.status === "failed") failed += r.count;
    }
    return { total, done, failed, pending: total - done - failed };
}

export interface RunProgress {
    total: number;
    done: number;
    failed: number;
    pending: number;
}

/** Progress for many runs in a single grouped query (avoids the per-run N+1). */
export async function getRunProgressForRuns(
    runIds: string[],
): Promise<Map<string, RunProgress>> {
    const result = new Map<string, RunProgress>();
    if (runIds.length === 0) return result;
    for (const id of runIds) {
        result.set(id, { total: 0, done: 0, failed: 0, pending: 0 });
    }
    const rows = await db
        .select({
            runId: runCells.runId,
            status: runCells.status,
            count: sql<number>`count(*)::int`,
        })
        .from(runCells)
        .where(inArray(runCells.runId, runIds))
        .groupBy(runCells.runId, runCells.status);
    for (const r of rows) {
        const p = result.get(r.runId);
        if (!p) continue;
        p.total += r.count;
        if (r.status === "succeeded" || r.status === "cached") p.done += r.count;
        else if (r.status === "failed") p.failed += r.count;
    }
    for (const p of result.values()) p.pending = p.total - p.done - p.failed;
    return result;
}

/** Most recent runs for a team, limit pushed to SQL. */
export async function listRecentRuns(teamId: string, limit: number) {
    return db
        .select()
        .from(runs)
        .where(eq(runs.teamId, teamId))
        .orderBy(desc(runs.createdAt))
        .limit(limit);
}

/** Run counts for a team without loading every row. */
export async function getRunCounts(
    teamId: string,
): Promise<{ total: number; active: number }> {
    const [row] = await db
        .select({
            total: sql<number>`count(*)::int`,
            active: sql<number>`count(*) filter (where ${runs.status} in ('running','pending'))::int`,
        })
        .from(runs)
        .where(eq(runs.teamId, teamId));
    return { total: row?.total ?? 0, active: row?.active ?? 0 };
}

export async function getScoresForCells(cellIds: string[]) {
    if (cellIds.length === 0) return [];
    return db
        .select()
        .from(cellScores)
        .where(inArray(cellScores.runCellId, cellIds));
}

/**
 * Prior succeeded/cached generation for the same item × model × prompt version ×
 * maxTokens, from any run. Schema-violating cells are never reused. The join scopes
 * the match to the right model + prompt, so identical inputs reuse the earlier
 * output regardless of which run produced it.
 */
export async function findCachedCell(
    datasetItemId: string,
    modelId: string,
    promptVersionId: string,
    maxTokens: number,
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
                eq(runCells.maxTokens, maxTokens),
                eq(runCells.schemaViolation, false),
                inArray(runCells.status, ["succeeded", "cached"]),
            ),
        )
        .limit(1);
    return rows[0];
}

/**
 * Atomically claim this run's pending/failed cells by flipping them to 'running'
 * and returning only the rows this call won. A concurrent executor (e.g. a retry
 * racing the worker) gets the remaining rows or none, so no cell is processed twice.
 */
export async function claimRunCells(runId: string) {
    return db
        .update(runCells)
        .set({ status: "running", error: null })
        .where(
            and(
                eq(runCells.runId, runId),
                inArray(runCells.status, ["pending", "failed"]),
            ),
        )
        .returning();
}
