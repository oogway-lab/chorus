"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const COMMON_MODELS = [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-4.1-nano",
    "o4-mini",
    "gpt-5-mini",
];

interface DatasetOption {
    id: string;
    name: string;
    itemCount: number;
    hasSchema: boolean;
}

interface VersionOption {
    id: string;
    label: string;
}

interface JudgeOption {
    id: string;
    name: string;
    modelId: string;
}

// Disables the submit while the server action is in flight (prevents double-submit).
function SubmitButton({ disabled }: { disabled: boolean }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={disabled || pending}>
            {pending ? "Starting…" : "Run evaluation"}
        </Button>
    );
}

export function NewRunForm({
    datasets,
    versionOptions,
    judges,
    defaultDatasetId,
    hasPrompt,
    createRunAction,
    createJudgeAction,
}: {
    datasets: DatasetOption[];
    versionOptions: VersionOption[];
    judges: JudgeOption[];
    defaultDatasetId?: string;
    hasPrompt: boolean;
    createRunAction: (formData: FormData) => Promise<void>;
    createJudgeAction: (formData: FormData) => Promise<void>;
}) {
    const [datasetId, setDatasetId] = useState(
        defaultDatasetId ?? datasets[0]?.id ?? "",
    );
    const [modelsText, setModelsText] = useState("gpt-4o\ngpt-4o-mini");
    const [referenceModel, setReferenceModel] = useState("gpt-4o");
    const [showJudgeForm, setShowJudgeForm] = useState(false);

    const selectedDataset = datasets.find((d) => d.id === datasetId);
    const modelList = useMemo(
        () =>
            modelsText
                .split(/[\n,]/)
                .map((s) => s.trim())
                .filter(Boolean),
        [modelsText],
    );

    // Keep the reference valid even if the user removes it from the model list.
    const effectiveReference = modelList.includes(referenceModel)
        ? referenceModel
        : (modelList[0] ?? "");

    const cellCount =
        (selectedDataset?.itemCount ?? 0) * Math.max(modelList.length, 0);

    const prereqs = [
        {
            label: "Dataset has items",
            ok: (selectedDataset?.itemCount ?? 0) > 0,
        },
        {
            label: "Dataset has schema",
            ok: selectedDataset?.hasSchema ?? false,
        },
        { label: "Prompt exists", ok: hasPrompt && versionOptions.length > 0 },
        { label: "At least one model", ok: modelList.length > 0 },
    ];
    const canSubmit = prereqs.every((p) => p.ok);

    function addModel(model: string) {
        const existing = new Set(modelList);
        if (existing.has(model)) return;
        setModelsText((prev) => (prev.trim() ? `${prev.trim()}\n${model}` : model));
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Prerequisites</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2">
                        {prereqs.map((p) => (
                            <li key={p.label} className="flex items-center gap-2 text-sm">
                                {p.ok ? (
                                    <Check className="h-4 w-4 text-success" />
                                ) : (
                                    <X className="h-4 w-4 text-danger" />
                                )}
                                <span className={cn(!p.ok && "text-muted")}>
                                    {p.label}
                                </span>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>

            <form action={createRunAction} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            <span className="text-muted">1.</span> Dataset
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Label htmlFor="datasetId">Dataset</Label>
                        <Select
                            id="datasetId"
                            name="datasetId"
                            value={datasetId}
                            onChange={(e) => setDatasetId(e.target.value)}
                            className="mt-1.5"
                        >
                            {datasets.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.name} ({d.itemCount} items)
                                </option>
                            ))}
                        </Select>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            <span className="text-muted">2.</span> Prompt version
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Label htmlFor="promptVersionId">Prompt version</Label>
                        <Select
                            id="promptVersionId"
                            name="promptVersionId"
                            className="mt-1.5"
                            defaultValue={versionOptions[0]?.id}
                        >
                            {versionOptions.map((o) => (
                                <option key={o.id} value={o.id}>
                                    {o.label}
                                </option>
                            ))}
                        </Select>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            <span className="text-muted">3.</span> Models
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            {COMMON_MODELS.map((m) => (
                                <button key={m} type="button" onClick={() => addModel(m)}>
                                    <Badge
                                        variant="outline"
                                        className="cursor-pointer hover:bg-neutral-100"
                                    >
                                        + {m}
                                    </Badge>
                                </button>
                            ))}
                        </div>
                        <div>
                            <Label htmlFor="models">
                                Candidate models (one per line)
                            </Label>
                            <Textarea
                                id="models"
                                name="models"
                                rows={4}
                                value={modelsText}
                                onChange={(e) => setModelsText(e.target.value)}
                                className="mt-1.5 font-sans"
                            />
                        </div>
                        <div>
                            <Label htmlFor="referenceModel">Reference model</Label>
                            <Select
                                id="referenceModel"
                                name="referenceModel"
                                value={effectiveReference}
                                onChange={(e) => setReferenceModel(e.target.value)}
                                className="mt-1.5"
                            >
                                {modelList.map((m) => (
                                    <option key={m} value={m}>
                                        {m}
                                    </option>
                                ))}
                            </Select>
                            <p className="mt-1 text-xs text-muted">
                                The incumbent baseline (e.g. gpt-4o) for comparison.
                            </p>
                        </div>
                        <div>
                            <Label htmlFor="maxTokens">Max output tokens</Label>
                            <Input
                                id="maxTokens"
                                name="maxTokens"
                                type="number"
                                defaultValue={500}
                                className="mt-1.5 max-w-[200px]"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            <span className="text-muted">4.</span> Judge (optional)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="judgeConfigId">Judge config</Label>
                            <Select
                                id="judgeConfigId"
                                name="judgeConfigId"
                                className="mt-1.5"
                                defaultValue=""
                            >
                                <option value="">— none —</option>
                                {judges.map((j) => (
                                    <option key={j.id} value={j.id}>
                                        {j.name} ({j.modelId})
                                    </option>
                                ))}
                            </Select>
                        </div>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowJudgeForm(!showJudgeForm)}
                        >
                            {showJudgeForm ? "Hide" : "Add new judge"}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            <span className="text-muted">5.</span> Review
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-neutral-700">
                            <strong>{cellCount}</strong> cells will be evaluated (
                            {selectedDataset?.itemCount ?? 0} items × {modelList.length}{" "}
                            models).
                        </p>
                        <p className="text-sm text-muted">
                            Runs in the background — you&apos;ll be redirected to
                            live progress on the run page.
                        </p>
                        <SubmitButton disabled={!canSubmit} />
                    </CardContent>
                </Card>
            </form>

            {showJudgeForm && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Add a judge</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form action={createJudgeAction} className="space-y-4">
                            <div>
                                <Label htmlFor="jname">Name</Label>
                                <Input
                                    id="jname"
                                    name="name"
                                    placeholder="rubric"
                                    className="mt-1.5"
                                />
                            </div>
                            <div>
                                <Label htmlFor="jmodel">Judge model</Label>
                                <Input
                                    id="jmodel"
                                    name="modelId"
                                    defaultValue="gpt-4o-mini"
                                    className="mt-1.5"
                                />
                            </div>
                            <div>
                                <Label htmlFor="rubric">Rubric prompt</Label>
                                <Textarea
                                    id="rubric"
                                    name="rubricPrompt"
                                    rows={3}
                                    className="mt-1.5 font-sans"
                                />
                            </div>
                            <Button type="submit" size="sm">
                                Add judge
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}