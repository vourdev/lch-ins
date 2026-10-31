import type { Metadata } from "next"

import { PageHeader, PageShell } from "@/components/layout/page-header"
import { CobOjkClassesTab } from "@/components/master-data/cob-ojk-classes-tab"
import { listCobOjkClasses } from "@/lib/server/cob-ojk-classes"
import { requireAccess } from "@/lib/server/session"

export const metadata: Metadata = {
  title: "Klasifikasi OJK — LCH Insurance Brokers",
}

export default async function MasterDataOjkClassesPage() {
  await requireAccess("/master-data")

  const initialCobOjkClasses = await listCobOjkClasses()

  return (
    <PageShell>
      <PageHeader
        title="Klasifikasi OJK"
        description="Klasifikasi lini usaha menurut OJK untuk pengelompokan laporan produksi dan polis."
      />
      <CobOjkClassesTab initialCobOjkClasses={initialCobOjkClasses} />
    </PageShell>
  )
}
