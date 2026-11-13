import { ProjectsList } from "@/components/admin/ProjectsList";
import { adminLists } from "@/lib/admin/data";

export default async function ProjectsPage() {
  const { projects, categories, types } = await adminLists();
  return (
    <ProjectsList
      // remount after router.refresh() so new server data replaces local state
      key={projects
        .map((p) => `${p.id}:${p.sort}:${p.published}:${p.isKey}`)
        .join("|")}
      projects={projects}
      categories={categories}
      types={types}
    />
  );
}
