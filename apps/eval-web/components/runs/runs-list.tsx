"use client";

import { useState } from "react";
import Link from "next/link";
import { fmtDate, shortId } from "@/lib/format";
import type { RunListRow } from "@/server/runs/listReads";
import { RunStatusBadge } from "@/components/ui/status-badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/cn";

type Filter = "all" | "running" | "completed" | "failed";

export function RunsList({ runs }: { runs: RunListRow[] }) {
    const [filter, setFilter] = useState<Filter>("all");

    const filtered = runs.filter((r) => {
        if (filter === "all") return true;
        if (filter === "running")
            return r.status === "running" || r.status === "pending";
        if (filter === "completed")
            return r.status === "completed" || r.status === "partial";
        return r.status === "failed";
    });

    return (
        <div>
            <Tabs
                value={filter}
                onValueChange={(v) => setFilter(v as Filter)}
                className="mb-4"
            >
                <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="running">Running</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                    <TabsTrigger value="failed">Failed</TabsTrigger>
                </TabsList>
            </Tabs>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Run</TableHead>
                        <TableHead>Dataset</TableHead>
                        <TableHead>Models</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Created</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filtered.map((r) => (
                        <TableRow key={r.id}>
                            <TableCell>
                                <Link
                                    href={`/runs/${r.id}`}
                                    className="font-mono text-sm hover:underline"
                                >
                                    {shortId(r.id)}
                                </Link>
                            </TableCell>
                            <TableCell>{r.datasetName}</TableCell>
                            <TableCell
                                className={cn(
                                    "max-w-[200px] truncate text-muted",
                                )}
                                title={r.models.join(", ")}
                            >
                                {r.models.join(", ")}
                            </TableCell>
                            <TableCell>
                                <RunStatusBadge status={r.status} />
                            </TableCell>
                            <TableCell className="text-muted">
                                {r.progress.done}/{r.progress.total}
                                {r.progress.failed > 0 &&
                                    ` (${r.progress.failed} failed)`}
                            </TableCell>
                            <TableCell className="text-muted">
                                {fmtDate(r.createdAt)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}