"use client"

import * as React from "react"
import { Plus } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { ClientForm } from "@/components/marketing/client-form"
import { ClientTable } from "@/components/marketing/client-table"
import { RenewalNotice } from "@/components/marketing/renewal-notice"
import { SppaTable } from "@/components/marketing/sppa-table"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Client } from "@/lib/data"
import type { ClientRecord } from "@/lib/server/clients"
import type { SppaRecord } from "@/lib/server/sppa"
import { useCollection } from "@/lib/store"

interface MarketingTabsProps {
  initialClients?: ClientRecord[]
  initialSppa?: SppaRecord[]
}

export function MarketingTabs({
  initialClients,
  initialSppa,
}: MarketingTabsProps) {
  const sppa = useCollection("sppa")
  const sppaCount = initialSppa?.length ?? sppa.length
  const [form, setForm] = React.useState<{
    key: number
    client: Client | null
  } | null>(null)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Marketing"
        description="Database klien dan KYC, SPPA, serta renewal notice"
        actions={
          <Button
            onClick={() =>
              setForm((prev) => ({ key: (prev?.key ?? 0) + 1, client: null }))
            }
          >
            <Plus data-icon="inline-start" />
            Tambah Klien
          </Button>
        }
      />

      <Tabs defaultValue="clients" className="flex flex-col gap-4">
        <TabsList className="no-print">
          <TabsTrigger value="clients">Database Klien</TabsTrigger>
          <TabsTrigger value="sppa">SPPA ({sppaCount})</TabsTrigger>
          <TabsTrigger value="renewal">Renewal Notice</TabsTrigger>
        </TabsList>
        <TabsContent value="clients">
          <ClientTable
            initialClients={initialClients}
            onEdit={(client) =>
              setForm((prev) => ({ key: (prev?.key ?? 0) + 1, client }))
            }
          />
        </TabsContent>
        <TabsContent value="sppa">
          <SppaTable initialSppa={initialSppa} />
        </TabsContent>
        <TabsContent value="renewal">
          <RenewalNotice />
        </TabsContent>
      </Tabs>

      {form ? (
        <ClientForm
          key={form.key}
          open
          onOpenChange={(open) => {
            if (!open) setForm(null)
          }}
          client={form.client}
        />
      ) : null}
    </div>
  )
}
