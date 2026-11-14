// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asAdmin, asAnon, createDb, type Db } from "./harness";

let db: Db;
let sentinel: string;
let draft: string;

beforeAll(async () => {
  db = await createDb();
  const id = async (slug: string) =>
    (
      await db.query<{ id: string }>(
        `select id from public.projects where slug = $1`,
        [slug],
      )
    ).rows[0].id;
  sentinel = await id("sentinel");
  draft = await id("docsense");
  await db.exec(
    `update public.projects set published = true where slug = 'sentinel'`,
  );
}, 120_000);

afterAll(async () => {
  await db?.close();
});

const insert = (
  d: Db,
  type: string,
  project: string | null,
  target: string | null = null,
) =>
  d.query(
    `insert into public.events (type, project_id, target) values ($1, $2, $3)`,
    [type, project, target],
  );

describe("visitor tracking (anon inserts on events)", () => {
  it("records a view and a click for a published project", async () => {
    await asAnon(db, async (d) => {
      await insert(d, "view", sentinel);
      await insert(d, "click", sentinel, "github");
    });
    const n = await db.query<{ n: number }>(
      `select count(*)::int as n from public.events`,
    );
    expect(n.rows[0].n).toBe(2);
  });

  it("rejects unpublished projects, unknown types, missing project and long targets", async () => {
    await asAnon(db, async (d) => {
      await expect(insert(d, "view", draft)).rejects.toThrow(
        /row-level security/i,
      );
      await expect(insert(d, "purchase", sentinel)).rejects.toThrow(
        /row-level security|check/i,
      );
      await expect(insert(d, "view", null)).rejects.toThrow(
        /row-level security/i,
      );
      await expect(
        insert(d, "click", sentinel, "x".repeat(201)),
      ).rejects.toThrow(/row-level security/i);
    });
  });

  it("visitors can never read, change or delete events", async () => {
    await asAnon(db, async (d) => {
      await expect(d.query(`select * from public.events`)).rejects.toThrow(
        /permission denied/i,
      );
      await expect(d.exec(`delete from public.events`)).rejects.toThrow(
        /permission denied/i,
      );
      await expect(
        d.exec(`update public.events set type = 'view'`),
      ).rejects.toThrow(/permission denied/i);
    });
  });

  it("the admin can read the events", async () => {
    await asAdmin(db, async (d) => {
      const n = await d.query<{ n: number }>(
        `select count(*)::int as n from public.events`,
      );
      expect(n.rows[0].n).toBe(2);
    });
  });
});
