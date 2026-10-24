import type { Metadata } from "next"

import { PlacingSlipForm } from "@/components/underwriting/placing-slip-form"
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
  const { id } = await params
  const [slip, vehicleOptions] = await Promise.all([
    getPlacingSlipById(id).then((s) => s ?? slipById(id) ?? null),
    listVehicleOptions(),
  ])

  return (
    <PlacingSlipForm
      id={id}
      initial={slip}
      mode="edit"
      vehicleOptions={vehicleOptions}
    />
  )
}
