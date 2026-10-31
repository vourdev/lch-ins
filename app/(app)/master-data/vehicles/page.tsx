import type { Metadata } from "next"

import { PageHeader, PageShell } from "@/components/layout/page-header"
import { VehiclesTab } from "@/components/master-data/vehicles-tab"
import { listVehicleBrandsMaster } from "@/lib/server/vehicles"
import { requireAccess } from "@/lib/server/session"

export const metadata: Metadata = {
  title: "Kendaraan — LCH Insurance Brokers",
}

export default async function MasterDataVehiclesPage() {
  await requireAccess("/master-data")

  const initialVehicleBrands = await listVehicleBrandsMaster()

  return (
    <PageShell>
      <PageHeader
        title="Kendaraan"
        description="Merek dan tipe kendaraan untuk SPPA dan placing slip kendaraan bermotor."
      />
      <VehiclesTab initialBrands={initialVehicleBrands} />
    </PageShell>
  )
}
