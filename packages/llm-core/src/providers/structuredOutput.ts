// Shared structured-output parsing. Validation against the JSON schema is
// intentionally light here (presence + JSON-parseability); full schema validation
// is a scoring-layer concern and can plug in later. The key contract: a
// structured request that returns unparseable output yields a `schemaViolation`
// outcome rather than throwing, so the orchestrator can record it per cell.

import type { ResponseSchema } from "../types";

export function parseStructuredOutput(
    text: string,
    schema: ResponseSchema | undefined,
): { parsed?: unknown; schemaViolation?: boolean } {
    if (!schema) return {};

    const trimmed = text.trim();
    if (trimmed.length === 0) return { schemaViolation: true };

    try {
        return { parsed: JSON.parse(trimmed) };
    } catch {
        // Some providers wrap JSON in markdown fences despite json mode — retry once.
        const fenced = stripCodeFence(trimmed);
        if (fenced !== trimmed) {
            try {
                return { parsed: JSON.parse(fenced) };
            } catch {
                return { schemaViolation: true };
            }
        }
        return { schemaViolation: true };
    }
}

function stripCodeFence(text: string): string {
    const match = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
    return match ? match[1] : text;
}
