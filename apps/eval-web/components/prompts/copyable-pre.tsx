"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyablePre({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);

    async function copy() {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div className="relative rounded-md border border-border bg-neutral-50">
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void copy()}
                className="absolute right-2 top-2 h-7 px-2"
            >
                {copied ? (
                    <Check className="h-3.5 w-3.5" />
                ) : (
                    <Copy className="h-3.5 w-3.5" />
                )}
            </Button>
            <pre className="max-h-60 overflow-auto whitespace-pre-wrap p-3 pr-12 font-mono text-xs leading-relaxed text-neutral-800">
                {text}
            </pre>
        </div>
    );
}