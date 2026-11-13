import { site } from "@/lib/site";

// M0: themed shell only. Sections arrive from M1 onwards.
export default function HomePage() {
  return (
    <main
      id="main"
      className="bg-ink min-h-screen"
      style={{ overflowX: "clip" }}
    >
      <h1 className="sr-only">{site.title}</h1>
    </main>
  );
}
