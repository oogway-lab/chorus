"use client";

import { useMemo, useState } from "react";
import { formatCost } from "@chorus/llm-core";
import { fmtLatency } from "@/lib/format";
import type { MatrixCellScore } from "@/server/runs/reads";
import { CellStatusBadge } from "@/components/ui/status-badge";
import { ScorePill } from "@/components/ui/score-pill";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { CellDrawer } from "@/components/runs/cell-drawer";
import {
    type ModelCol,
    type ItemRow,
    type CellData,
    type DrawerPayload,
    toFieldDiffDetails,
} from "@/components/runs/types";

export function MatrixView({
    models,
    items,
    cells,
    scoresByCell,
}: {
    models: ModelCol[];
    items: ItemRow[];
    cells: CellData[];
    scoresByCell: Record<string, MatrixCellScore[]>;
}) {
    const [drawer, setDrawer] = useState<DrawerPayload | null>(null);

    // O(cells) lookup map instead of an O(cells) scan per (item x model) cell.
    const cellByKey = useMemo(() => {
        const map = new Map<string, CellData>();
        for (const c of cells) {
            map.set(`${c.datasetItemId}:${c.runModelId}`, c);
        }
        return map;
    }, [cells]);
    const cellFor = (itemId: string, runModelId: string) =>
        cellByKey.get(`${itemId}:${runModelId}`);

    return (
        <>
            <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[800px] border-collapse text-sm">
                    <thead>
                        <tr className="border-b border-border bg-neutral-50">
                            <th className="sticky left-0 z-10 min-w-[180px] border-r border-border bg-neutral-50 p-3 text-left text-xs font-medium text-muted">
                                Item
                            </th>
                            {models.map((m) => (
                                <th
                                    key={m.id}
                                    className={cn(
                                        "min-w-[200px] p-3 text-left text-xs font-medium",
                                        m.isReference
                                            ? "bg-ref-muted/40 text-ref"
                                            : "text-muted",
                                    )}
                                >
                                    {m.modelId}
                                    {m.isReference && " (ref)"}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => (
                            <tr
                                key={item.id}
                                className="border-b border-border"
                            >
                                <td className="sticky left-0 z-10 border-r border-border bg-white p-3 align-top">
                                    {item.storageKey && (
                                        <div className="mb-2 aspect-video w-28 overflow-hidden rounded bg-neutral-100">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={`/api/images/${item.storageKey}`}
                                                alt=""
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                    )}
                                    <p className="line-clamp-3 text-xs text-neutral-700">
                                        {item.inputText ?? `(${item.type})`}
                                    </p>
                                </td>
                                {models.map((m) => {
                                    const cell = cellFor(item.id, m.id);
                                    const scores = cell
                                        ? scoresByCell[cell.id] ?? []
                                        : [];
                                    const field = scores.find(
                                        (s) => s.scorerType === "field_diff",
                                    );
                                    const judge = scores.find(
                                        (s) => s.scorerType === "judge",
                                    );
                                    const fieldDetails = toFieldDiffDetails(
                                        field?.detailsJson,
                                    );

                                    return (
                                        <td
                                            key={m.id}
                                            className={cn(
                                                "p-2 align-top",
                                                m.isReference && "bg-ref-muted/10",
                                            )}
                                        >
                                            {!cell && (
                                                <span className="text-muted">–</span>
                                            )}
                                            {cell && (
                                                <div className="rounded-md border border-border bg-white p-2">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <CellStatusBadge
                                                            status={cell.status}
                                                        />
                                                        <span className="text-xs text-muted">
                                                            {fmtLatency(
                                                                cell.latencyMs,
                                                            )}{" "}
                                                            ·{" "}
                                                            {formatCost(
                                                                cell.costUsd,
                                                            )}
                                                        </span>
                                                    </div>
                                                    {cell.error ? (
                                                        <p className="mt-1 text-xs text-danger">
                                                            {cell.error}
                                                        </p>
                                                    ) : (
                                                        <>
                                                            <div className="mt-2 flex flex-wrap gap-1">
                                                                <ScorePill
                                                                    score={
                                                                        field?.score
                                                                    }
                                                                    label="field"
                                                                />
                                                                <ScorePill
                                                                    score={
                                                                        judge?.score
                                                                    }
                                                                    label="judge"
                                                                />
                                                            </div>
                                                            {fieldDetails?.fields
                                                                ?.slice(0, 3)
                                                                .map((f) => (
                                                                    <p
                                                                        key={
                                                                            f.field
                                                                        }
                                                                        className="mt-1 font-mono text-xs text-muted"
                                                                    >
                                                                        {f.field}:{" "}
                                                                        {f.score >=
                                                                        1
                                                                            ? "✓"
                                                                            : "✗"}
                                                                    </p>
                                                                ))}
                                                        </>
                                                    )}
                                                    <Button
                                                        type="button"
                                                        variant="link"
                                                        size="sm"
                                                        className="mt-1 h-auto p-0 text-xs"
                                                        onClick={() =>
                                                            setDrawer({
                                                                cell,
                                                                model: m,
                                                                item,
                                                                scores,
                                                            })
                                                        }
                                                    >
                                                        View details →
                                                    </Button>
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <CellDrawer
                open={drawer !== null}
                onClose={() => setDrawer(null)}
                data={drawer}
            />
        </>
    );
}