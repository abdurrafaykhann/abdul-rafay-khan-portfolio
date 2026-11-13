/**
 * Applies the SQL migrations to your Supabase database, records which ones
 * have run, and sets the admin email.
 *
 *   npm run db:apply            migrations + admin email
 *   npm run db:apply -- --seed  …and the seed data (types, categories, drafts)
 *
 * Needs in .env.local:
 *   SUPABASE_DB_URL  Supabase → Project Settings → Database → Connection string (URI)
 *   ADMIN_EMAIL      the only email allowed to sign in to /admin
 */
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

const DIR = path.join(process.cwd(), "supabase");

async function main() {
  if (fs.existsSync(".env.local")) process.loadEnvFile(".env.local");
  const dbUrl = process.env.SUPABASE_DB_URL;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!dbUrl) throw new Error("SUPABASE_DB_URL is missing from .env.local");
  if (!adminEmail) throw new Error("ADMIN_EMAIL is missing from .env.local");

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query(`create schema if not exists private`);
    await client.query(`
      create table if not exists private.schema_migrations (
        name text primary key,
        applied_at timestamptz not null default now()
      )`);

    const files = fs
      .readdirSync(path.join(DIR, "migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const done = await client.query(
        `select 1 from private.schema_migrations where name = $1`,
        [file],
      );
      if (done.rowCount) {
        console.log(`  already applied  ${file}`);
        continue;
      }
      const sql = fs.readFileSync(path.join(DIR, "migrations", file), "utf8");
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query(
          `insert into private.schema_migrations (name) values ($1)`,
          [file],
        );
        await client.query("commit");
        console.log(`  applied          ${file}`);
      } catch (error) {
        await client.query("rollback");
        throw new Error(`${file} failed and was rolled back: ${error}`);
      }
    }

    await client.query(
      `insert into private.config (key, value) values ('admin_email', $1)
       on conflict (key) do update set value = excluded.value`,
      [adminEmail],
    );
    console.log("  admin email set");

    if (process.argv.includes("--seed")) {
      await client.query(fs.readFileSync(path.join(DIR, "seed.sql"), "utf8"));
      console.log("  seed data applied");
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(String(error instanceof Error ? error.message : error));
  process.exit(1);
});
