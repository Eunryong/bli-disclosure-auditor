import { listAuditCases } from "@/lib/audit-service";
import { AuditsLedgerView } from "@/components/AuditsLedgerView";

export const dynamic = "force-dynamic";

export default async function AuditsListPage() {
  const audits = await listAuditCases();
  return <AuditsLedgerView audits={audits} />;
}
