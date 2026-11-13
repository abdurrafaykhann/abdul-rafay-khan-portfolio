import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapCategory,
  mapEducation,
  mapProject,
  mapProjectType,
  mapSiteSettings,
} from "./map";
import type { SiteContent } from "./types";

// NOTE: relative imports only — this file is also run by scripts/snapshot.ts.

/**
 * Every projects column the site reads. The raw `client_name` is deliberately
 * absent: the public role has no permission to read it, and the site only
 * ever shows `client_display_name` (null when the name is hidden).
 */
const PROJECT_COLUMNS = [
  "id",
  "slug",
  "title",
  "type_id",
  "primary_category_id",
  "status",
  "show_status_badge",
  "published",
  "short_desc",
  "case_study_md",
  "tech",
  "links",
  "started_on",
  "ended_on",
  "sort",
  "is_key",
  "key_sort",
  "show_in_marquee",
  "marquee_sort",
  "img_left_top",
  "img_left_bottom",
  "img_right",
  "marquee_poster",
  "marquee_clip",
  "architecture_svg",
  "client_display_name",
  "industry",
  "my_role",
  "testimonial",
  "automation_trigger",
  "apps",
  "workflow_screenshot",
  "savings_text",
  "workflow_json_path",
  "product_name",
  "product_logo",
  "value_prop",
  "product_url",
  "signup_url",
  "stage",
  "pricing_model",
  "starting_price",
  "demo_video",
  "features",
  "galaxy_x",
  "galaxy_y",
  "galaxy_z",
].join(", ");

const PROJECT_SELECT = `${PROJECT_COLUMNS},
  project_categories(category_id),
  project_metrics(label, value, highlight, sort),
  traction_metrics(label, value, as_of, show_public, sort),
  changelog_entries(entry_date, note),
  trained_vs_integrated(component, kind, source_model, evaluation, sort),
  project_media(kind, media_type, url, poster, alt, sort)`;

type Row = Record<string, unknown>;

async function all(
  query: PromiseLike<{ data: unknown; error: { message: string } | null }>,
  what: string,
): Promise<Row[]> {
  const { data, error } = await query;
  if (error) throw new Error(`Loading ${what} failed: ${error.message}`);
  return (data ?? []) as Row[];
}

/**
 * Loads everything the public site shows, in five queries.
 * With the anon key, Row Level Security already limits this to published
 * content; `includeDrafts` is only for the admin's draft preview (service key).
 */
export async function fetchContent(
  client: SupabaseClient,
  { includeDrafts = false }: { includeDrafts?: boolean } = {},
): Promise<SiteContent> {
  let projectsQuery = client
    .from("projects")
    .select(PROJECT_SELECT)
    .order("sort", { ascending: true });
  if (!includeDrafts) projectsQuery = projectsQuery.eq("published", true);

  const [categories, types, projects, site, education] = await Promise.all([
    all(client.from("categories").select("*").order("sort"), "categories"),
    all(
      client.from("project_types").select("*").order("sort"),
      "project types",
    ),
    all(projectsQuery, "projects"),
    all(client.from("site_content").select("key, value"), "site content"),
    all(client.from("education").select("*").order("sort"), "education"),
  ]);

  const content: SiteContent = {
    categories: categories.map(mapCategory),
    types: types.map(mapProjectType),
    projects: projects.map(mapProject),
    site: mapSiteSettings(site),
    education: education.map(mapEducation),
  };

  if (!includeDrafts) {
    // belt and braces: RLS already hides these rows from the public role
    content.projects = content.projects
      .filter((p) => p.published)
      .map((p) => ({ ...p, traction: p.traction.filter((t) => t.showPublic) }));
  }
  return content;
}
