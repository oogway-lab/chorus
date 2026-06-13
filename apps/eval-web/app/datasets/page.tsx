import Link from "next/link";
import { requirePrincipal } from "@/server/auth/session";
import { listDatasets } from "@/server/datasets/service";
import { createDatasetAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function DatasetsPage() {
    const p = await requirePrincipal();
    const datasets = await listDatasets(p.teamId);

    return (
        <div>
            <h1>Datasets</h1>
            <form action={createDatasetAction} className="card">
                <label htmlFor="name">New dataset name</label>
                <input id="name" name="name" type="text" placeholder="Food plates v1" />
                <button type="submit">Create dataset</button>
            </form>

            {datasets.length === 0 && <p className="muted">No datasets yet.</p>}
            {datasets.map((d) => (
                <div key={d.id} className="card">
                    <Link href={`/datasets/${d.id}`}>{d.name}</Link>
                </div>
            ))}
        </div>
    );
}
