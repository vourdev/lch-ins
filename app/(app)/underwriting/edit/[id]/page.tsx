import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { FormOptionsBoundary } from "@/components/shared/form-options-boundary"
import { PlacingSlipForm } from "@/components/underwriting/placing-slip-form"
import { canManage } from "@/lib/access"
import { currentUser } from "@/lib/server/session"
import { getPlacingSlipById } from "@/lib/server/placing-slips"
import { listVehicleOptions } from "@/lib/server/vehicles"
import { slipById } from "@/lib/data"

export const metadata: Metadata = {
  title: "Edit Placing Slip — LCH Insurance Brokers",
}

export default async function EditSlipPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await currentUser()
  if (!user || !canManage(user.roles, "/underwriting")) {
    redirect("/underwriting")
  }

  const { id } = await params
  const [slip, vehicleOptions] = await Promise.all([
    getPlacingSlipById(id).then((s) => s ?? slipById(id) ?? null),
    listVehicleOptions(),
  ])

  return (
    <FormOptionsBoundary>
      <PlacingSlipForm
        id={id}
        initial={slip}
        mode="edit"
        vehicleOptions={vehicleOptions}
      />
    </FormOptionsBoundary>
  )
}
