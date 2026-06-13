// Read models for the matrix (U9) and leaderboard (U10).

import { eq, inArray } from "drizzle-orm";
import { projectProductionCost } from "@chorus/llm-core";
import { db } from "../db/client";
import { runCells, runModels, datasetItems, cellScores } from "../db/schema";

export interface MatrixCellScore {
    scorerType: "field_diff" | "judge";
    score: number | null;
    rationale: string | null;
    detailsJson: unknown;
}

export async function getRunMatrix(runId: string) {
    const models = await db
        .select()
        .from(runModels)
        .where(eq(runModels.runId, runId));
    const cells = await db
        .select()
        .from(runCells)
        .where(eq(runCells.runId, runId));
    const itemIds = [...new Set(cells.map((c) => c.datasetItemId))];
    const items =
        itemIds.length > 0
            ? await db
                  .select()
                  .from(datasetItems)
                  .where(inArray(datasetItems.id, itemIds))
            : [];
    const cellIds = cells.map((c) => c.id);
    const scores =
        cellIds.length > 0
            ? await db
                  .select()
                  .from(cellScores)
                  .where(inArray(cellScores.runCellId, cellIds))
            : [];

    const scoresByCell = new Map<string, MatrixCellScore[]>();
    for (const s of scores) {
        const arr = scoresByCell.get(s.runCellId) ?? [];
        arr.push({
            scorerType: s.scorerType,
            score: s.score,
            rationale: s.rationale,
            detailsJson: s.detailsJson,
        });
        scoresByCell.set(s.runCellId, arr);
    }

    return { models, items, cells, scoresByCell };
}

export interface LeaderboardRow {
    runModelId: string;
    modelId: string;
    isReference: boolean;
    n: number;
    avgFieldScore: number | undefined;
    avgJudgeScore: number | undefined;
    avgLatencyMs: number | undefined;
    totalCostUsd: number | undefined;
    projectedCostPer1k: number | undefined;
    costAvailable: boolean;
}

export async function getLeaderboard(runId: string): Promise<LeaderboardRow[]> {
    const { models, cells, scoresByCell } = await getRunMatrix(runId);

    return models.map((rm) => {
        const myCells = cells.filter((c) => c.runModelId === rm.id);
        const fieldScores: number[] = [];
        const judgeScores: number[] = [];
        for (const c of myCells) {
            for (const s of scoresByCell.get(c.id) ?? []) {
                if (s.score === null) continue;
                if (s.scorerType === "field_diff") fieldScores.push(s.score);
                else judgeScores.push(s.score);
            }
        }
        const latencies = myCells
            .map((c) => c.latencyMs)
            .filter((v): v is number => v !== null);
        const costs = myCells
            .map((c) => c.costUsd)
            .filter((v): v is number => v !== null);

        return {
            runModelId: rm.id,
            modelId: rm.modelId,
            isReference: rm.isReference,
            n: myCells.length,
            avgFieldScore: mean(fieldScores),
            avgJudgeScore: mean(judgeScores),
            avgLatencyMs: mean(latencies),
            totalCostUsd: costs.length ? sum(costs) : undefined,
            projectedCostPer1k: projectProductionCost(costs, 1000),
            costAvailable: costs.length === myCells.length && myCells.length > 0,
        };
    });
}

function mean(xs: number[]): number | undefined {
    return xs.length ? sum(xs) / xs.length : undefined;
}
function sum(xs: number[]): number {
    return xs.reduce((a, b) => a + b, 0);
}
