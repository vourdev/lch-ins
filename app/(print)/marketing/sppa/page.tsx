import type { Metadata } from "next"

import { SppaExcelDocument } from "@/components/documents/sppa-documents"
import { todayIso } from "@/lib/date"
import { listSppa } from "@/lib/server/sppa"

export const metadata: Metadata = {
  title: "Daftar SPPA — LCH Insurance Brokers",
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    status?: string
    cob?: string
    clientId?: string
  }>
}) {
  const params = await searchParams
  const today = todayIso()
  const rows = await listSppa({
    search: params.q,
    status: params.status,
    cob: params.cob,
    clientId: params.clientId,
  })

  return (
    <SppaExcelDocument
      rows={rows}
      today={today}
      query={params.q}
      backHref="/marketing?tab=sppa"
    />
  )
}
