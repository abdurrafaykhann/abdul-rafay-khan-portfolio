// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asAdmin, asAnon, asStranger, createDb, type Db } from "./harness";

let db: Db;
let catCv: string;
let catMl: string;
let typePersonal: string;
let typeClient: string;

const one = async <T>(d: Db, sql: string, params: unknown[] = []) =>
  (await d.query<T>(sql, params)).rows[0];

beforeAll(async () => {
  db = await createDb();
  const id = async (table: string, slug: string) =>
    (
      await one<{ id: string }>(
        db,
        `select id from public.${table} where slug = $1`,
        [slug],
      )
    ).id;
  catCv = await id("categories", "computer-vision");
  catMl = await id("categories", "ml-data-science");
  typePersonal = await id("project_types", "personal");
  typeClient = await id("project_types", "client");
}, 120_000);

afterAll(async () => {
  await db?.close();
});

const payload = (over: Record<string, unknown> = {}) => ({
  slug: "vision-demo",
  title: "Vision Demo",
  type_id: typePersonal,
  primary_category_id: catCv,
  category_ids: [catMl],
  status: "live",
  published: false,
  short_desc: "A demo",
  tech: ["Python", "OpenCV"],
  links: { live: "https://example.com" },
  metrics: [
    { label: "mAP", value: "0.71", highlight: true },
    { label: "FPS", value: "30", highlight: false },
  ],
  traction: [
    { label: "Users", value: "50", as_of: "2026-10-01", show_public: true },
  ],
  changelog: [{ entry_date: "2026-10-02", note: "Launched" }],
  trained_vs_integrated: [
    {
      component: "Detector",
      kind: "trained",
      source_model: "YOLO",
      evaluation: "mAP 0.71",
    },
  ],
  media: [{ kind: "gallery", url: "/a.webp", alt: "Screen" }],
  ...over,
});

const save = (d: Db, p: object) =>
  one<{ id: string }>(d, `select public.save_project($1::jsonb) as id`, [
    JSON.stringify(p),
  ]);

describe("save_project", () => {
  it("lets the admin create a project with all child rows in one call", async () => {
    const { id } = await asAdmin(db, (d) => save(d, payload()));
    const row = await one<{ title: string; tech: string[]; links: object }>(
      db,
      `select title, tech, links from public.projects where id = $1`,
      [id],
    );
    expect(row).toEqual({
      title: "Vision Demo",
      tech: ["Python", "OpenCV"],
      links: { live: "https://example.com" },
    });
    const cats = await db.query<{ category_id: string }>(
      `select category_id from public.project_categories where project_id = $1 order by 1`,
      [id],
    );
    // primary category is always included
    expect(cats.rows.map((r) => r.category_id).sort()).toEqual(
      [catCv, catMl].sort(),
    );
    const metrics = await db.query<{ label: string; sort: number }>(
      `select label, sort from public.project_metrics where project_id = $1 order by sort`,
      [id],
    );
    expect(metrics.rows).toEqual([
      { label: "mAP", sort: 0 },
      { label: "FPS", sort: 1 },
    ]);
    await db.query(`delete from public.projects where id = $1`, [id]);
  });

  it("updates in place and replaces child rows", async () => {
    const { id } = await asAdmin(db, (d) =>
      save(d, payload({ slug: "upd-demo" })),
    );
    await asAdmin(db, (d) =>
      save(d, payload({ id, slug: "upd-demo", title: "Renamed", metrics: [] })),
    );
    const row = await one<{ title: string; n: number }>(
      db,
      `select title, (select count(*)::int from public.project_metrics m where m.project_id = p.id) as n
       from public.projects p where id = $1`,
      [id],
    );
    expect(row).toEqual({ title: "Renamed", n: 0 });
    await db.query(`delete from public.projects where id = $1`, [id]);
  });

  it("is atomic: a bad child row leaves nothing behind", async () => {
    await expect(
      asAdmin(db, (d) =>
        save(
          d,
          payload({
            slug: "atomic-demo",
            trained_vs_integrated: [{ component: "X", kind: "bogus" }],
          }),
        ),
      ),
    ).rejects.toThrow(/check constraint/i);
    const n = await one<{ n: number }>(
      db,
      `select count(*)::int as n from public.projects where slug = 'atomic-demo'`,
    );
    expect(n.n).toBe(0);
  });

  it("enforces the publish rules (client approval)", async () => {
    await expect(
      asAdmin(db, (d) =>
        save(
          d,
          payload({
            slug: "client-demo",
            type_id: typeClient,
            published: true,
          }),
        ),
      ),
    ).rejects.toThrow(/client approval is required/i);
    const { id } = await asAdmin(db, (d) =>
      save(
        d,
        payload({
          slug: "client-demo",
          type_id: typeClient,
          published: true,
          client_approved: true,
        }),
      ),
    );
    expect(id).toBeTruthy();
    await db.query(`delete from public.projects where id = $1`, [id]);
  });

  it("rejects anonymous visitors and signed-in non-admins", async () => {
    await expect(
      asAnon(db, (d) => save(d, payload({ slug: "anon-demo" }))),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      asStranger(db, (d) => save(d, payload({ slug: "stranger-demo" }))),
    ).rejects.toThrow(/row-level security/i);
  });
});

describe("duplicate_project", () => {
  it("copies a project as an unpublished, non-key draft with a unique slug", async () => {
    const { id } = await asAdmin(db, (d) =>
      save(d, payload({ slug: "dup-demo", published: true, is_key: true })),
    );
    const first = await asAdmin(db, (d) =>
      one<{ id: string }>(d, `select public.duplicate_project($1) as id`, [id]),
    );
    const second = await asAdmin(db, (d) =>
      one<{ id: string }>(d, `select public.duplicate_project($1) as id`, [id]),
    );
    const rows = await db.query<{
      slug: string;
      title: string;
      published: boolean;
      is_key: boolean;
      m: number;
    }>(
      `select slug, title, published, is_key,
              (select count(*)::int from public.project_metrics x where x.project_id = p.id) as m
       from public.projects p where id = any($1) order by slug`,
      [[first.id, second.id]],
    );
    expect(rows.rows).toEqual([
      {
        slug: "dup-demo-copy",
        title: "Vision Demo (copy)",
        published: false,
        is_key: false,
        m: 2,
      },
      {
        slug: "dup-demo-copy-2",
        title: "Vision Demo (copy)",
        published: false,
        is_key: false,
        m: 2,
      },
    ]);
    await db.query(`delete from public.projects where slug like 'dup-demo%'`);
  });

  it("is rejected for non-admins", async () => {
    const anyId = (
      await one<{ id: string }>(db, `select id from public.projects limit 1`)
    ).id;
    await expect(
      asAnon(db, (d) =>
        d.query(`select public.duplicate_project($1)`, [anyId]),
      ),
    ).rejects.toThrow(/permission denied/i);
  });
});

describe("reorder", () => {
  it("stores the new order for the admin", async () => {
    const before = await db.query<{ id: string }>(
      `select id from public.categories order by sort`,
    );
    const reversed = before.rows.map((r) => r.id).reverse();
    await asAdmin(db, (d) =>
      d.query(`select public.reorder('categories', $1::uuid[])`, [reversed]),
    );
    const after = await db.query<{ id: string }>(
      `select id from public.categories order by sort`,
    );
    expect(after.rows.map((r) => r.id)).toEqual(reversed);
    await asAdmin(db, (d) =>
      d.query(`select public.reorder('categories', $1::uuid[])`, [
        before.rows.map((r) => r.id),
      ]),
    );
  });

  it("changes nothing for a signed-in non-admin, and rejects unknown lists", async () => {
    const before = await db.query<{ id: string }>(
      `select id from public.categories order by sort`,
    );
    await asStranger(db, (d) =>
      d.query(`select public.reorder('categories', $1::uuid[])`, [
        before.rows.map((r) => r.id).reverse(),
      ]),
    );
    const after = await db.query<{ id: string }>(
      `select id from public.categories order by sort`,
    );
    expect(after.rows).toEqual(before.rows);
    await expect(
      asAdmin(db, (d) =>
        d.query(`select public.reorder('nope', '{}'::uuid[])`),
      ),
    ).rejects.toThrow(/unknown list/i);
  });
});
