import { TypesManager } from "@/components/admin/TypesManager";
import { adminLists } from "@/lib/admin/data";

export default async function TypesPage() {
  const { types, projects } = await adminLists();
  const usage: Record<string, number> = {};
  for (const p of projects)
    if (p.typeId) usage[p.typeId] = (usage[p.typeId] ?? 0) + 1;
  return (
    <TypesManager
      key={types.map((t) => `${t.id}:${t.sort}:${t.name}`).join("|")}
      types={types}
      usage={usage}
    />
  );
}
