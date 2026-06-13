// Placeholder auth. Every server entry point must resolve a team-scoped principal
// before touching data. Wire a real provider (session/OIDC/SSO) before any non-local
// deployment — this stub only sketches the contract the rest of the app depends on.

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

/**
 * Resolve the current principal from the request context. Throws if unauthenticated.
 * TODO(impl): replace with real session/token resolution.
 */
export async function requirePrincipal(): Promise<Principal> {
    throw new UnauthorizedError(
        "Auth not yet wired — implement requirePrincipal before deploying.",
    );
}

/** Guard a team-owned row: throws if it does not belong to the principal's team. */
export function assertSameTeam(principal: Principal, rowTeamId: string): void {
    if (principal.teamId !== rowTeamId) {
        throw new UnauthorizedError("Resource belongs to another team.");
    }
}
