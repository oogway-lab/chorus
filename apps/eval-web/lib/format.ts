export function fmtScore(s: number | null | undefined): string {
    return s === null || s === undefined ? "–" : s.toFixed(2);
}

export function fmtLatency(ms: number | null | undefined): string {
    return ms === null || ms === undefined ? "–" : `${Math.round(ms)} ms`;
}

export function fmtDate(d: Date | string): string {
    return new Date(d).toLocaleString();
}

export function shortId(id: string, len = 8): string {
    return id.slice(0, len);
}

export interface Delta {
    /** Signed change of the raw value, e.g. "-94%" (lower), "+7%" (higher). */
    text: string;
    /** Direction the value moved — drives the arrow icon, not good/bad. */
    direction: "up" | "down" | "flat";
    /** Whether the change is good (for color). undefined = parity or no data. */
    good: boolean | undefined;
}

export function fmtDelta(
    value: number | undefined,
    baseline: number | undefined,
    lowerIsBetter = false,
): Delta {
    if (value === undefined || baseline === undefined) {
        return { text: "–", direction: "flat", good: undefined };
    }
    const delta = value - baseline;
    const relative = baseline !== 0 ? delta / baseline : undefined;
    // Treat sub-0.5% (or sub-epsilon absolute) moves as parity.
    const isFlat =
        Math.abs(delta) < 1e-9 ||
        (relative !== undefined && Math.abs(relative) < 0.005);
    if (isFlat) return { text: "0%", direction: "flat", good: undefined };

    const text =
        relative !== undefined
            ? `${relative > 0 ? "+" : ""}${Math.round(relative * 100)}%`
            : `${delta > 0 ? "+" : ""}${delta.toFixed(2)}`;
    const direction = delta > 0 ? "up" : "down";
    const good = lowerIsBetter ? delta < 0 : delta > 0;
    return { text, direction, good };
}