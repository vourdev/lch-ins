"use client"

import * as React from "react"
import {
  Building2,
  Car,
  Coins,
  Layers,
  ListFilter,
  ShieldAlert,
  Tags,
} from "lucide-react"

import { CobCoverTab } from "@/components/master-data/cob-cover-tab"
import { CobOjkClassesTab } from "@/components/master-data/cob-ojk-classes-tab"
import { FinanceDocsTab } from "@/components/master-data/finance-docs-tab"
import { InsurersAdjustersTab } from "@/components/master-data/insurers-adjusters-tab"
import { LookupValuesTab } from "@/components/master-data/lookup-values-tab"
import { TariffOjkTab } from "@/components/master-data/tariff-ojk-tab"
import { VehiclesTab } from "@/components/master-data/vehicles-tab"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type {
  Adjuster,
  BiScale,
  Currency,
  Insurer,
  LookupValue,
  TariffEqProperty,
  TariffFlood,
  WordingForm,
} from "@/lib/generated/prisma/client"
import type {
  BankAccountRecord,
  MasterCobRecord,
  OccupationRecord,
} from "@/lib/server/master-data"
import type { CobOjkClassRecord } from "@/lib/server/cob-ojk-classes"
import type { VehicleBrandRecord } from "@/lib/server/vehicles"

export interface MasterDataTabsProps {
  initialCobs: MasterCobRecord[]
  rateModes: LookupValue[]
  formVariants: LookupValue[]
  initialOccupations: OccupationRecord[]
  tariffEqProperty: TariffEqProperty[]
  tariffFlood: TariffFlood[]
  biScales: BiScale[]
  initialInsurers: Insurer[]
  initialAdjusters: Adjuster[]
  initialBankAccounts: BankAccountRecord[]
  initialCurrencies: Currency[]
  initialWordingForms: WordingForm[]
  initialCobOjkClasses: CobOjkClassRecord[]
  initialVehicleBrands: VehicleBrandRecord[]
  banks: LookupValue[]
  initialLookups: LookupValue[]
  availableLookupTypes: string[]
}

export function MasterDataTabs({
  initialCobs,
  rateModes,
  formVariants,
  initialOccupations,
  tariffEqProperty,
  tariffFlood,
  biScales,
  initialInsurers,
  initialAdjusters,
  initialBankAccounts,
  initialCurrencies,
  initialWordingForms,
  initialCobOjkClasses,
  initialVehicleBrands,
  banks,
  initialLookups,
  availableLookupTypes,
}: MasterDataTabsProps) {
  const [activeTab, setActiveTab] = React.useState("cob")

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <div className="overflow-x-auto pb-1">
        <TabsList className="inline-flex h-10 min-w-max items-center justify-start rounded-lg bg-muted p-1 text-muted-foreground">
          <TabsTrigger value="cob" className="gap-1.5 px-3 text-xs">
            <Layers className="size-3.5" />
            COB & Cover Type ({initialCobs.length})
          </TabsTrigger>

          <TabsTrigger value="tariff-ojk" className="gap-1.5 px-3 text-xs">
            <ShieldAlert className="size-3.5" />
            Tarif Baku OJK
          </TabsTrigger>

          <TabsTrigger value="cob-ojk" className="gap-1.5 px-3 text-xs">
            <Tags className="size-3.5" />
            Klasifikasi OJK ({initialCobOjkClasses.length})
          </TabsTrigger>

          <TabsTrigger value="partners" className="gap-1.5 px-3 text-xs">
            <Building2 className="size-3.5" />
            Asuransi & Adjuster ({initialInsurers.length + initialAdjusters.length})
          </TabsTrigger>

          <TabsTrigger value="finance-docs" className="gap-1.5 px-3 text-xs">
            <Coins className="size-3.5" />
            Keuangan & Wording ({initialBankAccounts.length + initialWordingForms.length})
          </TabsTrigger>

          <TabsTrigger value="vehicles" className="gap-1.5 px-3 text-xs">
            <Car className="size-3.5" />
            Kendaraan ({initialVehicleBrands.length})
          </TabsTrigger>

          <TabsTrigger value="lookups" className="gap-1.5 px-3 text-xs">
            <ListFilter className="size-3.5" />
            Nilai Pilihan Dropdown ({initialLookups.length})
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="cob" className="space-y-4">
        <CobCoverTab
          initialCobs={initialCobs}
          rateModes={rateModes}
          formVariants={formVariants}
        />
      </TabsContent>

      <TabsContent value="tariff-ojk" className="space-y-4">
        <TariffOjkTab
          initialOccupations={initialOccupations}
          tariffEqProperty={tariffEqProperty}
          tariffFlood={tariffFlood}
          biScales={biScales}
        />
      </TabsContent>

      <TabsContent value="cob-ojk" className="space-y-4">
        <CobOjkClassesTab initialCobOjkClasses={initialCobOjkClasses} />
      </TabsContent>

      <TabsContent value="partners" className="space-y-4">
        <InsurersAdjustersTab
          initialInsurers={initialInsurers}
          initialAdjusters={initialAdjusters}
        />
      </TabsContent>

      <TabsContent value="finance-docs" className="space-y-4">
        <FinanceDocsTab
          initialBankAccounts={initialBankAccounts}
          initialCurrencies={initialCurrencies}
          initialWordingForms={initialWordingForms}
          banks={banks}
        />
      </TabsContent>

      <TabsContent value="vehicles" className="space-y-4">
        <VehiclesTab initialBrands={initialVehicleBrands} />
      </TabsContent>

      <TabsContent value="lookups" className="space-y-4">
        <LookupValuesTab
          initialLookups={initialLookups}
          availableTypes={availableLookupTypes}
        />
      </TabsContent>
    </Tabs>
  )
}
