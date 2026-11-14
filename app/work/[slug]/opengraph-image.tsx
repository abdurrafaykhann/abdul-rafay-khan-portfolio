import { ImageResponse } from "next/og";
import { getContent } from "@/lib/data/content";
import {
  cardBadges,
  findProject,
  primaryCategory,
  projectType,
} from "@/lib/data/select";
import { site } from "@/lib/site";

export const alt = "Project preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Link preview for each project: dark card, gradient title, category and a result. */
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { content } = await getContent();
  const p = findProject(content, slug);
  const title = p?.title ?? site.name;
  const category = p ? primaryCategory(p, content.categories) : null;
  const type = p ? projectType(p, content.types) : null;
  const badge = p ? cardBadges(p)[0] : undefined;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background:
          "radial-gradient(circle at 85% 10%, #3a0a52 0%, #0C0C0C 55%)",
        color: "#D7E2EA",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 28,
          letterSpacing: 6,
          textTransform: "uppercase",
          opacity: 0.8,
        }}
      >
        {[type?.name, category?.name].filter(Boolean).join("  ·  ") ||
          site.title}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: title.length > 24 ? 92 : 120,
          fontWeight: 900,
          lineHeight: 1,
          textTransform: "uppercase",
          letterSpacing: -2,
          color: "#BBCCD7",
        }}
      >
        {title}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 30,
        }}
      >
        <div style={{ display: "flex" }}>{site.name}</div>
        {badge && (
          <div
            style={{
              display: "flex",
              padding: "12px 28px",
              borderRadius: 999,
              background:
                "linear-gradient(123deg, #18011F 7%, #B600A8 37%, #7621B0 72%, #BE4C00 100%)",
              color: "#fff",
            }}
          >
            {badge.value} {badge.label}
          </div>
        )}
      </div>
    </div>,
    size,
  );
}
