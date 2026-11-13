import { CategoriesManager } from "@/components/admin/CategoriesManager";
import { adminLists } from "@/lib/admin/data";

export default async function CategoriesPage() {
  const { categories, projects } = await adminLists();
  const usage: Record<string, number> = {};
  for (const p of projects) {
    for (const id of new Set(
      [...p.categoryIds, p.primaryCategoryId].filter(Boolean) as string[],
    )) {
      usage[id] = (usage[id] ?? 0) + 1;
    }
  }
  return (
    <CategoriesManager
      key={categories.map((c) => `${c.id}:${c.sort}:${c.name}`).join("|")}
      categories={categories}
      usage={usage}
    />
  );
}
