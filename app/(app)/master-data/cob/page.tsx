import type { Metadata } from "next"

import { PageHeader, PageShell } from "@/components/layout/page-header"
import { CobCoverTab } from "@/components/master-data/cob-cover-tab"
import { listMasterCob } from "@/lib/server/master-data"
import { requireAccess } from "@/lib/server/session"

export const metadata: Metadata = {
  title: "COB & Cover Type — LCH Insurance Brokers",
}

export default async function MasterDataCobPage() {
  await requireAccess("/master-data")

  const initialCobs = await listMasterCob()

  return (
    <PageShell>
      <PageHeader
        title="COB & Cover Type"
        description="Class of business beserta type of cover yang dipakai di SPPA, placing slip, dan polis."
      />
      <CobCoverTab initialCobs={initialCobs} />
    </PageShell>
  )
}
