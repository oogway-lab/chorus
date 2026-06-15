import Link from "next/link";
import { requirePrincipal } from "@/server/auth/session";
import {
    getDashboardStats,
    getRecentRuns,
} from "@/server/dashboard/reads";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RunStatusBadge } from "@/components/ui/status-badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { fmtDate, shortId } from "@/lib/format";

export const dynamic = "force-dynamic";

const steps = [
    {
        key: "dataset",
        label: "Create a dataset",
        href: "/datasets",
        check: (s: Awaited<ReturnType<typeof getDashboardStats>>) =>
            s.hasDatasetWithItems && s.hasDatasetWithSchema,
    },
    {
        key: "prompt",
        label: "Author a prompt",
        href: "/prompts",
        check: (s: Awaited<ReturnType<typeof getDashboardStats>>) => s.hasPrompt,
    },
    {
        key: "run",
        label: "Run evaluation",
        href: "/runs/new",
        check: (s: Awaited<ReturnType<typeof getDashboardStats>>) =>
            s.runCount > 0,
    },
] as const;

export default async function HomePage() {
    const p = await requirePrincipal();
    const stats = await getDashboardStats(p.teamId);
    const recentRuns = await getRecentRuns(p.teamId);

    return (
        <div>
            <PageHeader
                title="Model Eval"
                description="Compare OpenAI models on image or text datasets — structured output, latency, cost, and scoring — to pick a cheaper model that holds quality."
                action={
                    <Button asChild>
                        <Link href="/runs/new">+ New run</Link>
                    </Button>
                }
            />

            <div className="mb-8 grid gap-4 sm:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted">
                            Datasets
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-semibold">{stats.datasetCount}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted">
                            Prompts
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-semibold">{stats.promptCount}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted">
                            Runs
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-semibold">
                            {stats.runCount}
                            {stats.runningCount > 0 && (
                                <span className="ml-2 text-sm font-normal text-primary">
                                    {stats.runningCount} active
                                </span>
                            )}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>Getting started</CardTitle>
                </CardHeader>
                <CardContent>
                    <ol className="space-y-3">
                        {steps.map((step, i) => {
                            const done = step.check(stats);
                            return (
                                <li key={step.key} className="flex items-center gap-3">
                                    <span
                                        className={
                                            done
                                                ? "shrink-0 text-success"
                                                : "shrink-0 text-neutral-300"
                                        }
                                        aria-hidden
                                    >
                                        {done ? "✓" : "○"}
                                    </span>
                                    <span className="text-sm text-neutral-600">
                                        {i + 1}.
                                    </span>
                                    <Link
                                        href={step.href}
                                        className="text-sm font-medium hover:underline"
                                    >
                                        {step.label}
                                    </Link>
                                    <span className="text-muted" aria-hidden>
                                        →
                                    </span>
                                </li>
                            );
                        })}
                    </ol>
                </CardContent>
            </Card>

            <div>
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Recent runs</h2>
                    <Link
                        href="/runs"
                        className="text-sm text-primary hover:underline"
                    >
                        View all
                    </Link>
                </div>
                {recentRuns.length === 0 ? (
                    <p className="text-sm text-muted">
                        No runs yet.{" "}
                        <Link href="/runs/new" className="text-primary hover:underline">
                            Start your first evaluation
                        </Link>
                    </p>
                ) : (
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Run</TableHead>
                                    <TableHead>Dataset</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Progress</TableHead>
                                    <TableHead>Created</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentRuns.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell>
                                            <Link
                                                href={`/runs/${r.id}`}
                                                className="font-mono text-sm hover:underline"
                                            >
                                                {shortId(r.id)}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{r.datasetName}</TableCell>
                                        <TableCell>
                                            <RunStatusBadge status={r.status} />
                                        </TableCell>
                                        <TableCell className="text-muted">
                                            {r.progress.done}/{r.progress.total}
                                        </TableCell>
                                        <TableCell className="text-muted">
                                            {fmtDate(r.createdAt)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                )}
            </div>
        </div>
    );
}