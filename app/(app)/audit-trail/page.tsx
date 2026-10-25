import type { Metadata } from "next"

import { parseAuditFilter } from "@/components/audit/audit-filter"
import { AuditTable } from "@/components/audit/audit-table"
import { PageHeader, PageShell } from "@/components/layout/page-header"
import {
  listAuditEntities,
  listAuditLogs,
  listAuditUsers,
} from "@/lib/server/audit"
import { requireAdmin } from "@/lib/server/session"

export const metadata: Metadata = { title: "Audit Trail — LCH Insurance Brokers" }

export default async function AuditTrailPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  await requireAdmin("/audit-trail")

  const filter = parseAuditFilter(await searchParams)

  // Filtering and paging run in the database; loading a fixed slice hid older and other users' logs.
  const [result, entities, users] = await Promise.all([
    listAuditLogs(filter),
    listAuditEntities(),
    listAuditUsers(),
  ])

  return (
    <PageShell>
      <PageHeader
        title="Audit Trail"
        description="Catatan riwayat aktivitas siapa mengubah apa dan kapan di seluruh sistem LCH"
      />
      <AuditTable
        result={result}
        filter={filter}
        availableEntities={entities}
        users={users}
      />
    </PageShell>
  )
}
