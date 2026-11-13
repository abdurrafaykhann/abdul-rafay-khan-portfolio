import type { Metadata } from "next";
import { AdminPreview } from "@/components/dev/AdminPreview";

// DEV-ONLY (".dev.tsx" pages exist only in development): the real admin
// screens rendered with fixture data, without signing in. Saving is
// impossible here: every Server Action still checks for the admin and
// answers "You are not signed in as the admin."
export const metadata: Metadata = {
  title: "Admin preview (dev)",
  robots: { index: false, follow: false },
};

export default function AdminPreviewPage() {
  return <AdminPreview />;
}
