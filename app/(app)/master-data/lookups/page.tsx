import type { Metadata } from "next"

import { PageHeader, PageShell } from "@/components/layout/page-header"
import { LookupValuesTab } from "@/components/master-data/lookup-values-tab"
import {
  listDistinctLookupTypes,
  listLookupValues,
} from "@/lib/server/master-data"
import { requireAccess } from "@/lib/server/session"

export const metadata: Metadata = {
  title: "Nilai Pilihan Dropdown — LCH Insurance Brokers",
}

export default async function MasterDataLookupsPage() {
  await requireAccess("/master-data")

  const [initialLookups, availableLookupTypes] = await Promise.all([
    listLookupValues(),
    listDistinctLookupTypes(),
  ])

  return (
    <PageShell>
      <PageHeader
        title="Nilai Pilihan Dropdown"
        description="Pilihan pendek untuk dropdown di seluruh form. Entri sistem bisa diubah labelnya, tapi tidak bisa dihapus."
      />
      <LookupValuesTab
        initialLookups={initialLookups}
        availableTypes={availableLookupTypes}
      />
    </PageShell>
  )
}
