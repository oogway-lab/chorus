import Link from "next/link";
import { requirePrincipal } from "@/server/auth/session";
import { listRuns } from "@/server/runs/service";

export const dynamic = "force-dynamic";

export default async function RunsPage() {
    const p = await requirePrincipal();
    const runs = await listRuns(p.teamId);

    return (
        <div>
            <h1>Runs</h1>
            <p>
                <Link href="/runs/new">+ New run</Link>
            </p>
            {runs.length === 0 && <p className="muted">No runs yet.</p>}
            <table>
                <thead>
                    <tr>
                        <th>Run</th>
                        <th>Status</th>
                        <th>Created</th>
                    </tr>
                </thead>
                <tbody>
                    {runs.map((r) => (
                        <tr key={r.id}>
                            <td>
                                <Link href={`/runs/${r.id}`}>
                                    {r.id.slice(0, 8)}
                                </Link>
                            </td>
                            <td>{r.status}</td>
                            <td className="muted">
                                {new Date(r.createdAt).toLocaleString()}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
