import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { SppaKycDocument } from "@/components/documents/sppa-documents"
import { todayIso } from "@/lib/date"
import { getClientById } from "@/lib/server/clients"
import { getSppaById } from "@/lib/server/sppa"

export const metadata: Metadata = {
  title: "SPPA & KYC — LCH Insurance Brokers",
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const sppa = await getSppaById(id)
  if (!sppa) notFound()
  // sppaInclude hanya memuat nama klien, data KYC dan alamat diambil terpisah.
  const client = await getClientById(sppa.clientId)

  return (
    <SppaKycDocument
      sppa={sppa}
      client={client}
      clientName={client?.name ?? sppa.clientName ?? sppa.insuredName}
      today={todayIso()}
    />
  )
}
