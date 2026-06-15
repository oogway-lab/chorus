import type { MatrixCellScore } from "@/server/runs/reads";
import type { FieldDiffDetails, OutputJson } from "@/server/db/jsonTypes";

export interface ModelCol {
    id: string;
    modelId: string;
    isReference: boolean;
}

export interface ItemRow {
    id: string;
    type: string;
    inputText: string | null;
    storageKey: string | null;
}

export interface CellData {
    id: string;
    datasetItemId: string;
    runModelId: string;
    status: "pending" | "running" | "succeeded" | "failed" | "cached";
    outputJson: OutputJson | null;
    latencyMs: number | null;
    costUsd: number | null;
    error: string | null;
}

export interface DrawerPayload {
    cell: CellData;
    model: ModelCol;
    item: ItemRow;
    scores: MatrixCellScore[];
}

/**
 * detailsJson is unknown jsonb; only field_diff scorers persist FieldDiffDetails.
 * Validate the shape at runtime before narrowing, so a malformed row degrades to
 * undefined rather than crashing the matrix/drawer.
 */
export function toFieldDiffDetails(v: unknown): FieldDiffDetails | undefined {
    if (
        v &&
        typeof v === "object" &&
        Array.isArray((v as { fields?: unknown }).fields)
    ) {
        return v as FieldDiffDetails;
    }
    return undefined;
}
