import Link from "next/link";
import {
    getDataset,
    getDatasetSchema,
    listItems,
    getLabelForItem,
} from "@/server/datasets/service";
import { setSchemaAction, addItemAction } from "@/app/actions";

export const dynamic = "force-dynamic";

const SCHEMA_TEMPLATE = JSON.stringify(
    {
        type: "object",
        additionalProperties: false,
        required: ["dish", "calories", "items"],
        properties: {
            dish: { type: "string" },
            calories: { type: "number" },
            items: { type: "array", items: { type: "string" } },
        },
    },
    null,
    2,
);

const RULES_TEMPLATE = JSON.stringify(
    [
        { field: "dish", matcher: "exact" },
        { field: "calories", matcher: "numeric_tolerance", tolerance: 0.25, relative: true },
        { field: "items", matcher: "set_overlap" },
    ],
    null,
    2,
);

export default async function DatasetPage({
    params,
}: {
    params: { id: string };
}) {
    const dataset = await getDataset(params.id);
    if (!dataset) return <p>Dataset not found.</p>;
    const schema = await getDatasetSchema(params.id);
    const items = await listItems(params.id);
    const labels = await Promise.all(
        items.map((i) => getLabelForItem(i.id)),
    );

    return (
        <div>
            <p className="muted">
                <Link href="/datasets">← Datasets</Link>
            </p>
            <h1>{dataset.name}</h1>

            <h2>Output schema + field match rules</h2>
            <form action={setSchemaAction} className="card">
                <input type="hidden" name="datasetId" value={dataset.id} />
                <label htmlFor="jsonSchema">JSON schema</label>
                <textarea
                    id="jsonSchema"
                    name="jsonSchema"
                    defaultValue={
                        schema
                            ? JSON.stringify(schema.jsonSchema, null, 2)
                            : SCHEMA_TEMPLATE
                    }
                    rows={10}
                />
                <label htmlFor="fieldRules">
                    Field rules (exact / numeric_tolerance / set_overlap)
                </label>
                <textarea
                    id="fieldRules"
                    name="fieldRules"
                    defaultValue={
                        schema
                            ? JSON.stringify(schema.fieldRules, null, 2)
                            : RULES_TEMPLATE
                    }
                    rows={8}
                />
                <button type="submit">Save schema</button>
            </form>

            <h2>Add item</h2>
            <form action={addItemAction} className="card">
                <input type="hidden" name="datasetId" value={dataset.id} />
                <label htmlFor="inputText">Input text (optional)</label>
                <textarea id="inputText" name="inputText" rows={2} />
                <label htmlFor="image">Image (optional)</label>
                <input id="image" name="image" type="file" accept="image/*" />
                <label htmlFor="label">Ground-truth label JSON (optional)</label>
                <textarea
                    id="label"
                    name="label"
                    rows={3}
                    placeholder='{"dish":"oatmeal","calories":350,"items":["oatmeal","banana"]}'
                />
                <button type="submit">Add item</button>
            </form>

            <h2>Items ({items.length})</h2>
            {items.map((item, i) => (
                <div key={item.id} className="card">
                    <div className="muted">
                        {item.type}
                        {item.storageKey ? " · has image" : ""}
                    </div>
                    {item.inputText && <pre>{item.inputText}</pre>}
                    {labels[i] && (
                        <div className="muted">
                            label: <code>{JSON.stringify(labels[i])}</code>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
