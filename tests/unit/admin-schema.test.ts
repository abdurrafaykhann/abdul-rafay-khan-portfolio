import { describe, expect, it } from "vitest";
import { friendlyDbError } from "@/lib/admin/errors";
import { filterProjects, NO_FILTERS } from "@/lib/admin/filter";
import { isAdminEmail } from "@/lib/admin/is-admin";
import {
  CategorySchema,
  ProjectSchema,
  publishProblems,
  slugify,
  toDbPayload,
} from "@/lib/admin/schema";

const ID = "6b1f6a8e-3f2a-4d0e-9c1b-2a3b4c5d6e7f";
const base = {
  slug: "my-project",
  title: "My Project",
  status: "live" as const,
};

describe("isAdminEmail", () => {
  it("matches only the configured email, ignoring case and spaces", () => {
    expect(isAdminEmail("Admin@Example.com ", "admin@example.com")).toBe(true);
    expect(isAdminEmail("other@example.com", "admin@example.com")).toBe(false);
    expect(isAdminEmail("admin@example.com", "")).toBe(false);
    expect(isAdminEmail(null, "admin@example.com")).toBe(false);
  });
});

describe("ProjectSchema", () => {
  it("fills defaults for a minimal project", () => {
    const p = ProjectSchema.parse(base);
    expect(p.published).toBe(false);
    expect(p.metrics).toEqual([]);
    expect(p.links.live).toBe("");
  });

  it("rejects bad slugs and a missing title", () => {
    expect(
      ProjectSchema.safeParse({ ...base, slug: "My Project" }).success,
    ).toBe(false);
    expect(ProjectSchema.safeParse({ ...base, slug: "-bad-" }).success).toBe(
      false,
    );
    expect(ProjectSchema.safeParse({ ...base, title: "  " }).success).toBe(
      false,
    );
  });

  it("only accepts http(s) links and https / site-path media", () => {
    expect(
      ProjectSchema.safeParse({
        ...base,
        links: { live: "javascript:alert(1)" },
      }).success,
    ).toBe(false);
    expect(
      ProjectSchema.safeParse({ ...base, links: { live: "https://x.dev" } })
        .success,
    ).toBe(true);
    expect(
      ProjectSchema.safeParse({
        ...base,
        imgRight: "http://insecure.dev/a.png",
      }).success,
    ).toBe(false);
    expect(
      ProjectSchema.safeParse({ ...base, imgRight: "//evil.dev/a.png" })
        .success,
    ).toBe(false);
    expect(
      ProjectSchema.safeParse({ ...base, imgRight: "/education/degree.webp" })
        .success,
    ).toBe(true);
    expect(
      ProjectSchema.safeParse({
        ...base,
        imgRight: "https://x.supabase.co/storage/v1/a.webp",
      }).success,
    ).toBe(true);
  });

  it("rejects an unknown status (there is no 'coming soon')", () => {
    expect(
      ProjectSchema.safeParse({ ...base, status: "coming_soon" }).success,
    ).toBe(false);
  });

  it("validates rows: empty metric labels and bad dates fail", () => {
    expect(
      ProjectSchema.safeParse({
        ...base,
        metrics: [{ label: "", value: "1", highlight: false }],
      }).success,
    ).toBe(false);
    expect(
      ProjectSchema.safeParse({
        ...base,
        changelog: [{ date: "13/02/2026", note: "x" }],
      }).success,
    ).toBe(false);
  });
});

describe("toDbPayload", () => {
  it("maps to database column names and drops empty links and testimonials", () => {
    const p = ProjectSchema.parse({
      ...base,
      primaryCategoryId: ID,
      links: { live: "https://x.dev", github: "" },
      traction: [
        { label: "Users", value: "9", asOf: "2026-01-01", showPublic: true },
      ],
      changelog: [{ date: "2026-02-01", note: "Launch" }],
    });
    const db = toDbPayload(p);
    expect(db.primary_category_id).toBe(ID);
    expect(db.links).toEqual({ live: "https://x.dev" });
    expect(db.testimonial).toBeNull();
    expect(db.traction).toEqual([
      { label: "Users", value: "9", as_of: "2026-01-01", show_public: true },
    ]);
    expect(db.changelog).toEqual([
      { entry_date: "2026-02-01", note: "Launch" },
    ]);
    expect(db.id).toBeNull();
  });
});

describe("publishProblems", () => {
  it("lists what is missing before a project can go live", () => {
    expect(
      publishProblems(
        { typeId: "", primaryCategoryId: "", clientApproved: false },
        null,
      ),
    ).toHaveLength(2);
    expect(
      publishProblems(
        { typeId: ID, primaryCategoryId: ID, clientApproved: false },
        { requiresClientApproval: true },
      ),
    ).toEqual(['Tick "Client approved showing this" first.']);
    expect(
      publishProblems(
        { typeId: ID, primaryCategoryId: ID, clientApproved: true },
        { requiresClientApproval: true },
      ),
    ).toEqual([]);
  });
});

describe("CategorySchema", () => {
  it("requires a hex colour", () => {
    expect(
      CategorySchema.safeParse({ slug: "ai", name: "AI", color: "#7621B0" })
        .success,
    ).toBe(true);
    expect(
      CategorySchema.safeParse({ slug: "ai", name: "AI", color: "purple" })
        .success,
    ).toBe(false);
  });
});

describe("slugify", () => {
  it("makes URL-safe slugs", () => {
    expect(slugify("Sweet Crumbs — WhatsApp Agent!")).toBe(
      "sweet-crumbs-whatsapp-agent",
    );
    expect(slugify("  Café 3D  ")).toBe("cafe-3d");
  });
});

describe("filterProjects", () => {
  const p = (over: object) => ({
    title: "Alpha",
    slug: "alpha",
    shortDesc: "",
    tech: ["Python"],
    categoryIds: ["c1"],
    primaryCategoryId: "c1",
    typeId: "t1",
    status: "live" as const,
    published: true,
    isKey: false,
    ...over,
  });
  const items = [
    p({}),
    p({
      title: "Beta",
      slug: "beta",
      tech: ["React"],
      categoryIds: ["c2"],
      primaryCategoryId: "c2",
      published: false,
    }),
    p({
      title: "Gamma",
      slug: "gamma",
      typeId: null,
      isKey: true,
      status: "in_progress" as const,
    }),
  ];

  it("searches title, slug and tech", () => {
    expect(
      filterProjects(items, { ...NO_FILTERS, search: "react" }).map(
        (x) => x.title,
      ),
    ).toEqual(["Beta"]);
  });

  it("combines filters", () => {
    expect(
      filterProjects(items, {
        ...NO_FILTERS,
        categoryId: "c1",
        key: "yes",
      }).map((x) => x.title),
    ).toEqual(["Gamma"]);
    expect(
      filterProjects(items, { ...NO_FILTERS, published: "no" }).map(
        (x) => x.title,
      ),
    ).toEqual(["Beta"]);
    expect(
      filterProjects(items, { ...NO_FILTERS, typeId: "none" }).map(
        (x) => x.title,
      ),
    ).toEqual(["Gamma"]);
    expect(
      filterProjects(items, { ...NO_FILTERS, status: "in_progress" }).map(
        (x) => x.title,
      ),
    ).toEqual(["Gamma"]);
  });
});

describe("friendlyDbError", () => {
  it("explains common failures in plain words", () => {
    expect(
      friendlyDbError(
        "Client approval is required before this project can be published",
      ),
    ).toMatch(/tick/i);
    expect(
      friendlyDbError(
        'duplicate key value violates unique constraint "projects_slug_key"',
      ),
    ).toMatch(/slug/);
    expect(friendlyDbError("violates foreign key constraint")).toMatch(
      /reassign/i,
    );
    expect(
      friendlyDbError("new row violates row-level security policy"),
    ).toMatch(/not signed in/i);
    expect(friendlyDbError("weird internal thing")).not.toMatch(/weird/);
  });
});
