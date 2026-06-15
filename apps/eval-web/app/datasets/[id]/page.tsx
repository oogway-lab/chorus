import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePrincipal, assertSameTeam } from "@/server/auth/session";
import {
    getDataset,
    getDatasetSchema,
    listItems,
    getLabelForItem,
} from "@/server/datasets/service";
import { getDatasetMeta } from "@/server/datasets/reads";
import { setSchemaAction, addItemAction } from "@/app/actions";
import { PageHeader } from "@/components/layout/page-header";
import { SchemaEditor } from "@/components/datasets/schema-editor";
import { ImageDropzone } from "@/components/datasets/image-dropzone";
import { ItemCard } from "@/components/datasets/item-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FOOD_SCHEMA, FOOD_RULES } from "@/lib/schema-presets";

export const dynamic = "force-dynamic";

export default async function DatasetPage({
    params,
}: {
    params: { id: string };
}) {
    const p = await requirePrincipal();
    const dataset = await getDataset(params.id);
    if (!dataset) notFound();
    assertSameTeam(p, dataset.teamId);
    const schema = await getDatasetSchema(params.id);
    const items = await listItems(params.id);
    const labels = await Promise.all(items.map((i) => getLabelForItem(i.id)));
    const meta = await getDatasetMeta(params.id);

    return (
        <div>
            <PageHeader
                title={dataset.name}
                breadcrumbs={[
                    { label: "Datasets", href: "/datasets" },
                    { label: dataset.name },
                ]}
                action={
                    meta.isReady ? (
                        <Button asChild>
                            <Link href={`/runs/new?datasetId=${dataset.id}`}>
                                Start evaluation run
                            </Link>
                        </Button>
                    ) : undefined
                }
            />

            <div className="grid gap-8 lg:grid-cols-2">
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Output schema</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <SchemaEditor
                                datasetId={dataset.id}
                                initialSchema={
                                    schema
                                        ? JSON.stringify(schema.jsonSchema, null, 2)
                                        : FOOD_SCHEMA
                                }
                                initialRules={
                                    schema
                                        ? JSON.stringify(schema.fieldRules, null, 2)
                                        : FOOD_RULES
                                }
                                action={setSchemaAction}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Add item</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form action={addItemAction} className="space-y-4">
                                <input
                                    type="hidden"
                                    name="datasetId"
                                    value={dataset.id}
                                />
                                <div>
                                    <Label htmlFor="inputText">
                                        Input text (optional)
                                    </Label>
                                    <Textarea
                                        id="inputText"
                                        name="inputText"
                                        rows={2}
                                        className="mt-1.5 font-sans"
                                    />
                                </div>
                                <div>
                                    <Label>Image (optional)</Label>
                                    <div className="mt-1.5">
                                        <ImageDropzone name="image" />
                                    </div>
                                </div>
                                <div>
                                    <Label htmlFor="label">
                                        Ground-truth label JSON (optional)
                                    </Label>
                                    <Textarea
                                        id="label"
                                        name="label"
                                        rows={3}
                                        placeholder='{"dish":"oatmeal","calories":350,"items":["oatmeal","banana"]}'
                                        className="mt-1.5"
                                    />
                                </div>
                                <Button type="submit">Add item</Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                <div>
                    <h2 className="mb-4 text-lg font-semibold">
                        Items ({items.length})
                    </h2>
                    {items.length === 0 ? (
                        <p className="text-sm text-muted">
                            No items yet. Add text, images, or both above.
                        </p>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                            {items.map((item, i) => (
                                <ItemCard
                                    key={item.id}
                                    type={item.type}
                                    storageKey={item.storageKey}
                                    inputText={item.inputText}
                                    label={labels[i]}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}