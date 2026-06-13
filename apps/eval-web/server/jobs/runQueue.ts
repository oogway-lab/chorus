// Background run execution via pg-boss (Postgres-backed durable queue).
// createRunAction enqueues a run and returns immediately; the worker (started
// once at server boot via instrumentation) drains the queue and executes runs.
// Because jobs are persisted, a process restart resumes work; recoverOrphanedRuns
// additionally re-queues any run left mid-flight by a crash.

import PgBoss from "pg-boss";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/client";
import { runs, runCells } from "../db/schema";
import { executeRun } from "../runs/executor";

export const RUN_QUEUE = "eval-run";

interface RunJob {
    runId: string;
}

let boss: PgBoss | undefined;
let workerStarted = false;

async function getBoss(): Promise<PgBoss> {
    if (!boss) {
        const url = process.env.DATABASE_URL;
        if (!url) throw new Error("DATABASE_URL is not set");
        const instance = new PgBoss(url);
        instance.on("error", (e) => console.error("pg-boss error:", e));
        await instance.start();
        await instance.createQueue(RUN_QUEUE);
        boss = instance;
    }
    return boss;
}

export async function enqueueRun(runId: string): Promise<void> {
    const b = await getBoss();
    await b.send(RUN_QUEUE, { runId });
}

/** Start the worker and recover crash-orphaned runs. Idempotent. */
export async function startRunWorker(): Promise<void> {
    if (workerStarted) return;
    workerStarted = true;
    await recoverOrphanedRuns();
    const b = await getBoss();
    await b.work<RunJob>(RUN_QUEUE, async (jobs) => {
        for (const job of jobs) {
            try {
                await executeRun(job.data.runId);
            } catch (err) {
                console.error(`run ${job.data.runId} failed:`, err);
            }
        }
    });
}

/** Reset runs/cells left in 'running' by a prior crash and re-queue them. */
async function recoverOrphanedRuns(): Promise<void> {
    const stuck = await db
        .select({ id: runs.id })
        .from(runs)
        .where(eq(runs.status, "running"));
    if (stuck.length === 0) return;
    const ids = stuck.map((r) => r.id);
    await db
        .update(runCells)
        .set({ status: "pending" })
        .where(and(inArray(runCells.runId, ids), eq(runCells.status, "running")));
    await db
        .update(runs)
        .set({ status: "pending" })
        .where(inArray(runs.id, ids));
    for (const id of ids) await enqueueRun(id);
    console.log(`recovered ${ids.length} orphaned run(s)`);
}
