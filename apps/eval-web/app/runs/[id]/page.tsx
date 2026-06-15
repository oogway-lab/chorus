import { notFound } from "next/navigation";
import { requirePrincipal, assertSameTeam } from "@/server/auth/session";
import { getRun, getRunProgress } from "@/server/runs/service";
import { getRunMatrix, getLeaderboard } from "@/server/runs/reads";
import type { MatrixCellScore } from "@/server/runs/reads";
import { retryRunAction } from "@/app/actions";
import { PageHeader } from "@/components/layout/page-header";
import { RunProgressPoller } from "@/components/runs/run-progress-poller";
import { RunDetailView } from "@/components/runs/run-detail-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { shortId } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function RunPage({
    params,
}: {
    params: { id: string };
}) {
    const principal = await requirePrincipal();
    const run = await getRun(params.id);
    if (!run) notFound();
    assertSameTeam(principal, run.teamId);

    const progress = await getRunProgress(params.id);
    const { models, items, cells, scoresByCell } = await getRunMatrix(
        params.id,
    );
    const leaderboard = await getLeaderboard(params.id);

    const scoresRecord: Record<string, MatrixCellScore[]> = {};
    for (const [cellId, scores] of scoresByCell) {
        scoresRecord[cellId] = scores;
    }

    return (
        <div>
            <PageHeader
                title={`Run ${shortId(run.id)}`}
                breadcrumbs={[
                    { label: "Runs", href: "/runs" },
                    { label: shortId(run.id) },
                ]}
                action={
                    run.status === "partial" || run.status === "failed" ? (
                        <form action={retryRunAction}>
                            <input type="hidden" name="runId" value={run.id} />
                            <Button type="submit" variant="secondary">
                                Retry failed cells
                            </Button>
                        </form>
                    ) : undefined
                }
            />

            <Card className="mb-8">
                <CardContent className="pt-5">
                    <RunProgressPoller
                        runId={run.id}
                        initialStatus={run.status}
                        initialProgress={progress}
                    />
                </CardContent>
            </Card>

            <RunDetailView
                leaderboard={leaderboard}
                models={models.map((m) => ({
                    id: m.id,
                    modelId: m.modelId,
                    isReference: m.isReference,
                }))}
                items={items.map((i) => ({
                    id: i.id,
                    type: i.type,
                    inputText: i.inputText,
                    storageKey: i.storageKey,
                }))}
                cells={cells.map((c) => ({
                    id: c.id,
                    datasetItemId: c.datasetItemId,
                    runModelId: c.runModelId,
                    status: c.status,
                    outputJson: c.outputJson,
                    latencyMs: c.latencyMs,
                    costUsd: c.costUsd,
                    error: c.error,
                }))}
                scoresByCell={scoresRecord}
            />
        </div>
    );
}