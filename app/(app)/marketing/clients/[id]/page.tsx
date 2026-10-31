import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { PageShell } from "@/components/layout/page-header"
import { FormOptionsBoundary } from "@/components/shared/form-options-boundary"
import { ClientDetail } from "@/components/marketing/client-detail"
import { listClaims } from "@/lib/server/claims"
import { getClientById } from "@/lib/server/clients"
import { listPlacingSlips } from "@/lib/server/placing-slips"
import { listPolicies } from "@/lib/server/policies"
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
  const client = await getClientById(id)

  // Tautan lama memakai id data contoh (c-005). Arahkan ke UUID database
  // supaya seluruh halaman, termasuk tabel SPPA yang menyaring per klien,
  // memakai id yang sama dengan data di database.
  if (client && client.id !== id) {
    redirect(`/marketing/clients/${client.id}`)
  }

  // SPPA, slip, polis, dan klaim diambil dari database untuk klien ini saja,
  // bukan disaring dari store sesi yang berisi data contoh.
  const [initialSppa, slips, policies, claims, vehicleOptions] =
    await Promise.all([
      client ? listSppa({ clientId: client.id }) : [],
      client ? listPlacingSlips({ clientId: client.id }) : [],
      client ? listPolicies({ clientId: client.id }) : [],
      client ? listClaims({ clientId: client.id }) : [],
      listVehicleOptions(),
    ])

  return (
    <PageShell>
      <FormOptionsBoundary>
        <ClientDetail
          initialClient={client}
          initialSppa={initialSppa}
          slips={slips}
          policies={policies}
          claims={claims}
          vehicleOptions={vehicleOptions}
        />
      </FormOptionsBoundary>
    </PageShell>
  )
}
