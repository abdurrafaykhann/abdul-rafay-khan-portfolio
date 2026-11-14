import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";

/**
 * An in-process Postgres (PGlite) with the real migrations applied, so Row
 * Level Security can be tested without a Supabase project or network access.
 * Only the pieces Supabase provides are stubbed: its three roles and auth.jwt().
 */

const ROOT = path.resolve(__dirname, "..", "..");
const read = (file: string) =>
  fs.readFileSync(path.join(ROOT, "supabase", file), "utf8");

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create schema auth;
  create function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
  $$;
  grant usage on schema auth to anon, authenticated, service_role;
`;

export const ADMIN_EMAIL = "admin@example.test";

export type Db = PGlite;

export async function createDb(): Promise<Db> {
  const db = await PGlite.create({ extensions: { vector } });
  await db.exec(SUPABASE_STUB);
  // 0002_storage.sql needs Supabase's storage schema, so it is not run here.
  await db.exec(read("migrations/0001_init.sql"));
  await db.exec(read("migrations/0003_knowledge_base.sql"));
  await db.exec(read("migrations/0005_admin_functions.sql"));
  await db.exec(read("migrations/0006_track_events.sql"));
  await db.exec(read("migrations/0007_contact_and_education_order.sql"));
  await db.exec(read("seed.sql"));
  await db.query(
    `insert into private.config (key, value) values ('admin_email', $1)`,
    [ADMIN_EMAIL],
  );
  return db;
}

type Who =
  | { role: "anon" }
  | { role: "authenticated"; email: string }
  | { role: "service_role" };

/** Runs `fn` as the given Supabase role, then returns to the superuser. */
export async function as<T>(
  db: Db,
  who: Who,
  fn: (db: Db) => Promise<T>,
): Promise<T> {
  const claims =
    who.role === "authenticated"
      ? { role: "authenticated", email: who.email }
      : { role: who.role };
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [
    JSON.stringify(claims),
  ]);
  await db.exec(`set role ${who.role}`);
  try {
    return await fn(db);
  } finally {
    await db.exec(`reset role`);
    await db.query(`select set_config('request.jwt.claims', '', false)`);
  }
}

export const asAnon = <T>(db: Db, fn: (db: Db) => Promise<T>) =>
  as(db, { role: "anon" }, fn);
export const asAdmin = <T>(db: Db, fn: (db: Db) => Promise<T>) =>
  as(db, { role: "authenticated", email: ADMIN_EMAIL }, fn);
export const asStranger = <T>(db: Db, fn: (db: Db) => Promise<T>) =>
  as(db, { role: "authenticated", email: "someone-else@example.test" }, fn);
