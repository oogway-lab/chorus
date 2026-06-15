import { eq, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
    datasets,
    datasetItems,
    datasetSchemas,
    prompts,
} from "@/server/db/schema";
import { getRunCounts, listRecentRuns } from "@/server/runs/service";
import { enrichRunRows } from "@/server/runs/listReads";

export async function getDashboardStats(teamId: string) {
    const [datasetCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(datasets)
        .where(eq(datasets.teamId, teamId));

    const [promptCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(prompts)
        .where(eq(prompts.teamId, teamId));

    const runCounts = await getRunCounts(teamId);

    const schemaRows = await db
        .select({ datasetId: datasetSchemas.datasetId })
        .from(datasetSchemas)
        .innerJoin(datasets, eq(datasetSchemas.datasetId, datasets.id))
        .where(eq(datasets.teamId, teamId));
    const schemaDatasetIds = new Set(schemaRows.map((r) => r.datasetId));

    const itemRows = await db
        .select({
            datasetId: datasetItems.datasetId,
            count: sql<number>`count(*)::int`,
        })
        .from(datasetItems)
        .innerJoin(datasets, eq(datasetItems.datasetId, datasets.id))
        .where(eq(datasets.teamId, teamId))
        .groupBy(datasetItems.datasetId);

    const datasetsWithItems = itemRows.filter((r) => r.count > 0).length;

    return {
        datasetCount: datasetCount?.count ?? 0,
        promptCount: promptCount?.count ?? 0,
        runCount: runCounts.total,
        runningCount: runCounts.active,
        hasDatasetWithSchema: schemaDatasetIds.size > 0,
        hasDatasetWithItems: datasetsWithItems > 0,
        hasPrompt: (promptCount?.count ?? 0) > 0,
    };
}

export async function getRecentRuns(teamId: string, limit = 5) {
    const recent = await listRecentRuns(teamId, limit);
    return enrichRunRows(recent);
}
