// Creates a database on the test Postgres if missing (works locally and on CI service containers).
// Usage: node scripts/db-create.mjs <name>
import pg from "pg";

const name = process.argv[2];
if (!/^[a-z_][a-z0-9_]*$/.test(name ?? "")) throw new Error("usage: node scripts/db-create.mjs <lowercase_db_name>");
const base = new URL(process.env.TEST_DATABASE_URL || "postgresql://sakhi:sakhi@localhost:54320/sakhiline_test");
base.pathname = "/postgres";
base.search = "";

const client = new pg.Client({ connectionString: base.toString() });
await client.connect();
const { rowCount } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
if (!rowCount) await client.query(`CREATE DATABASE ${name}`); // name is validated above
await client.end();
console.log(rowCount ? `${name} exists` : `${name} created`);
