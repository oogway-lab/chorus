"use client";

import { useState } from "react";
import { fmtDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyablePre } from "@/components/prompts/copyable-pre";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";

interface Version {
    id: string;
    version: number;
    content: string;
    createdAt: Date | string;
}

export function PromptCard({
    name,
    scope,
    promptId,
    versions,
    addVersionAction,
}: {
    name: string;
    scope: string;
    promptId: string;
    versions: Version[];
    addVersionAction: (formData: FormData) => Promise<void>;
}) {
    const [expanded, setExpanded] = useState<number | null>(
        versions[0]?.version ?? null,
    );
    const [showNew, setShowNew] = useState(false);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <CardTitle>{name}</CardTitle>
                    <Badge variant="outline">{scope}</Badge>
                    {scope === "model" && (
                        <span className="text-xs text-muted" title="Per-model variant derived from a shared base">
                            per-model variant
                        </span>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {versions.map((v) => {
                    const isOpen = expanded === v.version;
                    return (
                        <div
                            key={v.id}
                            className="rounded-md border border-border"
                        >
                            <button
                                type="button"
                                onClick={() =>
                                    setExpanded(isOpen ? null : v.version)
                                }
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-50"
                            >
                                {isOpen ? (
                                    <ChevronDown className="h-4 w-4 text-muted" />
                                ) : (
                                    <ChevronRight className="h-4 w-4 text-muted" />
                                )}
                                <span className="font-medium">v{v.version}</span>
                                <span className="text-muted">
                                    · {fmtDate(v.createdAt)}
                                </span>
                            </button>
                            {isOpen && (
                                <div className="border-t border-border p-3">
                                    <CopyablePre text={v.content} />
                                </div>
                            )}
                        </div>
                    );
                })}

                {showNew ? (
                    <form action={addVersionAction} className="space-y-3 pt-2">
                        <input type="hidden" name="promptId" value={promptId} />
                        <Label htmlFor={`content-${promptId}`}>New version</Label>
                        <Textarea
                            id={`content-${promptId}`}
                            name="content"
                            rows={4}
                            className="font-sans"
                        />
                        <div className="flex gap-2">
                            <Button type="submit" size="sm">
                                Add version
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => setShowNew(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                ) : (
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowNew(true)}
                    >
                        + New version
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}