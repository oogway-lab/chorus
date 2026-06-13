import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { judgeConfigs } from "../db/schema";

export async function createJudgeConfig(
    teamId: string,
    name: string,
    modelId: string,
    rubricPrompt: string,
) {
    const [row] = await db
        .insert(judgeConfigs)
        .values({ teamId, name, modelId, rubricPrompt })
        .returning();
    return row;
}

export async function listJudgeConfigs(teamId: string) {
    return db
        .select()
        .from(judgeConfigs)
        .where(eq(judgeConfigs.teamId, teamId));
}
