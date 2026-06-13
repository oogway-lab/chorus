// pg-boss is Postgres-backed (no Redis). One queue per cell job; the orchestrator
// enqueues cells and a worker drains them with a concurrency cap (R5, R11–R14).

import PgBoss from "pg-boss";

export const CELL_QUEUE = "eval-cell";

export interface CellJobData {
    runId: string;
    runModelId: string;
    datasetItemId: string;
}

let boss: PgBoss | undefined;

export async function getBoss(): Promise<PgBoss> {
    if (!boss) {
        const url = process.env.DATABASE_URL;
        if (!url) throw new Error("DATABASE_URL is not set");
        boss = new PgBoss(url);
        await boss.start();
    }
    return boss;
}
