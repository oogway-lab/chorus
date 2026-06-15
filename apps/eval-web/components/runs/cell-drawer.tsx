"use client";

import { formatCost } from "@chorus/llm-core";
import { fmtLatency } from "@/lib/format";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetBody,
} from "@/components/ui/sheet";
import { JsonBlock } from "@/components/ui/json-block";
import { CellStatusBadge } from "@/components/ui/status-badge";
import { ScorePill } from "@/components/ui/score-pill";
import { FieldDiffTable } from "@/components/runs/field-diff-table";
import { type DrawerPayload, toFieldDiffDetails } from "@/components/runs/types";

export function CellDrawer({
    open,
    onClose,
    data,
}: {
    open: boolean;
    onClose: () => void;
    data: DrawerPayload | null;
}) {
    if (!data) return null;

    const field = data.scores.find((s) => s.scorerType === "field_diff");
    const judge = data.scores.find((s) => s.scorerType === "judge");
    const fieldDetails = toFieldDiffDetails(field?.detailsJson);

    return (
        <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
            <SheetContent side="right" className="max-w-2xl">
                <SheetHeader>
                    <SheetTitle>
                        {data.model.modelId}
                        {data.model.isReference && " (reference)"}
                    </SheetTitle>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                        <CellStatusBadge status={data.cell.status} />
                        <span>{fmtLatency(data.cell.latencyMs)}</span>
                        <span>{formatCost(data.cell.costUsd)}</span>
                    </div>
                </SheetHeader>
                <SheetBody className="space-y-6">
                    <section>
                        <h3 className="mb-2 text-sm font-semibold">Input</h3>
                        {data.item.storageKey && (
                            <div className="mb-3 aspect-video max-w-xs overflow-hidden rounded-lg bg-neutral-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={`/api/images/${data.item.storageKey}`}
                                    alt=""
                                    className="h-full w-full object-cover"
                                />
                            </div>
                        )}
                        {data.item.inputText && (
                            <p className="text-sm text-neutral-700">
                                {data.item.inputText}
                            </p>
                        )}
                        {!data.item.storageKey && !data.item.inputText && (
                            <p className="text-sm text-muted">({data.item.type})</p>
                        )}
                    </section>

                    <section>
                        <h3 className="mb-2 text-sm font-semibold">Scores</h3>
                        <div className="flex gap-2">
                            <ScorePill score={field?.score} label="field" />
                            <ScorePill score={judge?.score} label="judge" />
                        </div>
                    </section>

                    {data.cell.error ? (
                        <section>
                            <h3 className="mb-2 text-sm font-semibold text-danger">
                                Error
                            </h3>
                            <p className="text-sm">{data.cell.error}</p>
                        </section>
                    ) : (
                        <section>
                            <h3 className="mb-2 text-sm font-semibold">
                                Model output
                            </h3>
                            <JsonBlock
                                data={data.cell.outputJson}
                                collapsible
                            />
                        </section>
                    )}

                    {fieldDetails && fieldDetails.fields.length > 0 && (
                        <section>
                            <h3 className="mb-2 text-sm font-semibold">
                                Field diff
                            </h3>
                            <FieldDiffTable details={fieldDetails} />
                        </section>
                    )}

                    {judge?.rationale && (
                        <section>
                            <h3 className="mb-2 text-sm font-semibold">
                                Judge rationale
                            </h3>
                            <p className="rounded-md border border-border bg-neutral-50 p-3 text-sm leading-relaxed text-neutral-800">
                                {judge.rationale}
                            </p>
                        </section>
                    )}
                </SheetBody>
            </SheetContent>
        </Sheet>
    );
}