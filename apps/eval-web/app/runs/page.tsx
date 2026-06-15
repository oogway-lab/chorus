import Link from "next/link";
import { requirePrincipal } from "@/server/auth/session";
import { listRunsEnriched } from "@/server/runs/listReads";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { RunsList } from "@/components/runs/runs-list";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function RunsPage() {
    const p = await requirePrincipal();
    const runs = await listRunsEnriched(p.teamId);

    return (
        <div>
            <PageHeader
                title="Runs"
                description="Evaluation runs across datasets and model candidates."
                action={
                    <Button asChild>
                        <Link href="/runs/new">+ New run</Link>
                    </Button>
                }
            />

            {runs.length === 0 ? (
                <EmptyState
                    title="No runs yet"
                    description="Launch an evaluation to compare models on your dataset."
                    actionLabel="New run"
                    actionHref="/runs/new"
                />
            ) : (
                <Card className="p-4">
                    <RunsList runs={runs} />
                </Card>
            )}
        </div>
    );
}