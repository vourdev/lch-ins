import type { Metadata } from "next"
import Link from "next/link"
import { FilePlus2 } from "lucide-react"

import { PageHeader, PageShell } from "@/components/layout/page-header"
import { FormOptionsBoundary } from "@/components/shared/form-options-boundary"
import { SlipTable } from "@/components/underwriting/slip-table"
import { Button } from "@/components/ui/button"
import { canManage } from "@/lib/access"
import { listPlacingSlips } from "@/lib/server/placing-slips"
import { currentUser } from "@/lib/server/session"

export const metadata: Metadata = { title: "Placement — LCH Insurance Brokers" }

export default async function UnderwritingPage() {
  const [initialSlips, user] = await Promise.all([
    listPlacingSlips(),
    currentUser(),
  ])

  const canManageUnderwriting = user
    ? canManage(user.roles, "/underwriting")
    : false

  return (
    <PageShell>
      <PageHeader
        title="Placement"
        description="Placing slip management — draft, release, dan dokumen turunan"
        actions={
          canManageUnderwriting ? (
            <Button
              render={<Link href="/underwriting/new" />}
              nativeButton={false}
            >
              <FilePlus2 data-icon="inline-start" />
              Buat Placing Slip
            </Button>
          ) : null
        }
      />
      <FormOptionsBoundary>
        <SlipTable initialSlips={initialSlips} />
      </FormOptionsBoundary>
    </PageShell>
  )
}
