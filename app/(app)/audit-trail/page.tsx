import type { Metadata } from "next"

import { AuditTable } from "@/components/audit/audit-table"
import { PageHeader, PageShell } from "@/components/layout/page-header"
import { listAuditEntities, listAuditLogs } from "@/lib/server/audit"
import { requireAdmin } from "@/lib/server/session"

export const metadata: Metadata = { title: "Audit Trail — LCH Insurance Brokers" }

export default async function AuditTrailPage() {
  await requireAdmin("/audit-trail")

  const [logsResult, entities] = await Promise.all([
    listAuditLogs({ pageSize: 100 }),
    listAuditEntities(),
  ])

  return (
    <PageShell>
      <PageHeader
        title="Audit Trail"
        description="Catatan riwayat aktivitas siapa mengubah apa dan kapan di seluruh sistem LCH"
      />
      <AuditTable
        initialLogs={logsResult.items}
        availableEntities={entities}
      />
    </PageShell>
  )
}
