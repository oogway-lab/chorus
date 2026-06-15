import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import { datasets, datasetItems, datasetSchemas } from "../db/schema";

export interface DatasetListRow {
    id: string;
    name: string;
    createdAt: Date;
    itemCount: number;
    hasSchema: boolean;
}

export async function listDatasetsEnriched(
    teamId: string,
): Promise<DatasetListRow[]> {
    const rows = await db
        .select()
        .from(datasets)
        .where(eq(datasets.teamId, teamId))
        .orderBy(desc(datasets.createdAt));

    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);

    const itemCounts = await db
        .select({
            datasetId: datasetItems.datasetId,
            count: sql<number>`count(*)::int`,
        })
        .from(datasetItems)
        .where(inArray(datasetItems.datasetId, ids))
        .groupBy(datasetItems.datasetId);

    const schemaRows = await db
        .select({ datasetId: datasetSchemas.datasetId })
        .from(datasetSchemas)
        .where(inArray(datasetSchemas.datasetId, ids));

    const countById = new Map(itemCounts.map((r) => [r.datasetId, r.count]));
    const schemaIds = new Set(schemaRows.map((r) => r.datasetId));

    return rows.map((r) => ({
        id: r.id,
        name: r.name,
        createdAt: r.createdAt,
        itemCount: countById.get(r.id) ?? 0,
        hasSchema: schemaIds.has(r.id),
    }));
}

export async function getDatasetMeta(datasetId: string) {
    const [itemCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(datasetItems)
        .where(eq(datasetItems.datasetId, datasetId));

    const [schema] = await db
        .select()
        .from(datasetSchemas)
        .where(eq(datasetSchemas.datasetId, datasetId))
        .limit(1);

    return {
        itemCount: itemCount?.count ?? 0,
        hasSchema: Boolean(schema),
        isReady: (itemCount?.count ?? 0) > 0 && Boolean(schema),
    };
}