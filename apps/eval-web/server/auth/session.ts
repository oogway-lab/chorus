// Team-scoped principal. In local dev it resolves (and lazily seeds) a single
// default team + user so the app runs without a real auth provider. A production
// deployment must replace requirePrincipal with real session/SSO resolution and
// must not fall through to the dev path.

import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { teams, users } from "../db/schema";

export interface Principal {
    userId: string;
    teamId: string;
}

export class UnauthorizedError extends Error {
    constructor(message = "Unauthorized") {
        super(message);
        this.name = "UnauthorizedError";
    }
}

const DEV_EMAIL = "dev@local";

export async function requirePrincipal(): Promise<Principal> {
    const isProd = process.env.NODE_ENV === "production";
    if (isProd && process.env.AUTH_DEV !== "true") {
        throw new UnauthorizedError(
            "Auth not wired for production — implement requirePrincipal.",
        );
    }

    const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, DEV_EMAIL))
        .limit(1);
    if (existing[0]) {
        return { userId: existing[0].id, teamId: existing[0].teamId };
    }

    const [team] = await db
        .insert(teams)
        .values({ name: "Dev Team" })
        .returning();
    const [user] = await db
        .insert(users)
        .values({ teamId: team.id, email: DEV_EMAIL, name: "Dev" })
        .returning();
    return { userId: user.id, teamId: team.id };
}

/** Guard a team-owned row: throws if it does not belong to the principal's team. */
export function assertSameTeam(principal: Principal, rowTeamId: string): void {
    if (principal.teamId !== rowTeamId) {
        throw new UnauthorizedError("Resource belongs to another team.");
    }
}
