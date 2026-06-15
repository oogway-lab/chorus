import { eq } from "drizzle-orm";
import { db } from "../db/client";
import {
    datasets,
    datasetSchemas,
    datasetItems,
    labels,
} from "../db/schema";
import type { FieldRule, JsonSchemaObject, LabelJson } from "../db/jsonTypes";
import { storeImage } from "../images/source";

export async function createDataset(
    teamId: string,
    name: string,
    createdBy: string,
) {
    const [row] = await db
        .insert(datasets)
        .values({ teamId, name, createdBy })
        .returning();
    return row;
}

export async function listDatasets(teamId: string) {
    return db.select().from(datasets).where(eq(datasets.teamId, teamId));
}

export async function getDataset(datasetId: string) {
    const [row] = await db
        .select()
        .from(datasets)
        .where(eq(datasets.id, datasetId))
        .limit(1);
    return row;
}

/** Upsert the dataset's single canonical schema + per-field match rules. */
export async function setDatasetSchema(
    datasetId: string,
    jsonSchema: JsonSchemaObject,
    fieldRules: FieldRule[],
) {
    const existing = await db
        .select()
        .from(datasetSchemas)
        .where(eq(datasetSchemas.datasetId, datasetId))
        .limit(1);
    if (existing[0]) {
        await db
            .update(datasetSchemas)
            .set({ jsonSchema, fieldRules })
            .where(eq(datasetSchemas.id, existing[0].id));
        return existing[0].id;
    }
    const [row] = await db
        .insert(datasetSchemas)
        .values({ datasetId, jsonSchema, fieldRules })
        .returning();
    return row.id;
}

export async function getDatasetSchema(datasetId: string) {
    const [row] = await db
        .select()
        .from(datasetSchemas)
        .where(eq(datasetSchemas.datasetId, datasetId))
        .limit(1);
    return row;
}

export async function addTextItem(
    datasetId: string,
    inputText: string,
    label?: LabelJson,
) {
    const [item] = await db
        .insert(datasetItems)
        .values({ datasetId, type: "text", inputText })
        .returning();
    if (label) await addLabel(item.id, label);
    return item;
}

export async function addImageItem(
    datasetId: string,
    bytes: Buffer,
    mimeType: string,
    inputText?: string,
    label?: LabelJson,
) {
    const storageKey = await storeImage(bytes, mimeType);
    const [item] = await db
        .insert(datasetItems)
        .values({
            datasetId,
            type: inputText ? "mixed" : "image",
            inputText,
            storageKey,
            mimeType,
        })
        .returning();
    if (label) await addLabel(item.id, label);
    return item;
}

export async function addLabel(datasetItemId: string, labelJson: LabelJson) {
    const existing = await db
        .select()
        .from(labels)
        .where(eq(labels.datasetItemId, datasetItemId))
        .limit(1);
    if (existing[0]) {
        await db
            .update(labels)
            .set({ labelJson })
            .where(eq(labels.id, existing[0].id));
        return existing[0].id;
    }
    const [row] = await db
        .insert(labels)
        .values({ datasetItemId, labelJson })
        .returning();
    return row.id;
}

export async function listItems(datasetId: string) {
    return db
        .select()
        .from(datasetItems)
        .where(eq(datasetItems.datasetId, datasetId));
}

/** Team that owns the dataset item stored under this image storage key. */
export async function getTeamForStorageKey(
    storageKey: string,
): Promise<string | undefined> {
    const rows = await db
        .select({ teamId: datasets.teamId })
        .from(datasetItems)
        .innerJoin(datasets, eq(datasetItems.datasetId, datasets.id))
        .where(eq(datasetItems.storageKey, storageKey))
        .limit(1);
    return rows[0]?.teamId;
}

export async function getLabelForItem(
    datasetItemId: string,
): Promise<LabelJson | undefined> {
    const [row] = await db
        .select()
        .from(labels)
        .where(eq(labels.datasetItemId, datasetItemId))
        .limit(1);
    return row?.labelJson;
}
