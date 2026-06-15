import { NextResponse } from "next/server";
import { requirePrincipal, assertSameTeam } from "@/server/auth/session";
import { getRun, getRunProgress } from "@/server/runs/service";

export async function GET(
    _req: Request,
    { params }: { params: { id: string } },
) {
    const principal = await requirePrincipal();
    const run = await getRun(params.id);
    if (!run) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    assertSameTeam(principal, run.teamId);
    const progress = await getRunProgress(params.id);
    return NextResponse.json({
        status: run.status,
        ...progress,
    });
}