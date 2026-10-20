import type { Metadata } from "next"

import { PageShell } from "@/components/layout/page-header"
import { ClientDetail } from "@/components/marketing/client-detail"
import { getClientById } from "@/lib/server/clients"
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

  return (
    <PageShell>
      <ClientDetail id={id} initialClient={client} />
    </PageShell>
  )
}
