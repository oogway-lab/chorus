import { cn } from "@/lib/cn";
import { fmtScore } from "@/lib/format";
import type { FieldDiffDetails } from "@/server/db/jsonTypes";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export function FieldDiffTable({ details }: { details: FieldDiffDetails }) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Field</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead>Actual</TableHead>
                    <TableHead>Score</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {details.fields.map((f) => (
                    <TableRow
                        key={f.field}
                        className={cn(
                            f.score >= 1 && "bg-success-muted/30",
                            f.score === 0 && "bg-danger-muted/30",
                            f.score > 0 && f.score < 1 && "bg-ref-muted/30",
                        )}
                    >
                        <TableCell className="font-medium">{f.field}</TableCell>
                        <TableCell className="font-mono text-xs">
                            {JSON.stringify(f.expected)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                            {JSON.stringify(f.actual)}
                        </TableCell>
                        <TableCell>{fmtScore(f.score)}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}