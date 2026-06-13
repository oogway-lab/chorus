import { eq, desc } from "drizzle-orm";
import { db } from "../db/client";
import { prompts, promptVersions } from "../db/schema";

export async function createPrompt(
    teamId: string,
    name: string,
    scope: "shared" | "model",
    basePromptId?: string,
) {
    const [row] = await db
        .insert(prompts)
        .values({ teamId, name, scope, basePromptId })
        .returning();
    return row;
}

export async function listPrompts(teamId: string) {
    return db.select().from(prompts).where(eq(prompts.teamId, teamId));
}

export async function getPrompt(id: string) {
    const [row] = await db
        .select()
        .from(prompts)
        .where(eq(prompts.id, id))
        .limit(1);
    return row;
}

/** Append a new immutable version; version numbers auto-increment per prompt. */
export async function addPromptVersion(
    promptId: string,
    content: string,
    createdBy: string,
) {
    const latest = await latestVersion(promptId);
    const nextVersion = (latest?.version ?? 0) + 1;
    const [row] = await db
        .insert(promptVersions)
        .values({ promptId, version: nextVersion, content, createdBy })
        .returning();
    return row;
}

export async function listVersions(promptId: string) {
    return db
        .select()
        .from(promptVersions)
        .where(eq(promptVersions.promptId, promptId))
        .orderBy(desc(promptVersions.version));
}

export async function latestVersion(promptId: string) {
    const [row] = await db
        .select()
        .from(promptVersions)
        .where(eq(promptVersions.promptId, promptId))
        .orderBy(desc(promptVersions.version))
        .limit(1);
    return row;
}

export async function getPromptVersion(id: string) {
    const [row] = await db
        .select()
        .from(promptVersions)
        .where(eq(promptVersions.id, id))
        .limit(1);
    return row;
}
