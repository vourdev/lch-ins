import type { Metadata } from "next"

import { PageHeader, PageShell } from "@/components/layout/page-header"
import { MasterDataTabs } from "@/components/master-data/master-data-tabs"
import { listCobOjkClasses } from "@/lib/server/cob-ojk-classes"
import { listVehicleBrandsMaster } from "@/lib/server/vehicles"
import {
  listAdjusters,
  listBankAccounts,
  listBiScales,
  listCurrencies,
  listDistinctLookupTypes,
  listInsurers,
  listLookupValues,
  listMasterCob,
  listOccupations,
  listTariffEqProperty,
  listTariffFlood,
  listWordingForms,
} from "@/lib/server/master-data"
import { requireAccess } from "@/lib/server/session"

export const metadata: Metadata = { title: "Master Data — LCH Insurance Brokers" }

export default async function MasterDataPage() {
  await requireAccess("/master-data")

  const [
    cobs,
    rateModes,
    formVariants,
    occupations,
    tariffEqProperty,
    tariffFlood,
    biScales,
    insurers,
    adjusters,
    bankAccounts,
    currencies,
    wordingForms,
    banks,
    lookups,
    lookupTypes,
    cobOjkClasses,
    vehicleBrands,
  ] = await Promise.all([
    listMasterCob(),
    listLookupValues("rate_mode"),
    listLookupValues("form_variant"),
    listOccupations({ limit: 300 }),
    listTariffEqProperty(),
    listTariffFlood(),
    listBiScales(),
    listInsurers(),
    listAdjusters(),
    listBankAccounts(),
    listCurrencies(),
    listWordingForms(),
    listLookupValues("bank"),
    listLookupValues(),
    listDistinctLookupTypes(),
    listCobOjkClasses(),
    listVehicleBrandsMaster(),
  ])

  return (
    <PageShell>
      <PageHeader
        title="Master Data"
        description="Kelola seluruh konfigurasi master COB, tarif OJK, asuransi rekanan, perbankan, dan nilai pilihan sistem secara terpusat."
      />

      <MasterDataTabs
        initialCobs={cobs}
        rateModes={rateModes}
        formVariants={formVariants}
        initialOccupations={occupations}
        tariffEqProperty={tariffEqProperty}
        tariffFlood={tariffFlood}
        biScales={biScales}
        initialInsurers={insurers}
        initialAdjusters={adjusters}
        initialBankAccounts={bankAccounts}
        initialCurrencies={currencies}
        initialWordingForms={wordingForms}
        initialCobOjkClasses={cobOjkClasses}
        initialVehicleBrands={vehicleBrands}
        banks={banks}
        initialLookups={lookups}
        availableLookupTypes={lookupTypes}
      />
    </PageShell>
  )
}
