// Prints table sizes and write-rate stats. Usage: npx tsx scripts/db-report.ts [dev|prod]
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });
const target = process.argv[2] ?? "dev";
const url = target === "prod" ? process.env.DATABASE_URL : process.env.DATABASE_URL_DEV;
if (!url) throw new Error(`No URL for target ${target}`);
const sql = neon(url);

const sizes = await sql`
  select c.relname as table, pg_total_relation_size(c.oid) as bytes, s.n_live_tup as live, s.n_dead_tup as dead,
         s.n_tup_ins as inserts, s.n_tup_upd as updates, s.n_tup_del as deletes
  from pg_class c join pg_stat_user_tables s on s.relid = c.oid order by bytes desc`;
console.log(`== ${target} table sizes`);
for (const r of sizes) console.log(`${String(r.table).padEnd(18)} ${(Number(r.bytes) / 1024).toFixed(0).padStart(7)} KiB  live=${r.live} dead=${r.dead} ins=${r.inserts} upd=${r.updates} del=${r.deletes}`);
const [span] = await sql`select count(*)::int n, min(first_seen_at) first, max(first_seen_at) last,
  extract(epoch from (max(first_seen_at) - min(first_seen_at)))/86400 as days from prediction_log`;
console.log("prediction_log span:", span);
const [db] = await sql`select pg_database_size(current_database()) as bytes`;
console.log(`database total: ${(Number(db!.bytes) / 1048576).toFixed(1)} MiB`);
