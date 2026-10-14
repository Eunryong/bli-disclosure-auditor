import { notFound } from "next/navigation";
import { getAuditCaseById } from "@/lib/audit-service";
import { AuditStepHeader } from "@/components/AuditStepHeader";
import { ReviewWorkspace } from "@/components/ReviewWorkspace";

export const dynamic = "force-dynamic";

export default async function AuditReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const audit = await getAuditCaseById(id);

  if (!audit) {
    notFound();
  }

  return (
    <div>
      <AuditStepHeader audit={audit} />
      <ReviewWorkspace initialAudit={audit} />
    </div>
  );
}
