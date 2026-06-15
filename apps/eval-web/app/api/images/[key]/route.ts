import { readFile } from "fs/promises";
import { imageFilePath } from "@/server/images/source";
import { requirePrincipal, assertSameTeam } from "@/server/auth/session";
import { getTeamForStorageKey } from "@/server/datasets/service";

export async function GET(
    _req: Request,
    { params }: { params: { key: string } },
) {
    const key = params.key;
    if (!/^[a-f0-9-]{36}$/i.test(key)) {
        return new Response("Not found", { status: 404 });
    }

    try {
        // Only serve an image to a member of the team that owns it. A mismatch
        // throws UnauthorizedError (caught below) so existence is not leaked.
        const principal = await requirePrincipal();
        const teamId = await getTeamForStorageKey(key);
        if (!teamId) return new Response("Not found", { status: 404 });
        assertSameTeam(principal, teamId);

        const bytes = await readFile(imageFilePath(key));
        const mime =
            bytes[0] === 0x89 && bytes[1] === 0x50
                ? "image/png"
                : bytes[0] === 0xff && bytes[1] === 0xd8
                  ? "image/jpeg"
                  : bytes[0] === 0x47 && bytes[1] === 0x49
                    ? "image/gif"
                    : "image/webp";
        return new Response(bytes, {
            headers: {
                "Content-Type": mime,
                "Cache-Control": "private, max-age=3600",
            },
        });
    } catch {
        return new Response("Not found", { status: 404 });
    }
}
