import type { Metadata } from "next"

import { PageShell } from "@/components/layout/page-header"
import { MarketingTabs } from "@/components/marketing/marketing-tabs"
import { todayIso } from "@/lib/date"
import { parseRenewalCob, parseRenewalPeriod } from "@/lib/renewal"
import { listClients } from "@/lib/server/clients"
import { listRenewalPolicies } from "@/lib/server/policies"
import { listSppa } from "@/lib/server/sppa"
import { listVehicleOptions } from "@/lib/server/vehicles"
import { requireAccess } from "@/lib/server/session"

export const metadata: Metadata = { title: "Marketing — LCH Insurance Brokers" }

const TABS = ["clients", "sppa", "renewal"] as const

export default async function MarketingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; days?: string; cob?: string }>
}) {
  await requireAccess("/marketing")
  const params = await searchParams
  const [initialClients, initialSppa, initialPolicies, vehicleOptions] =
    await Promise.all([
      listClients(),
      listSppa(),
      listRenewalPolicies(todayIso()),
      listVehicleOptions(),
    ])

  return (
    <PageShell>
      <MarketingTabs
        initialClients={initialClients}
        initialSppa={initialSppa}
        initialPolicies={initialPolicies}
        vehicleOptions={vehicleOptions}
        initialTab={TABS.find((t) => t === params.tab) ?? "clients"}
        renewalPeriod={parseRenewalPeriod(params.days)}
        renewalCob={parseRenewalCob(params.cob)}
      />
    </PageShell>
  )
}
