import type { Metadata } from "next"

import { PageShell } from "@/components/layout/page-header"
import { FormOptionsBoundary } from "@/components/shared/form-options-boundary"
import { ClientDetail } from "@/components/marketing/client-detail"
import { getClientById } from "@/lib/server/clients"
import { listSppa } from "@/lib/server/sppa"
import { listVehicleOptions } from "@/lib/server/vehicles"
import { requireAccess } from "@/lib/server/session"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const client = await getClientById(id)
  return {
    title: `${client?.name ?? "Detail Klien"} — LCH Insurance Brokers`,
  }
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAccess("/marketing")
  const { id } = await params
  const [client, initialSppa, vehicleOptions] = await Promise.all([
    getClientById(id),
    listSppa({ clientId: id }),
    listVehicleOptions(),
  ])

  return (
    <PageShell>
      <FormOptionsBoundary>
        <ClientDetail
          id={id}
          initialClient={client}
          initialSppa={initialSppa}
          vehicleOptions={vehicleOptions}
        />
      </FormOptionsBoundary>
    </PageShell>
  )
}
