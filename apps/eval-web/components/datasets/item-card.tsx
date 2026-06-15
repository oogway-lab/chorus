import { Badge } from "@/components/ui/badge";
import type { LabelJson } from "@/server/db/jsonTypes";

export function ItemCard({
    type,
    storageKey,
    inputText,
    label,
}: {
    type: string;
    storageKey: string | null;
    inputText: string | null;
    label: LabelJson | undefined;
}) {
    const labelFields = label ? Object.keys(label).length : 0;

    return (
        <div className="overflow-hidden rounded-lg border border-border bg-white">
            {storageKey && (
                <div className="aspect-video w-full overflow-hidden bg-neutral-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={`/api/images/${storageKey}`}
                        alt={inputText ?? "Dataset item"}
                        className="h-full w-full object-cover"
                    />
                </div>
            )}
            <div className="p-3">
                <div className="flex items-center gap-2">
                    <Badge variant="outline">{type}</Badge>
                    {labelFields > 0 && (
                        <span className="text-xs text-muted">
                            {labelFields} label field{labelFields !== 1 ? "s" : ""}
                        </span>
                    )}
                </div>
                {inputText && (
                    <p className="mt-2 line-clamp-2 text-sm text-neutral-700">
                        {inputText}
                    </p>
                )}
                {label && (
                    <p className="mt-2 font-mono text-xs text-muted">
                        {JSON.stringify(label)}
                    </p>
                )}
            </div>
        </div>
    );
}