// Liveness probe. Does not touch the DB so it works before Postgres is provisioned.
export function GET() {
    return Response.json({ status: "ok" });
}
