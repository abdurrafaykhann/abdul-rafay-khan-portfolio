import type { Metadata } from "next";
import { DevPlayground } from "@/components/dev/DevPlayground";

// The ".dev.tsx" extension is only registered as a page extension in
// development (see next.config.ts), so this route does not exist in
// production builds.
export const metadata: Metadata = {
  title: "Dev playground",
  robots: { index: false, follow: false },
};

export default function DevPlaygroundPage() {
  return <DevPlayground />;
}
