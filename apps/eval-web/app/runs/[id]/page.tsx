import Link from "next/link";
import { notFound } from "next/navigation";
import { formatCost } from "@chorus/llm-core";
import { requirePrincipal, assertSameTeam } from "@/server/auth/session";
import { getRun } from "@/server/runs/service";
import { getRunMatrix, getLeaderboard } from "@/server/runs/reads";
import { retryRunAction } from "@/app/actions";

export const dynamic = "force-dynamic";

function fmtScore(s: number | null | undefined): string {
    return s === null || s === undefined ? "–" : s.toFixed(2);
}

export default async function RunPage({
    params,
}: {
    params: { id: string };
}) {
    const principal = await requirePrincipal();
    const run = await getRun(params.id);
    if (!run) notFound();
    assertSameTeam(principal, run.teamId);

    const { models, items, cells, scoresByCell } = await getRunMatrix(params.id);
    const leaderboard = await getLeaderboard(params.id);

    const cellFor = (itemId: string, runModelId: string) =>
        cells.find(
            (c) => c.datasetItemId === itemId && c.runModelId === runModelId,
        );

    return (
        <div>
            <p className="muted">
                <Link href="/runs">← Runs</Link>
            </p>
            <h1>
                Run {run.id.slice(0, 8)}{" "}
                <span className="muted">· {run.status}</span>
            </h1>
            {(run.status === "partial" || run.status === "failed") && (
                <form action={retryRunAction}>
                    <input type="hidden" name="runId" value={run.id} />
                    <button type="submit">Retry failed cells</button>
                </form>
            )}

            <h2>Leaderboard</h2>
            <table>
                <thead>
                    <tr>
                        <th>Model</th>
                        <th>Field score</th>
                        <th>Judge score</th>
                        <th>Avg latency</th>
                        <th>Total cost</th>
                        <th>Projected / 1k</th>
                    </tr>
                </thead>
                <tbody>
                    {leaderboard.map((r) => (
                        <tr key={r.runModelId}>
                            <td className={r.isReference ? "ref" : undefined}>
                                {r.modelId}
                                {r.isReference ? " (reference)" : ""}
                            </td>
                            <td>{fmtScore(r.avgFieldScore)}</td>
                            <td>{fmtScore(r.avgJudgeScore)}</td>
                            <td>
                                {r.avgLatencyMs
                                    ? `${Math.round(r.avgLatencyMs)} ms`
                                    : "–"}
                            </td>
                            <td>
                                {formatCost(r.totalCostUsd)}
                                {!r.costAvailable && (
                                    <span className="muted"> *</span>
                                )}
                            </td>
                            <td>{formatCost(r.projectedCostPer1k)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <p className="muted">
                * cost not available for every cell. Projected / 1k extrapolates
                mean per-item cost.
            </p>

            <h2>Matrix</h2>
            <table>
                <thead>
                    <tr>
                        <th>Item</th>
                        {models.map((m) => (
                            <th
                                key={m.id}
                                className={m.isReference ? "ref" : undefined}
                            >
                                {m.modelId}
                                {m.isReference ? " (ref)" : ""}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {items.map((item) => (
                        <tr key={item.id}>
                            <td style={{ maxWidth: 220 }}>
                                <pre>
                                    {item.inputText ?? `(${item.type})`}
                                </pre>
                            </td>
                            {models.map((m) => {
                                const cell = cellFor(item.id, m.id);
                                const scores = cell
                                    ? scoresByCell.get(cell.id) ?? []
                                    : [];
                                const field = scores.find(
                                    (s) => s.scorerType === "field_diff",
                                );
                                const judge = scores.find(
                                    (s) => s.scorerType === "judge",
                                );
                                return (
                                    <td key={m.id} style={{ maxWidth: 280 }}>
                                        {!cell && <span>–</span>}
                                        {cell && (
                                            <>
                                                <div className="muted">
                                                    {cell.status} ·{" "}
                                                    {cell.latencyMs
                                                        ? `${Math.round(cell.latencyMs)}ms`
                                                        : "–"}{" "}
                                                    · {formatCost(cell.costUsd)}
                                                </div>
                                                {cell.error ? (
                                                    <div className="muted">
                                                        error: {cell.error}
                                                    </div>
                                                ) : (
                                                    <pre>
                                                        {JSON.stringify(
                                                            cell.outputJson,
                                                        )}
                                                    </pre>
                                                )}
                                                <div className="muted">
                                                    field: {fmtScore(field?.score)}{" "}
                                                    · judge:{" "}
                                                    {fmtScore(judge?.score)}
                                                </div>
                                                {judge?.rationale && (
                                                    <div className="muted">
                                                        {judge.rationale}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
