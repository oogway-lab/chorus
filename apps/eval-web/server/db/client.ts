import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

let pool: Pool | undefined;

function getPool(): Pool {
    if (!pool) {
        const url = process.env.DATABASE_URL;
        if (!url) throw new Error("DATABASE_URL is not set");
        pool = new Pool({
            connectionString: url,
            max: 10,
            idleTimeoutMillis: 30_000,
            // Fast-fail instead of hanging when the pool is exhausted.
            connectionTimeoutMillis: 5_000,
        });
    }
    return pool;
}

export const db = drizzle(getPool(), { schema });
export { schema };
