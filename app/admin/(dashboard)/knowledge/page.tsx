import { KnowledgePanel } from "@/components/admin/KnowledgePanel";
import { requireAdmin } from "@/lib/admin/auth";
import { knowledgeStatus } from "@/lib/rag/server";

export default async function KnowledgePage() {
  await requireAdmin();
  const status = await knowledgeStatus().catch(() => ({
    databaseReady: false,
    embeddingKeyReady: false,
    total: 0,
    bySource: [],
    lastIndexed: null,
  }));
  return <KnowledgePanel status={status} />;
}
