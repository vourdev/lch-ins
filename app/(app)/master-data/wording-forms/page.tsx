import type { Metadata } from "next"

import { PageHeader, PageShell } from "@/components/layout/page-header"
import { WordingFormsTab } from "@/components/master-data/wording-forms-tab"
import { listWordingForms } from "@/lib/server/master-data"
import { requireAccess } from "@/lib/server/session"

export const metadata: Metadata = {
  title: "Wording Form — LCH Insurance Brokers",
}

export default async function MasterDataWordingFormsPage() {
  await requireAccess("/master-data")

  const initialWordingForms = await listWordingForms()

  return (
    <PageShell>
      <PageHeader
        title="Wording Form"
        description="Wording form polis baku yang bisa dipilih di placing slip."
      />
      <WordingFormsTab initialWordingForms={initialWordingForms} />
    </PageShell>
  )
}
