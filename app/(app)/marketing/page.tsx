import type { Metadata } from "next"

import { PageShell } from "@/components/layout/page-header"
import { MarketingTabs } from "@/components/marketing/marketing-tabs"
import { listClients } from "@/lib/server/clients"
import { listSppa } from "@/lib/server/sppa"
import { requireAccess } from "@/lib/server/session"

export const metadata: Metadata = { title: "Marketing — LCH Insurance Brokers" }

export default async function MarketingPage() {
  await requireAccess("/marketing")
  const [initialClients, initialSppa] = await Promise.all([
    listClients(),
    listSppa(),
  ])

  return (
    <PageShell>
      <MarketingTabs
        initialClients={initialClients}
        initialSppa={initialSppa}
      />
    </PageShell>
  )
}
