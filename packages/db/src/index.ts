import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

export { schema };
export type Db = NodePgDatabase<typeof schema>;

let pool: pg.Pool | undefined;
let db: Db | undefined;

/** One small pool per process. Neon pooled URL (PgBouncer) → keep it small; no idle keep-alive (D-030). */
export function getDb(url = process.env.DATABASE_URL): Db {
  if (db) return db;
  if (!url) throw new Error('DATABASE_URL is not set (see docs/SETUP.md §6).');
  pool = new pg.Pool({ connectionString: url, max: 5, idleTimeoutMillis: 10_000, allowExitOnIdle: true });
  db = drizzle(pool, { schema });
  return db;
}

export async function closeDb(): Promise<void> {
  await pool?.end();
  pool = undefined;
  db = undefined;
}

// Query helpers re-exported so apps don't need their own drizzle-orm dependency.
export { and, asc, desc, eq, gt, gte, ilike, inArray, isNull, lt, ne, notInArray, or, sql } from 'drizzle-orm';
