import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { RenewalLetterDocument } from "@/components/documents/renewal-documents"
import { todayIso } from "@/lib/date"
import {
  parseRenewalCob,
  parseRenewalPeriod,
  renewalBackHref,
} from "@/lib/renewal"
import { getClientById } from "@/lib/server/clients"
import { getPolicyById } from "@/lib/server/policies"

export const metadata: Metadata = {
  title: "Surat Pemberitahuan Perpanjangan — LCH Insurance Brokers",
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ days?: string; cob?: string }>
}) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  const policy = await getPolicyById(id)
  if (!policy) notFound()
  const client = policy.clientId ? await getClientById(policy.clientId) : null

  return (
    <RenewalLetterDocument
      policy={policy}
      client={client}
      today={todayIso()}
      backHref={renewalBackHref(
        parseRenewalPeriod(query.days),
        parseRenewalCob(query.cob)
      )}
    />
  )
}
