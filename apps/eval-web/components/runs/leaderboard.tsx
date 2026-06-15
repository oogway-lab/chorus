"use client";

import { formatCost } from "@chorus/llm-core";
import { fmtScore, fmtLatency, fmtDelta } from "@/lib/format";
import type { LeaderboardRow } from "@/server/runs/reads";
import { Badge } from "@/components/ui/badge";
import { ScoreBar } from "@/components/ui/score-pill";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/cn";

function DeltaCell({
    value,
    baseline,
    lowerIsBetter = false,
}: {
    value: number | undefined;
    baseline: number | undefined;
    lowerIsBetter?: boolean;
}) {
    const { text, direction, good } = fmtDelta(value, baseline, lowerIsBetter);
    if (text === "–") return <span className="text-muted">–</span>;
    if (direction === "flat") {
        return (
            <span className="inline-flex items-center gap-0.5 text-xs text-muted">
                <Minus className="h-3 w-3" />
                {text}
            </span>
        );
    }
    const Arrow = direction === "up" ? ArrowUp : ArrowDown;
    return (
        <span
            className={cn(
                "inline-flex items-center gap-0.5 text-xs font-medium",
                good ? "text-success" : "text-danger",
            )}
        >
            <Arrow className="h-3 w-3" />
            {text}
        </span>
    );
}

export function Leaderboard({ rows }: { rows: LeaderboardRow[] }) {
    const reference = rows.find((r) => r.isReference);
    const sorted = [...rows].sort((a, b) => {
        const ac = a.projectedCostPer1k ?? Infinity;
        const bc = b.projectedCostPer1k ?? Infinity;
        return ac - bc;
    });

    return (
        <div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Model</TableHead>
                        <TableHead>Field score</TableHead>
                        <TableHead>Judge score</TableHead>
                        <TableHead>Δ field</TableHead>
                        <TableHead>Δ judge</TableHead>
                        <TableHead>Avg latency</TableHead>
                        <TableHead>Δ latency</TableHead>
                        <TableHead>Total cost</TableHead>
                        <TableHead>Projected / 1k</TableHead>
                        <TableHead>Δ cost/1k</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sorted.map((r) => (
                        <TableRow
                            key={r.runModelId}
                            className={cn(
                                r.isReference &&
                                    "border-l-4 border-l-ref bg-ref-muted/20",
                            )}
                        >
                            <TableCell>
                                <span
                                    className={cn(
                                        "font-medium",
                                        r.isReference && "text-ref",
                                    )}
                                >
                                    {r.modelId}
                                </span>
                                {r.isReference && (
                                    <Badge variant="ref" className="ml-2">
                                        reference
                                    </Badge>
                                )}
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    {fmtScore(r.avgFieldScore)}
                                    <ScoreBar score={r.avgFieldScore} />
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    {fmtScore(r.avgJudgeScore)}
                                    <ScoreBar score={r.avgJudgeScore} />
                                </div>
                            </TableCell>
                            <TableCell>
                                {!r.isReference && reference ? (
                                    <DeltaCell
                                        value={r.avgFieldScore}
                                        baseline={reference.avgFieldScore}
                                    />
                                ) : (
                                    <Minus className="h-3 w-3 text-muted" />
                                )}
                            </TableCell>
                            <TableCell>
                                {!r.isReference && reference ? (
                                    <DeltaCell
                                        value={r.avgJudgeScore}
                                        baseline={reference.avgJudgeScore}
                                    />
                                ) : (
                                    <Minus className="h-3 w-3 text-muted" />
                                )}
                            </TableCell>
                            <TableCell>{fmtLatency(r.avgLatencyMs)}</TableCell>
                            <TableCell>
                                {!r.isReference && reference ? (
                                    <DeltaCell
                                        value={r.avgLatencyMs}
                                        baseline={reference.avgLatencyMs}
                                        lowerIsBetter
                                    />
                                ) : (
                                    <Minus className="h-3 w-3 text-muted" />
                                )}
                            </TableCell>
                            <TableCell>
                                {formatCost(r.totalCostUsd)}
                                {!r.costAvailable && (
                                    <span className="text-muted"> *</span>
                                )}
                            </TableCell>
                            <TableCell className="font-medium">
                                {formatCost(r.projectedCostPer1k)}
                            </TableCell>
                            <TableCell>
                                {!r.isReference && reference ? (
                                    <DeltaCell
                                        value={r.projectedCostPer1k}
                                        baseline={reference.projectedCostPer1k}
                                        lowerIsBetter
                                    />
                                ) : (
                                    <Minus className="h-3 w-3 text-muted" />
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <p className="mt-3 text-xs text-muted">
                Sorted by projected cost per 1k (ascending). * cost not available
                for every cell. Δ columns compare against the reference model.
            </p>
        </div>
    );
}