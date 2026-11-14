"use server";

import { revalidateTag, updateTag } from "next/cache";
import { after } from "next/server";
import { reindex } from "@/lib/rag/server";
import type { z } from "zod";
import { CONTENT_TAG } from "@/lib/data/content";
import {
  sanitizeWorkflow,
  summarizeRemovals,
  type Removal,
} from "@/lib/n8n/sanitize";
import { assertAdmin, NotAdminError } from "./auth";
import { friendlyDbError } from "./errors";
import { checkSvg } from "./svg";
import {
  CategorySchema,
  EducationSchema,
  MessageStatusSchema,
  SiteSettingsSchema,
  ProjectSchema,
  ReorderSchema,
  TypeSchema,
  toDbPayload,
  type CategoryInput,
  type EducationInput,
  type SiteSettingsInput,
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

/** A problem the admin should read as written (not a database error). */
class UserError extends Error {}

/**
 * Wraps an action: verifies the admin, runs it, refreshes the public site's
 * cache on success (unless 
efresh is false), and turns any failure into a
 * readable message.
 */
async function run<T>(
  fn: (
    supabase: Awaited<ReturnType<typeof assertAdmin>>["supabase"],
  ) => Promise<T>,
  refresh = true,
): Promise<ActionResult<T>> {
  try {
    const { supabase } = await assertAdmin();
    const data = await fn(supabase);
    if (refresh) {
      updateTag(CONTENT_TAG);
      // keep the AI knowledge base in step with what is published; runs after
      // the response, is cheap when nothing changed, and never throws
      after(async () => {
        const outcome = await reindex();
        // new galaxy positions: refresh the public pages
        if (outcome.ok && outcome.galaxyChanged > 0) {
          revalidateTag(CONTENT_TAG, "max");
        }
      });
    }
    return { ok: true, data };
  } catch (error) {
    if (error instanceof NotAdminError) {
      return { ok: false, error: "You are not signed in as the admin." };
    }
    if (error instanceof UserError) {
      return { ok: false, error: error.message };
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
  // The diagram only counts when there is a Mermaid source for it.
  const svgCheck = parsed.data.architectureMermaid
    ? checkSvg(parsed.data.architectureSvg)
    : ({ ok: true, svg: "" } as const);
  if (!svgCheck.ok) {
    return {
      ok: false,
      error: svgCheck.error,
      fieldErrors: { architectureMermaid: svgCheck.error },
    };
  }
  return run(async (supabase) => {
    const { data, error } = await supabase.rpc("save_project", {
      p: toDbPayload(parsed.data),
    });
    check(error);
    const id = data as string;
    const { error: svgError } = await supabase
      .from("projects")
      .update({ architecture_svg: svgCheck.svg || null })
      .eq("id", id);
    check(svgError);
    return { id };
  });
}

// ── n8n workflow download ──────────────────────────────────────────────

export type WorkflowPreview = {
  json: string;
  removed: Removal[];
  summary: string;
};

/**
 * Step 1: clean an uploaded workflow and show what was removed. Nothing is
 * stored: the raw file lives only in this request.
 */
export async function previewWorkflow(
  raw: string,
): Promise<ActionResult<WorkflowPreview>> {
  return run(async () => {
    const result = sanitizeWorkflow(raw);
    if (!result.ok) throw new UserError(result.error);
    return {
      json: result.json,
      removed: result.removed,
      summary: summarizeRemovals(result.removed),
    };
  }, false);
}

/**
 * Step 2 (after the admin reviewed the diff): clean again on the server
 * (the browser's copy is never trusted), store only the cleaned file.
 */
export async function saveWorkflow(
  projectId: string,
  cleaned: string,
): Promise<ActionResult<{ path: string }>> {
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) {
    return { ok: false, error: "Unknown project." };
  }
  return run(async (supabase) => {
    const result = sanitizeWorkflow(cleaned);
    if (!result.ok) throw new UserError(result.error);
    const path = `workflows/${projectId}-${Date.now()}.json`;
    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(path, new Blob([result.json], { type: "application/json" }), {
        contentType: "application/json",
        upsert: false,
      });
    check(uploadError);
    const { error } = await supabase
      .from("projects")
      .update({ workflow_json_path: path })
      .eq("id", projectId);
    check(error);
    return { path };
  });
}

export async function removeWorkflow(projectId: string): Promise<ActionResult> {
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) {
    return { ok: false, error: "Unknown project." };
  }
  return run(async (supabase) => {
    const { error } = await supabase
      .from("projects")
      .update({ workflow_json_path: null })
      .eq("id", projectId);
    check(error);
    return undefined;
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

// ── Site content (tagline, about, skills, links, resume) ──────────────

export async function saveSiteSettings(
  input: SiteSettingsInput,
): Promise<ActionResult> {
  const parsed = SiteSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Some fields need attention.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }
  const s = parsed.data;
  const socials = Object.fromEntries(
    Object.entries({
      linkedin: s.linkedin,
      github: s.github,
      email: s.email,
    }).filter(([, v]) => v),
  );
  const skills = s.skills.filter((g) => g.items.length > 0);
  // An empty value removes the key: the site falls back to its default, or
  // hides the section that needed it.
  const entries: [string, unknown, boolean][] = [
    ["hero_tagline", s.heroTagline, !!s.heroTagline],
    ["about_text", s.aboutText, !!s.aboutText],
    ["skills", skills, skills.length > 0],
    ["socials", socials, Object.keys(socials).length > 0],
    ["resume_url", s.resumeUrl, !!s.resumeUrl],
  ];
  return run(async (supabase) => {
    for (const [key, value, keep] of entries) {
      if (keep) {
        const { error } = await supabase
          .from("site_content")
          .upsert({ key, value, updated_at: new Date().toISOString() });
        check(error);
      } else {
        const { error } = await supabase
          .from("site_content")
          .delete()
          .eq("key", key);
        check(error);
      }
    }
    return undefined;
  });
}

// ── Education ─────────────────────────────────────────────────────────

export async function saveEducation(
  input: EducationInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = EducationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Some fields need attention.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }
  const e = parsed.data;
  const row = {
    qualification: e.qualification,
    institution: e.institution,
    start_label: e.start,
    end_label: e.end,
    grade: e.grade,
    description: e.description,
    photo_url: e.photoUrl || null,
    photo_alt: e.photoAlt,
    certificate_url: e.certificateUrl || null,
    certificate_alt: e.certificateAlt,
  };
  return run(async (supabase) => {
    if (e.id) {
      const { error } = await supabase
        .from("education")
        .update(row)
        .eq("id", e.id);
      check(error);
      return { id: e.id };
    }
    const { data: last } = await supabase
      .from("education")
      .select("sort")
      .order("sort", { ascending: false })
      .limit(1);
    const sort = ((last?.[0]?.sort as number | undefined) ?? -1) + 1;
    const { data, error } = await supabase
      .from("education")
      .insert({ ...row, sort })
      .select("id")
      .single();
    check(error);
    return { id: (data as { id: string }).id };
  });
}

export async function deleteEducation(id: string): Promise<ActionResult> {
  return run(async (supabase) => {
    const { error } = await supabase.from("education").delete().eq("id", id);
    check(error);
    return undefined;
  });
}

// ── Messages ──────────────────────────────────────────────────────────

export async function setMessageStatus(
  id: string,
  status: string,
): Promise<ActionResult> {
  const parsed = MessageStatusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, error: "Unknown status." };
  return run(async (supabase) => {
    const { error } = await supabase
      .from("messages")
      .update({ status: parsed.data })
      .eq("id", id);
    check(error);
    return undefined;
  }, false);
}

export async function deleteMessage(id: string): Promise<ActionResult> {
  return run(async (supabase) => {
    const { error } = await supabase.from("messages").delete().eq("id", id);
    check(error);
    return undefined;
  }, false);
}

// ── Knowledge base ────────────────────────────────────────────────────

export type ReindexSummary = {
  sources: number;
  chunks: number;
  added: number;
  kept: number;
  removed: number;
};

/** Re-embeds the published content. `force` throws every chunk away first. */
export async function reindexEverything(
  force: boolean,
): Promise<ActionResult<ReindexSummary>> {
  return run(async () => {
    const outcome = await reindex({ force });
    if (!outcome.ok) throw new UserError(outcome.message);
    if (outcome.galaxyChanged > 0) updateTag(CONTENT_TAG);
    return outcome.result;
  }, false);
}
