"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/cn";

export function ImageDropzone({ name }: { name: string }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);

    function onFiles(files: FileList | null) {
        const file = files?.[0];
        if (!file || !inputRef.current) return;
        const dt = new DataTransfer();
        dt.items.add(file);
        inputRef.current.files = dt.files;
        setFileName(`${file.name} (${(file.size / 1024).toFixed(0)} KB)`);
    }

    return (
        <div>
            <input
                ref={inputRef}
                id={name}
                name={name}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => onFiles(e.target.files)}
            />
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    onFiles(e.dataTransfer.files);
                }}
                className={cn(
                    "flex w-full flex-col items-center justify-center rounded-md border-2 border-dashed px-4 py-8 text-sm transition-colors",
                    dragging
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-neutral-400 hover:bg-neutral-50",
                )}
            >
                <Upload className="mb-2 h-6 w-6 text-muted" />
                <span className="font-medium text-neutral-700">
                    Drop an image or click to browse
                </span>
                <span className="mt-1 text-xs text-muted">PNG, JPEG, GIF, WebP · max 20MB</span>
            </button>
            {fileName && (
                <p className="mt-2 text-xs text-muted">Selected: {fileName}</p>
            )}
        </div>
    );
}