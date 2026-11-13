"use server";

import { updateTag } from "next/cache";
import type { z } from "zod";
import { CONTENT_TAG } from "@/lib/data/content";
import { assertAdmin, NotAdminError } from "./auth";
import { friendlyDbError } from "./errors";
import {
  CategorySchema,
  ProjectSchema,
  ReorderSchema,
  TypeSchema,
  toDbPayload,
  type CategoryInput,
  type ProjectInput,
  type TypeInput,
} from "./schema";

/** Every admin action returns this instead of throwing. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/**
 * Wraps an action: verifies the admin, runs it, refreshes the public site's
 * cache on success, and turns any failure into a readable message.
 */
async function run<T>(
  fn: (
    supabase: Awaited<ReturnType<typeof assertAdmin>>["supabase"],
  ) => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const { supabase } = await assertAdmin();
    const data = await fn(supabase);
    updateTag(CONTENT_TAG);
    return { ok: true, data };
  } catch (error) {
    if (error instanceof NotAdminError) {
      return { ok: false, error: "You are not signed in as the admin." };
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error("[admin action]", message);
    return { ok: false, error: friendlyDbError(message) };
  }
}

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

// ── Projects ───────────────────────────────────────────────────────────

export async function saveProject(
  input: ProjectInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = ProjectSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Some fields need attention.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }
  return run(async (supabase) => {
    const { data, error } = await supabase.rpc("save_project", {
      p: toDbPayload(parsed.data),
    });
    check(error);
    return { id: data as string };
  });
}

export async function deleteProject(id: string): Promise<ActionResult> {
  return run(async (supabase) => {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    check(error);
    return undefined;
  });
}

export async function duplicateProject(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  return run(async (supabase) => {
    const { data, error } = await supabase.rpc("duplicate_project", {
      p_id: id,
    });
    check(error);
    return { id: data as string };
  });
}

export async function setProjectFlag(
  id: string,
  flag: "published" | "is_key" | "show_in_marquee",
  value: boolean,
): Promise<ActionResult> {
  if (!["published", "is_key", "show_in_marquee"].includes(flag)) {
    return { ok: false, error: "Unknown setting." };
  }
  return run(async (supabase) => {
    const { error } = await supabase
      .from("projects")
      .update({ [flag]: value === true })
      .eq("id", id);
    check(error);
    return undefined;
  });
}

export async function reorder(
  list: string,
  ids: string[],
): Promise<ActionResult> {
  const parsed = ReorderSchema.safeParse({ list, ids });
  if (!parsed.success) return { ok: false, error: "Invalid order." };
  return run(async (supabase) => {
    const { error } = await supabase.rpc("reorder", {
      p_list: parsed.data.list,
      p_ids: parsed.data.ids,
    });
    check(error);
    return undefined;
  });
}

// ── Categories ─────────────────────────────────────────────────────────

export async function saveCategory(
  input: CategoryInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = CategorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Some fields need attention.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }
  const c = parsed.data;
  const row = {
    slug: c.slug,
    name: c.name,
    number: c.number,
    description: c.description,
    stack: c.stack,
    color: c.color,
    show_in_what_i_do: c.showInWhatIDo,
  };
  return run(async (supabase) => {
    if (c.id) {
      const { error } = await supabase
        .from("categories")
        .update(row)
        .eq("id", c.id);
      check(error);
      return { id: c.id };
    }
    const { data: last } = await supabase
      .from("categories")
      .select("sort")
      .order("sort", { ascending: false })
      .limit(1);
    const sort = ((last?.[0]?.sort as number | undefined) ?? -1) + 1;
    const { data, error } = await supabase
      .from("categories")
      .insert({ ...row, sort })
      .select("id")
      .single();
    check(error);
    return { id: (data as { id: string }).id };
  });
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  return run(async (supabase) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    check(error);
    return undefined;
  });
}

// ── Project types ──────────────────────────────────────────────────────

export async function saveType(
  input: TypeInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = TypeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Some fields need attention.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }
  const t = parsed.data;
  const row = {
    slug: t.slug,
    name: t.name,
    has_client_fields: t.hasClientFields,
    has_automation_fields: t.hasAutomationFields,
    has_product_fields: t.hasProductFields,
    requires_client_approval: t.requiresClientApproval,
  };
  return run(async (supabase) => {
    if (t.id) {
      const { error } = await supabase
        .from("project_types")
        .update(row)
        .eq("id", t.id);
      check(error);
      return { id: t.id };
    }
    const { data: last } = await supabase
      .from("project_types")
      .select("sort")
      .order("sort", { ascending: false })
      .limit(1);
    const sort = ((last?.[0]?.sort as number | undefined) ?? -1) + 1;
    const { data, error } = await supabase
      .from("project_types")
      .insert({ ...row, sort })
      .select("id")
      .single();
    check(error);
    return { id: (data as { id: string }).id };
  });
}

export async function deleteType(id: string): Promise<ActionResult> {
  return run(async (supabase) => {
    const { error } = await supabase
      .from("project_types")
      .delete()
      .eq("id", id);
    check(error);
    return undefined;
  });
}
