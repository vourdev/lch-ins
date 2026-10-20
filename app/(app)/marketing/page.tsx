import type { Metadata } from "next"

import { PageShell } from "@/components/layout/page-header"
import { MarketingTabs } from "@/components/marketing/marketing-tabs"
import { listClients } from "@/lib/server/clients"
import { requireAccess } from "@/lib/server/session"

export const metadata: Metadata = { title: "Marketing — LCH Insurance Brokers" }

export default async function MarketingPage() {
  await requireAccess("/marketing")
  const initialClients = await listClients()

  return (
    <PageShell>
      <MarketingTabs initialClients={initialClients} />
    </PageShell>
  )
}
