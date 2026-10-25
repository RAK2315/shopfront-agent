// Read-only counts for planning the dashboard take. Usage (from apps/web): node --env-file=../../.env ../../video/capture/db-peek.mjs
import { createRequire } from "node:module";
const require = createRequire(process.cwd() + "/package.json");
const pg = require("pg");
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const q = async (s, p = []) => (await db.query(s, p)).rows;
console.log(await q("select s.handle, c.is_test, c.status, count(*)::int n from checkouts c join sellers s on s.id=c.seller_id group by 1,2,3 order by 1,2,3"));
await db.end();
