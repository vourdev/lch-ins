import type { Metadata } from "next"

import { RenewalListDocument } from "@/components/documents/renewal-documents"
import { todayIso } from "@/lib/date"
import {
  parseRenewalCob,
  parseRenewalPeriod,
  renewalCandidates,
} from "@/lib/renewal"
import { listRenewalPolicies } from "@/lib/server/policies"

export const metadata: Metadata = {
  title: "Daftar Renewal Notice — LCH Insurance Brokers",
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; cob?: string }>
}) {
  const params = await searchParams
  const days = parseRenewalPeriod(params.days)
  const cob = parseRenewalCob(params.cob)
  const today = todayIso()
  const rows = renewalCandidates(
    await listRenewalPolicies(today),
    today,
    Number(days),
    cob
  )

  return <RenewalListDocument rows={rows} today={today} days={days} cob={cob} />
}
