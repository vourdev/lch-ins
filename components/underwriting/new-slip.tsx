"use client"

import * as React from "react"

import { PlacingSlipForm } from "@/components/underwriting/placing-slip-form"
import {
  emptySlip,
  slipForClient,
  slipFromSppa,
} from "@/components/underwriting/slip-model"
import type { ClientRecord } from "@/lib/server/clients"
import type { SppaRecord } from "@/lib/server/sppa"
import type { VehicleBrandOption } from "@/lib/data"
import { store } from "@/lib/store"

/**
 * Slip baru, bisa terisi dari SPPA (`?sppa=`) atau dari halaman klien
 * (`?client=`). Data dibaca dari store sesi supaya SPPA atau klien yang baru
 * dibuat juga bisa dipakai.
 */
export function NewSlip({
  sppaId,
  clientId,
  initialSppa,
  initialClient,
  vehicleOptions,
}: {
  sppaId?: string
  clientId?: string
  initialSppa?: SppaRecord
  initialClient?: ClientRecord
  vehicleOptions?: VehicleBrandOption[]
}) {
  React.useEffect(() => {
    if (initialSppa) store.upsert("sppa", initialSppa)
    if (initialClient) store.upsert("clients", initialClient)
  }, [initialSppa, initialClient])

  const [initial] = React.useState(() => {
    const sppa =
      (sppaId ? store.get("sppa", sppaId) : null) ?? initialSppa ?? null
    if (sppa) {
      const client =
        store.get("clients", sppa.clientId) ?? initialClient ?? null
      return slipFromSppa(sppa, client)
    }
    const client =
      (clientId ? store.get("clients", clientId) : null) ??
      initialClient ??
      null
    return client ? slipForClient(client) : emptySlip()
  })
  return <PlacingSlipForm initial={initial} mode="new" vehicleOptions={vehicleOptions} />
}
