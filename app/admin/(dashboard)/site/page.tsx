import { SiteContentForm } from "@/components/admin/SiteContentForm";
import { adminSite } from "@/lib/admin/data";

export default async function SitePage() {
  const { settings } = await adminSite();
  return <SiteContentForm initial={settings} />;
}
