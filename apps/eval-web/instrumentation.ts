// Runs once when the Next.js server boots (nodejs runtime only). Starts the
// pg-boss run worker so enqueued evaluation runs execute in the background.
export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        const { startRunWorker } = await import("@/server/jobs/runQueue");
        await startRunWorker();
    }
}
