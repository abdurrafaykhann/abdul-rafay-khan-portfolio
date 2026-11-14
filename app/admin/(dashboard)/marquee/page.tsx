import {
  MarqueeManager,
  type MarqueeProject,
} from "@/components/admin/MarqueeManager";
import { adminLists } from "@/lib/admin/data";

export default async function MarqueePage() {
  const { projects } = await adminLists();
  const toRow = (p: (typeof projects)[number]): MarqueeProject => ({
    id: p.id,
    title: p.title,
    published: p.published,
    hasMedia: !!(p.marqueeClip || p.marqueePoster),
  });
  const inMarquee = projects
    .filter((p) => p.showInMarquee)
    .sort((a, b) => a.marqueeSort - b.marqueeSort)
    .map(toRow);
  const others = projects.filter((p) => !p.showInMarquee).map(toRow);
  return (
    <MarqueeManager
      key={inMarquee.map((p) => p.id).join("|") + "/" + others.length}
      inMarquee={inMarquee}
      others={others}
    />
  );
}
