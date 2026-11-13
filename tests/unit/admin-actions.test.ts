// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Server Actions: every one verifies the admin first. Supabase and the
 * Next.js cache are replaced with fakes; nothing touches a real database.
 */

const rpc = vi.fn();
const fromChain = {
  update: vi.fn(() => fromChain),
  delete: vi.fn(() => fromChain),
  eq: vi.fn(async () => ({ error: null })),
};
const supabase = { rpc, from: vi.fn(() => fromChain) };
let signedIn = true;

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ updateTag: vi.fn() }));
vi.mock("@/lib/data/content", () => ({ CONTENT_TAG: "content" }));
vi.mock("@/lib/admin/auth", () => {
  class NotAdminError extends Error {}
  return {
    NotAdminError,
    assertAdmin: vi.fn(async () => {
      if (!signedIn) throw new NotAdminError();
      return { supabase, user: { email: "admin@example.test" } };
    }),
  };
});

const actions = await import("@/lib/admin/actions");
const { updateTag } = await import("next/cache");

const valid = { slug: "demo", title: "Demo", status: "live" as const };

beforeEach(() => {
  vi.clearAllMocks();
  signedIn = true;
  rpc.mockResolvedValue({ data: "new-id", error: null });
});

describe("admin actions reject anyone who is not the admin", () => {
  it.each([
    ["saveProject", () => actions.saveProject(valid)],
    ["deleteProject", () => actions.deleteProject("x")],
    ["duplicateProject", () => actions.duplicateProject("x")],
    ["setProjectFlag", () => actions.setProjectFlag("x", "published", true)],
    ["reorder", () => actions.reorder("projects", [])],
    [
      "saveCategory",
      () => actions.saveCategory({ slug: "a", name: "A", color: "#000000" }),
    ],
    ["deleteCategory", () => actions.deleteCategory("x")],
    ["saveType", () => actions.saveType({ slug: "a", name: "A" })],
    ["deleteType", () => actions.deleteType("x")],
  ])("%s", async (_name, call) => {
    signedIn = false;
    const res = await call();
    expect(res).toEqual({
      ok: false,
      error: "You are not signed in as the admin.",
    });
    expect(rpc).not.toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe("saveProject", () => {
  it("validates before touching the database", async () => {
    const res = await actions.saveProject({ ...valid, slug: "Not A Slug" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.fieldErrors?.slug).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("saves through save_project and refreshes the public site", async () => {
    const res = await actions.saveProject(valid);
    expect(res).toEqual({ ok: true, data: { id: "new-id" } });
    expect(rpc).toHaveBeenCalledWith("save_project", {
      p: expect.objectContaining({ slug: "demo", title: "Demo" }),
    });
    expect(updateTag).toHaveBeenCalledWith("content");
  });

  it("turns a database rule violation into a readable message", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: {
        message:
          "Client approval is required before this project can be published",
      },
    });
    const res = await actions.saveProject(valid);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/client approved/i);
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe("setProjectFlag", () => {
  it("refuses columns other than the three toggles", async () => {
    const res = await actions.setProjectFlag("x", "slug" as never, true);
    expect(res.ok).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe("reorder", () => {
  it("refuses unknown lists and non-uuid ids", async () => {
    expect((await actions.reorder("users", [])).ok).toBe(false);
    expect((await actions.reorder("projects", ["1; drop table"])).ok).toBe(
      false,
    );
    expect(rpc).not.toHaveBeenCalled();
  });
});
