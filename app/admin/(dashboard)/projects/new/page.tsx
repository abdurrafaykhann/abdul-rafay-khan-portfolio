import { ProjectEditor } from "@/components/admin/ProjectEditor";
import { adminLists } from "@/lib/admin/data";

export default async function NewProjectPage() {
  const { categories, types } = await adminLists();
  return <ProjectEditor initial={null} categories={categories} types={types} />;
}
