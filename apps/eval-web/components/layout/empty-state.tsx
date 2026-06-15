import Link from "next/link";
import { Button } from "@/components/ui/button";

export function EmptyState({
    title,
    description,
    actionLabel,
    actionHref,
}: {
    title: string;
    description: string;
    actionLabel?: string;
    actionHref?: string;
}) {
    return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-white px-6 py-12 text-center">
            <h3 className="text-base font-medium text-neutral-900">{title}</h3>
            <p className="mt-2 max-w-sm text-sm text-muted">{description}</p>
            {actionLabel && actionHref && (
                <Button asChild className="mt-4">
                    <Link href={actionHref}>{actionLabel}</Link>
                </Button>
            )}
        </div>
    );
}