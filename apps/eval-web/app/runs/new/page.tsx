import Link from "next/link";
import { requirePrincipal } from "@/server/auth/session";
import { listDatasetsEnriched } from "@/server/datasets/reads";
import { listPrompts, listVersions } from "@/server/prompts/service";
import { listJudgeConfigs } from "@/server/judges/service";
import { createRunAction, createJudgeAction } from "@/app/actions";
import { PageHeader } from "@/components/layout/page-header";
import { NewRunForm } from "@/components/runs/new-run-form";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function NewRunPage({
    searchParams,
}: {
    searchParams: { datasetId?: string };
}) {
    const p = await requirePrincipal();
    const datasets = await listDatasetsEnriched(p.teamId);
    const prompts = await listPrompts(p.teamId);
    const versions = await Promise.all(prompts.map((pr) => listVersions(pr.id)));
    const judges = await listJudgeConfigs(p.teamId);

    const versionOptions = prompts.flatMap((pr, i) =>
        versions[i].map((v) => ({
            id: v.id,
            label: `${pr.name} v${v.version}`,
        })),
    );

    const ready = datasets.length > 0 && versionOptions.length > 0;

    return (
        <div>
            <PageHeader
                title="New run"
                description="Configure and launch a model evaluation across your dataset."
                breadcrumbs={[
                    { label: "Runs", href: "/runs" },
                    { label: "New run" },
                ]}
            />

            {!ready ? (
                <div className="rounded-lg border border-border bg-white p-8 text-center">
                    <p className="text-sm text-muted">
                        You need at least one dataset and one prompt version first.
                    </p>
                    <div className="mt-4 flex justify-center gap-3">
                        <Button asChild variant="secondary" size="sm">
                            <Link href="/datasets">Go to datasets</Link>
                        </Button>
                        <Button asChild variant="secondary" size="sm">
                            <Link href="/prompts">Go to prompts</Link>
                        </Button>
                    </div>
                </div>
            ) : (
                <NewRunForm
                    datasets={datasets.map((d) => ({
                        id: d.id,
                        name: d.name,
                        itemCount: d.itemCount,
                        hasSchema: d.hasSchema,
                    }))}
                    versionOptions={versionOptions}
                    judges={judges.map((j) => ({
                        id: j.id,
                        name: j.name,
                        modelId: j.modelId,
                    }))}
                    defaultDatasetId={searchParams.datasetId}
                    hasPrompt={prompts.length > 0}
                    createRunAction={createRunAction}
                    createJudgeAction={createJudgeAction}
                />
            )}
        </div>
    );
}