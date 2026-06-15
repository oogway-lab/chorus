"use client";

import type { LeaderboardRow, MatrixCellScore } from "@/server/runs/reads";
import { Leaderboard } from "@/components/runs/leaderboard";
import { MatrixView } from "@/components/runs/matrix-view";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ModelCol, ItemRow, CellData } from "@/components/runs/types";

export function RunDetailView({
    leaderboard,
    models,
    items,
    cells,
    scoresByCell,
}: {
    leaderboard: LeaderboardRow[];
    models: ModelCol[];
    items: ItemRow[];
    cells: CellData[];
    scoresByCell: Record<string, MatrixCellScore[]>;
}) {
    return (
        <Tabs defaultValue="leaderboard">
            <TabsList>
                <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
                <TabsTrigger value="matrix">Matrix</TabsTrigger>
            </TabsList>
            <TabsContent value="leaderboard">
                <Card className="p-4">
                    <Leaderboard rows={leaderboard} />
                </Card>
            </TabsContent>
            <TabsContent value="matrix">
                <MatrixView
                    models={models}
                    items={items}
                    cells={cells}
                    scoresByCell={scoresByCell}
                />
            </TabsContent>
        </Tabs>
    );
}