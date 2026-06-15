"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

export function JsonBlock({
    data,
    className,
    collapsible = false,
    defaultOpen = true,
}: {
    data: unknown;
    className?: string;
    collapsible?: boolean;
    defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    const [copied, setCopied] = useState(false);
    const text = JSON.stringify(data, null, 2);

    async function copy() {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div className={cn("relative rounded-md border border-border bg-neutral-50", className)}>
            <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
                {collapsible ? (
                    <button
                        type="button"
                        onClick={() => setOpen(!open)}
                        className="flex items-center gap-1 text-xs text-muted hover:text-neutral-800"
                    >
                        {open ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                        )}
                        JSON
                    </button>
                ) : (
                    <span className="text-xs text-muted">JSON</span>
                )}
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void copy()}
                    className="h-7 px-2"
                >
                    {copied ? (
                        <Check className="h-3.5 w-3.5" />
                    ) : (
                        <Copy className="h-3.5 w-3.5" />
                    )}
                </Button>
            </div>
            {(!collapsible || open) && (
                <pre className="max-h-80 overflow-auto p-3 font-mono text-xs leading-relaxed text-neutral-800">
                    {text}
                </pre>
            )}
        </div>
    );
}