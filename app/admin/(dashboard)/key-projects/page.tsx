import { KeyProjectsList } from "@/components/admin/KeyProjectsList";
import { adminLists } from "@/lib/admin/data";

export default async function KeyProjectsPage() {
  const { projects } = await adminLists();
  const keys = projects
    .filter((p) => p.isKey)
    .sort((a, b) => a.keySort - b.keySort);
  return (
    <KeyProjectsList key={keys.map((p) => p.id).join("|")} projects={keys} />
  );
}
