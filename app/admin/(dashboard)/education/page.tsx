import { EducationManager } from "@/components/admin/EducationManager";
import { adminSite } from "@/lib/admin/data";

export default async function EducationPage() {
  const { education } = await adminSite();
  return (
    <EducationManager
      key={education.map((e) => `${e.id}:${e.qualification}`).join("|")}
      entries={education.map((e) => ({
        id: e.id,
        qualification: e.qualification ?? "",
        institution: e.institution ?? "",
        start: e.start ?? "",
        end: e.end ?? "",
        grade: e.grade ?? "",
        description: e.description ?? "",
        photoUrl: e.photoUrl ?? "",
        photoAlt: e.photoAlt ?? "",
        certificateUrl: e.certificateUrl ?? "",
        certificateAlt: e.certificateAlt ?? "",
      }))}
    />
  );
}
