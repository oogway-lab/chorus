"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { RunStatusBadge } from "@/components/ui/status-badge";

type RunStatus =
    | "pending"
    | "running"
    | "completed"
    | "partial"
    | "failed";

interface ProgressData {
    status: RunStatus;
    total: number;
    done: number;
    failed: number;
    pending: number;
}

function isProgressData(v: unknown): v is ProgressData {
    if (!v || typeof v !== "object") return false;
    const o = v as Record<string, unknown>;
    return typeof o.status === "string" && typeof o.total === "number";
}

export function RunProgressPoller({
    runId,
    initialStatus,
    initialProgress,
}: {
    runId: string;
    initialStatus: RunStatus;
    initialProgress: Omit<ProgressData, "status">;
}) {
    const router = useRouter();
    const [data, setData] = useState<ProgressData>({
        status: initialStatus,
        ...initialProgress,
    });

    const isActive = data.status === "running" || data.status === "pending";
    const pct =
        data.total > 0 ? Math.round((data.done / data.total) * 100) : 0;

    useEffect(() => {
        if (!isActive) return;

        const interval = setInterval(() => {
            void fetch(`/api/runs/${runId}/progress`)
                .then(async (r) => {
                    // A transient error must not be read as a terminal run:
                    // keep the prior data and keep polling.
                    if (!r.ok) return;
                    const json: unknown = await r.json();
                    if (!isProgressData(json)) return;
                    setData(json);
                    if (json.status !== "running" && json.status !== "pending") {
                        router.refresh();
                    }
                })
                .catch(() => undefined);
        }, 3000);

        return () => clearInterval(interval);
    }, [runId, isActive, router]);

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-3">
                <RunStatusBadge status={data.status} />
                {isActive && (
                    <span className="text-sm text-muted">Updating live…</span>
                )}
            </div>
            <Progress value={pct} />
            <p className="text-sm text-muted">
                {data.done} / {data.total} cells complete
                {data.failed > 0 && ` · ${data.failed} failed`}
            </p>
        </div>
    );
}
