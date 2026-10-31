import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { FormOptionsBoundary } from "@/components/shared/form-options-boundary"
import { NewSlip } from "@/components/underwriting/new-slip"
import { canManage } from "@/lib/access"
import { getClientById } from "@/lib/server/clients"
import { currentUser } from "@/lib/server/session"
import { getSppaById } from "@/lib/server/sppa"
import { listVehicleOptions } from "@/lib/server/vehicles"

export const metadata: Metadata = {
  title: "Buat Placing Slip — LCH Insurance Brokers",
}

export default async function NewSlipPage({
  searchParams,
}: {
  searchParams: Promise<{ sppa?: string; client?: string }>
}) {
  const user = await currentUser()
  if (!user || !canManage(user.roles, "/underwriting")) {
    redirect("/underwriting")
  }

  const { sppa, client } = await searchParams

  const [initialSppa, initialClient, vehicleOptions] = await Promise.all([
    sppa ? getSppaById(sppa) : null,
    client ? getClientById(client) : null,
    listVehicleOptions(),
  ])

  let resolvedClient = initialClient
  if (initialSppa && !resolvedClient && initialSppa.clientId) {
    resolvedClient = await getClientById(initialSppa.clientId)
  }

  return (
    <FormOptionsBoundary>
      <NewSlip
        sppaId={sppa}
        clientId={client}
        initialSppa={initialSppa ?? undefined}
        initialClient={resolvedClient ?? undefined}
        vehicleOptions={vehicleOptions}
      />
    </FormOptionsBoundary>
  )
}
