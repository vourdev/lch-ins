import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { FormOptionsBoundary } from "@/components/shared/form-options-boundary"
import { QuotationDraftForm } from "@/components/underwriting/quotation-draft-form"
import { canManage } from "@/lib/access"
import { currentUser } from "@/lib/server/session"
import { getPlacingSlipById } from "@/lib/server/placing-slips"
import { slipById } from "@/lib/data"

export const metadata: Metadata = {
  title: "Quotation Slip — LCH Insurance Brokers",
}

export default async function QuotationDraftPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await currentUser()
  if (!user || !canManage(user.roles, "/underwriting")) {
    redirect("/underwriting")
  }

  const { id } = await params
  const slip = (await getPlacingSlipById(id)) ?? slipById(id) ?? null
  return (
    <FormOptionsBoundary>
      <QuotationDraftForm id={id} initial={slip} />
    </FormOptionsBoundary>
  )
}
