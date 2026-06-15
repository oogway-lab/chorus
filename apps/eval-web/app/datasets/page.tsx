import Link from "next/link";
import { requirePrincipal } from "@/server/auth/session";
import { listDatasetsEnriched } from "@/server/datasets/reads";
import { createDatasetAction } from "@/app/actions";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DatasetsPage() {
    const p = await requirePrincipal();
    const datasets = await listDatasetsEnriched(p.teamId);

    return (
        <div>
            <PageHeader
                title="Datasets"
                description="Image and text collections with optional ground-truth labels and output schemas."
            />

            <Card className="mb-8">
                <CardContent className="pt-5">
                    <form action={createDatasetAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="flex-1">
                            <Label htmlFor="name">New dataset name</Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="Food plates v1"
                                className="mt-1.5"
                            />
                        </div>
                        <Button type="submit">Create dataset</Button>
                    </form>
                </CardContent>
            </Card>

            {datasets.length === 0 ? (
                <EmptyState
                    title="No datasets yet"
                    description="Create a dataset, define its output schema and field match rules, then add items with optional labels."
                    actionLabel="Create dataset"
                    actionHref="/datasets"
                />
            ) : (
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Items</TableHead>
                                <TableHead>Schema</TableHead>
                                <TableHead>Created</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {datasets.map((d) => (
                                <TableRow key={d.id}>
                                    <TableCell>
                                        <Link
                                            href={`/datasets/${d.id}`}
                                            className="font-medium hover:underline"
                                        >
                                            {d.name}
                                        </Link>
                                    </TableCell>
                                    <TableCell>{d.itemCount}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={d.hasSchema ? "success" : "outline"}
                                        >
                                            {d.hasSchema ? "Defined" : "Missing"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted">
                                        {fmtDate(d.createdAt)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}
        </div>
    );
}