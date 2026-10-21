import type { Metadata } from "next"

import { NewSlip } from "@/components/underwriting/new-slip"
import { getClientById } from "@/lib/server/clients"
import { getSppaById } from "@/lib/server/sppa"

export const metadata: Metadata = {
  title: "Buat Placing Slip — LCH Insurance Brokers",
}

export default async function NewSlipPage({
  searchParams,
}: {
  searchParams: Promise<{ sppa?: string; client?: string }>
}) {
  const { sppa, client } = await searchParams

  const [initialSppa, initialClient] = await Promise.all([
    sppa ? getSppaById(sppa) : null,
    client ? getClientById(client) : null,
  ])

  let resolvedClient = initialClient
  if (initialSppa && !resolvedClient && initialSppa.clientId) {
    resolvedClient = await getClientById(initialSppa.clientId)
  }

  return (
    <NewSlip
      sppaId={sppa}
      clientId={client}
      initialSppa={initialSppa ?? undefined}
      initialClient={resolvedClient ?? undefined}
    />
  )
}
