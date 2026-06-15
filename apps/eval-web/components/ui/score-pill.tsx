import { cn } from "@/lib/cn";
import { fmtScore } from "@/lib/format";

export function ScorePill({
    score,
    label,
    className,
}: {
    score: number | null | undefined;
    label?: string;
    className?: string;
}) {
    const s = score ?? -1;
    const color =
        s < 0
            ? "bg-neutral-100 text-muted"
            : s >= 0.8
              ? "bg-success-muted text-success"
              : s >= 0.5
                ? "bg-ref-muted text-ref"
                : "bg-danger-muted text-danger";

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                color,
                className,
            )}
        >
            {label && <span className="text-muted">{label}</span>}
            {fmtScore(score)}
        </span>
    );
}

export function ScoreBar({
    score,
    className,
}: {
    score: number | null | undefined;
    className?: string;
}) {
    const pct = score !== null && score !== undefined ? score * 100 : 0;
    return (
        <div
            className={cn("h-1.5 w-16 overflow-hidden rounded-full bg-neutral-100", className)}
        >
            <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}