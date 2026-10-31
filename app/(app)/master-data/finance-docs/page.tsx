import type { Metadata } from "next"

import { PageHeader, PageShell } from "@/components/layout/page-header"
import { FinanceDocsTab } from "@/components/master-data/finance-docs-tab"
import {
  listBankAccounts,
  listCurrencies,
  listLookupValues,
} from "@/lib/server/master-data"
import { requireAccess } from "@/lib/server/session"

export const metadata: Metadata = {
  title: "Rekening & Mata Uang — LCH Insurance Brokers",
}

export default async function MasterDataFinanceDocsPage() {
  await requireAccess("/master-data")

  const [initialBankAccounts, initialCurrencies, banks] = await Promise.all([
    listBankAccounts(),
    listCurrencies(),
    listLookupValues("bank"),
  ])

  return (
    <PageShell>
      <PageHeader
        title="Rekening & Mata Uang"
        description="Rekening bank LCH, termasuk rekening titipan premi, dan mata uang transaksi."
      />
      <FinanceDocsTab
        initialBankAccounts={initialBankAccounts}
        initialCurrencies={initialCurrencies}
        banks={banks}
      />
    </PageShell>
  )
}
