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

/**
 * Append a new immutable version; version numbers auto-increment per prompt.
 * Serialized with a row lock on the parent prompt so concurrent appends can't
 * collide on the (prompt_id, version) unique constraint.
 */
export async function addPromptVersion(
    promptId: string,
    content: string,
    createdBy: string,
) {
    return db.transaction(async (tx) => {
        await tx
            .select({ id: prompts.id })
            .from(prompts)
            .where(eq(prompts.id, promptId))
            .for("update");
        const [latest] = await tx
            .select({ version: promptVersions.version })
            .from(promptVersions)
            .where(eq(promptVersions.promptId, promptId))
            .orderBy(desc(promptVersions.version))
            .limit(1);
        const nextVersion = (latest?.version ?? 0) + 1;
        const [row] = await tx
            .insert(promptVersions)
            .values({ promptId, version: nextVersion, content, createdBy })
            .returning();
        return row;
    });
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
