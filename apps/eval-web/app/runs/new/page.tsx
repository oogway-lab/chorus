import { requirePrincipal } from "@/server/auth/session";
import { listDatasets } from "@/server/datasets/service";
import { listPrompts, listVersions } from "@/server/prompts/service";
import { listJudgeConfigs } from "@/server/judges/service";
import { createRunAction, createJudgeAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function NewRunPage() {
    const p = await requirePrincipal();
    const datasets = await listDatasets(p.teamId);
    const prompts = await listPrompts(p.teamId);
    const versions = await Promise.all(prompts.map((pr) => listVersions(pr.id)));
    const judges = await listJudgeConfigs(p.teamId);

    const versionOptions = prompts.flatMap((pr, i) =>
        versions[i].map((v) => ({
            id: v.id,
            label: `${pr.name} v${v.version}`,
        })),
    );

    return (
        <div>
            <h1>New run</h1>

            {datasets.length === 0 || versionOptions.length === 0 ? (
                <p className="muted">
                    You need at least one dataset and one prompt version first.
                </p>
            ) : (
                <form action={createRunAction} className="card">
                    <label htmlFor="datasetId">Dataset</label>
                    <select id="datasetId" name="datasetId">
                        {datasets.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.name}
                            </option>
                        ))}
                    </select>

                    <label htmlFor="promptVersionId">Prompt version</label>
                    <select id="promptVersionId" name="promptVersionId">
                        {versionOptions.map((o) => (
                            <option key={o.id} value={o.id}>
                                {o.label}
                            </option>
                        ))}
                    </select>

                    <label htmlFor="models">
                        Candidate models (one per line, e.g. gpt-4o)
                    </label>
                    <textarea
                        id="models"
                        name="models"
                        rows={4}
                        defaultValue={"gpt-4o\ngpt-4o-mini"}
                    />

                    <label htmlFor="referenceModel">
                        Reference model (the incumbent, e.g. gpt-4o)
                    </label>
                    <input
                        id="referenceModel"
                        name="referenceModel"
                        type="text"
                        defaultValue="gpt-4o"
                    />

                    <label htmlFor="maxTokens">Max output tokens</label>
                    <input
                        id="maxTokens"
                        name="maxTokens"
                        type="number"
                        defaultValue={500}
                    />

                    <label htmlFor="judgeConfigId">Judge (optional)</label>
                    <select id="judgeConfigId" name="judgeConfigId">
                        <option value="">— none —</option>
                        {judges.map((j) => (
                            <option key={j.id} value={j.id}>
                                {j.name} ({j.modelId})
                            </option>
                        ))}
                    </select>

                    <button type="submit">Run evaluation</button>
                    <p className="muted">
                        The run executes inline and may take a moment for larger
                        datasets.
                    </p>
                </form>
            )}

            <h2>Add a judge</h2>
            <form action={createJudgeAction} className="card">
                <label htmlFor="jname">Name</label>
                <input id="jname" name="name" type="text" placeholder="rubric" />
                <label htmlFor="jmodel">Judge model</label>
                <input
                    id="jmodel"
                    name="modelId"
                    type="text"
                    defaultValue="gpt-4o-mini"
                />
                <label htmlFor="rubric">Rubric prompt</label>
                <textarea id="rubric" name="rubricPrompt" rows={3} />
                <button type="submit">Add judge</button>
            </form>
        </div>
    );
}
