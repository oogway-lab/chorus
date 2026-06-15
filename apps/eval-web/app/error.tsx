"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="mt-2 max-w-md text-sm text-muted">
                {error.message || "An unexpected error occurred."}
            </p>
            <Button onClick={reset} className="mt-6">
                Try again
            </Button>
        </div>
    );
}