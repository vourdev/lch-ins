import type { Metadata } from "next"

import { PageHeader, PageShell } from "@/components/layout/page-header"
import { InsurersAdjustersTab } from "@/components/master-data/insurers-adjusters-tab"
import { listAdjusters, listInsurers } from "@/lib/server/master-data"
import { requireAccess } from "@/lib/server/session"

export const metadata: Metadata = {
  title: "Asuransi & Adjuster — LCH Insurance Brokers",
}

export default async function MasterDataPartnersPage() {
  await requireAccess("/master-data")

  const [initialInsurers, initialAdjusters] = await Promise.all([
    listInsurers(),
    listAdjusters(),
  ])

  return (
    <PageShell>
      <PageHeader
        title="Asuransi & Adjuster"
        description="Perusahaan asuransi rekanan dan loss adjuster."
      />
      <InsurersAdjustersTab
        initialInsurers={initialInsurers}
        initialAdjusters={initialAdjusters}
      />
    </PageShell>
  )
}
