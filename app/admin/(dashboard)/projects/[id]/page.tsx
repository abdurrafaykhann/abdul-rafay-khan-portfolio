import { notFound } from "next/navigation";
import { ProjectEditor } from "@/components/admin/ProjectEditor";
import { adminLists, adminProject, projectToInput } from "@/lib/admin/data";
import type { ProjectData } from "@/lib/admin/schema";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [project, { categories, types }] = await Promise.all([
    adminProject(id),
    adminLists(),
  ]);
  if (!project) notFound();
  return (
    <ProjectEditor
      key={project.id}
      initial={projectToInput(project) as ProjectData}
      categories={categories}
      types={types}
    />
  );
}
