import { Badge } from "@/components/ui/badge";

type RunStatus = "pending" | "running" | "completed" | "partial" | "failed";
type CellStatus = "pending" | "running" | "succeeded" | "failed" | "cached";

const runVariants: Record<
    RunStatus,
    "default" | "success" | "warning" | "danger" | "outline"
> = {
    pending: "outline",
    running: "default",
    completed: "success",
    partial: "warning",
    failed: "danger",
};

const cellVariants: Record<
    CellStatus,
    "default" | "success" | "warning" | "danger" | "outline"
> = {
    pending: "outline",
    running: "default",
    succeeded: "success",
    failed: "danger",
    cached: "outline",
};

export function RunStatusBadge({ status }: { status: RunStatus }) {
    return (
        <Badge variant={runVariants[status]} aria-label={`Run status: ${status}`}>
            {status}
        </Badge>
    );
}

export function CellStatusBadge({ status }: { status: CellStatus }) {
    return (
        <Badge variant={cellVariants[status]} aria-label={`Cell status: ${status}`}>
            {status}
        </Badge>
    );
}