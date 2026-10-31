"use client"

import * as React from "react"
import {
  FilePlus2,
  FileText,
  Pencil,
  Plus,
  RefreshCcw,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { deletePolicyAction } from "@/app/(app)/policies/actions"
import { useToday } from "@/components/layout/today-provider"
import { PageHeader } from "@/components/layout/page-header"
import { PolicyFilesSheet } from "@/components/policies/policy-files-sheet"
import { PolicyForm } from "@/components/policies/policy-form"
import {
  ACTION_COL_CLASS,
  RowActions,
  type RowAction,
} from "@/components/shared/row-actions"
import { StatusBadge } from "@/components/shared/status-badge"
import { TableEmpty } from "@/components/shared/table-empty"
import { TablePagination, usePagination } from "@/components/shared/table-pagination"
import { ExportButtons, SearchInput } from "@/components/shared/table-toolbar"
import { usePermission } from "@/components/auth/permission-provider"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCobFilterItems } from "@/components/shared/form-options-provider"
import {
  POLICY_TYPES,
  policyStatus,
  premiumIdr,
  type Policy,
  type PolicyType,
} from "@/lib/data"
import { addMonths } from "@/lib/date"
import type { ExportSpec } from "@/lib/export"
import { dateShort, money, rupiah } from "@/lib/format"
import type { ClientOption } from "@/lib/server/clients"
import type { PolicyFormOptions } from "@/lib/server/policies"
import { store, useCollection } from "@/lib/store"

const STATUS_ITEMS = [
  { label: "Semua status", value: "all" },
  { label: "Active", value: "Active" },
  { label: "Expiring", value: "Expiring" },
  { label: "Expired", value: "Expired" },
]

type FormState = {
  key: number
  policy: Policy | null
  preset?: Partial<Policy>
}

/** Server rows plus softcopies uploaded in this tab, which only live in the session store. */
function withSessionFiles(server: Policy[], session: Policy[]): Policy[] {
  const sessionById = new Map(session.map((p) => [p.id, p]))
  return server.map((p) => {
    const extra = (sessionById.get(p.id)?.files ?? []).filter(
      (f) => f.url && !p.files.some((x) => x.id === f.id)
    )
    return extra.length ? { ...p, files: [...p.files, ...extra] } : p
  })
}

export function PolicyDatabase({
  initialPolicies,
  clientOptions,
  formOptions,
}: {
  initialPolicies: Policy[]
  clientOptions: ClientOption[]
  formOptions: PolicyFormOptions
}) {
  const cobItems = useCobFilterItems()
  const today = useToday()
  const permission = usePermission()
  const canManage = permission.canManage("/policies")
  const sessionPolicies = useCollection("policies")
  const claims = useCollection("claims")
  const [, startDelete] = React.useTransition()

  const policies = React.useMemo(
    () => withSessionFiles(initialPolicies, sessionPolicies),
    [initialPolicies, sessionPolicies]
  )

  // Downstream modules (dashboard, renewal notice, claims) still read the store.
  React.useEffect(() => {
    store.replace("policies", withSessionFiles(initialPolicies, store.all("policies")))
  }, [initialPolicies])

  const [query, setQuery] = React.useState("")
  const [cob, setCob] = React.useState("all")
  const [status, setStatus] = React.useState("all")
  const [tab, setTab] = React.useState<"all" | PolicyType>("all")
  const [form, setForm] = React.useState<FormState | null>(null)
  const [filesFor, setFilesFor] = React.useState<string | null>(null)

  const openForm = (policy: Policy | null, preset?: Partial<Policy>) =>
    // Key baru setiap kali form dibuka supaya isiannya selalu mulai dari data terbaru.
    setForm((prev) => ({ key: (prev?.key ?? 0) + 1, policy, preset }))

  const base = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return policies.filter((p) => {
      if (cob !== "all" && p.cob !== cob) return false
      if (status !== "all" && policyStatus(p.expiryDate, today) !== status)
        return false
      if (!q) return true
      return [p.policyNo, p.insuredName, p.insurer, p.riskLocation].some((v) =>
        v.toLowerCase().includes(q)
      )
    })
  }, [policies, query, cob, status, today])

  const rows = tab === "all" ? base : base.filter((p) => p.type === tab)
  const totalPremium = rows.reduce((a, p) => a + premiumIdr(p), 0)
  const policyNoById = new Map(policies.map((p) => [p.id, p.policyNo]))

  const {
    page,
    pageSize,
    totalItems,
    paginatedItems: paginatedRows,
    setPage,
    setPageSize,
  } = usePagination(rows, 10)

  function actionsFor(p: Policy): RowAction[] {
    if (!canManage) {
      return [
        {
          label: `Softcopy (${p.files.length} versi)`,
          icon: FileText,
          onSelect: () => setFilesFor(p.id),
        },
      ]
    }

    const claimCount = claims.filter((c) => c.policyId === p.id).length
    const childCount = policies.filter((x) => x.parentPolicyId === p.id).length
    const blocked = claimCount > 0 || childCount > 0
    const renewable = p.type === "Baru" || p.type === "Renewal"
    const actions: RowAction[] = [
      { label: "Edit polis", icon: Pencil, onSelect: () => openForm(p) },
      {
        label: `Softcopy (${p.files.length} versi)`,
        icon: FileText,
        onSelect: () => setFilesFor(p.id),
      },
    ]
    if (renewable) {
      actions.push(
        {
          label: "Buat renewal",
          icon: RefreshCcw,
          onSelect: () =>
            openForm(null, {
              type: "Renewal",
              parentPolicyId: p.id,
              clientId: p.clientId,
              insuredName: p.insuredName,
              insurer: p.insurer,
              insurers: p.insurers,
              cob: p.cob,
              typeOfCover: p.typeOfCover,
              currency: p.currency,
              riskLocation: p.riskLocation,
              brokeragePct: p.brokeragePct,
              cobOjkClassId: p.cobOjkClassId,
              placementLocationId: p.placementLocationId,
              groupingInsured: p.groupingInsured,
              sumInsured: p.sumInsured,
              inceptionDate: p.expiryDate,
              expiryDate: addMonths(p.expiryDate, 12),
            }),
        },
        {
          label: "Buat endorsement",
          icon: FilePlus2,
          onSelect: () =>
            openForm(null, {
              type: "Endorsement",
              parentPolicyId: p.id,
              clientId: p.clientId,
              insuredName: p.insuredName,
              insurer: p.insurer,
              insurers: p.insurers,
              cob: p.cob,
              typeOfCover: p.typeOfCover,
              currency: p.currency,
              riskLocation: p.riskLocation,
              brokeragePct: p.brokeragePct,
              cobOjkClassId: p.cobOjkClassId,
              placementLocationId: p.placementLocationId,
              groupingInsured: p.groupingInsured,
              expiryDate: p.expiryDate,
            }),
        }
      )
    }
    actions.push({
      label: blocked ? "Hapus (masih dipakai)" : "Hapus polis",
      icon: Trash2,
      destructive: true,
      disabled: blocked,
      confirm: {
        title: `Hapus polis ${p.policyNo}?`,
        description:
          "Polis dan riwayat softcopy-nya dihapus dari database. Tindakan ini tidak bisa dibatalkan.",
        actionLabel: "Hapus",
      },
      onSelect: () =>
        startDelete(async () => {
          const res = await deletePolicyAction(p.id)
          if (!res.ok) {
            toast.error("Gagal menghapus polis", { description: res.error })
            return
          }
          store.remove("policies", p.id)
          toast.success("Polis dihapus", { description: p.policyNo })
        }),
    })
    return actions
  }

  const exportSpec: ExportSpec<Policy> = {
    filename: "polis-lch",
    sheet: "Polis",
    rows,
    columns: [
      { header: "No. Polis", value: (p) => p.policyNo },
      { header: "Tipe", value: (p) => p.type },
      { header: "Endorsement Ke", value: (p) => p.endorsementSeq ?? "" },
      {
        header: "Polis Induk",
        value: (p) =>
          p.parentPolicyId ? policyNoById.get(p.parentPolicyId) : "",
      },
      { header: "Tertanggung", value: (p) => p.insuredName, width: 36 },
      { header: "Asuransi", value: (p) => p.insurer, width: 36 },
      { header: "COB", value: (p) => p.cob },
      { header: "Mulai", value: (p) => p.inceptionDate, type: "date" },
      { header: "Berakhir", value: (p) => p.expiryDate, type: "date" },
      { header: "Mata Uang", value: (p) => p.currency },
      { header: "Sum Insured", value: (p) => p.sumInsured, type: "money" },
      { header: "Premium", value: (p) => p.premium, type: "money" },
      {
        header: "Brokerage (%)",
        value: (p) => p.brokeragePct,
        type: "percent",
      },
      { header: "Status", value: (p) => policyStatus(p.expiryDate, today) },
      { header: "Lokasi Risiko", value: (p) => p.riskLocation, width: 40 },
    ],
  }

  const filesPolicy = filesFor
    ? (policies.find((p) => p.id === filesFor) ?? null)
    : null

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Policy Database"
        description="Database polis asuransi beserta softcopy dokumen"
        actions={
          canManage ? (
            <Button onClick={() => openForm(null)}>
              <Plus data-icon="inline-start" />
              Tambah Polis
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-4">
        <div className="no-print flex flex-wrap items-center gap-2">
          <SearchInput
            value={query}
            onValueChange={setQuery}
            placeholder="Cari no. polis, tertanggung, asuransi…"
          />
          <Select
            items={cobItems}
            value={cob}
            onValueChange={(v) => setCob(v as string)}
          >
            <SelectTrigger
              size="sm"
              className="w-42"
              aria-label="Filter COB"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {cobItems.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            items={STATUS_ITEMS}
            value={status}
            onValueChange={(v) => setStatus(v as string)}
          >
            <SelectTrigger
              size="sm"
              className="w-37.5"
              aria-label="Filter status"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {STATUS_ITEMS.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <ExportButtons className="ml-auto" spec={exportSpec} />
        </div>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "all" | PolicyType)}
          className="flex flex-col gap-4"
        >
          <TabsList className="no-print max-w-full overflow-x-auto">
            <TabsTrigger value="all">Semua ({base.length})</TabsTrigger>
            {POLICY_TYPES.map((t) => (
              <TabsTrigger key={t} value={t}>
                {t} ({base.filter((p) => p.type === t).length})
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={tab}>
            <Card className="gap-0 overflow-hidden py-0">
              <Table className="min-w-[840px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={ACTION_COL_CLASS}>
                      <span className="sr-only">Aksi</span>
                    </TableHead>
                    <TableHead>No. Polis</TableHead>
                    <TableHead>Tertanggung</TableHead>
                    <TableHead>COB</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead className="text-right">Premium</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-4">Softcopy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableEmpty
                      colSpan={9}
                      message="Tidak ada polis yang cocok"
                    />
                  ) : (
                    paginatedRows.map((p) => {
                      const latest = p.files[p.files.length - 1]
                      return (
                        <TableRow key={p.id}>
                          <TableCell className={ACTION_COL_CLASS}>
                            <RowActions actions={actionsFor(p)} />
                          </TableCell>
                          <TableCell className="tabular font-medium">
                            {p.policyNo}
                            {p.parentPolicyId ? (
                              <span className="block text-xs font-normal text-muted-foreground">
                                induk{" "}
                                {policyNoById.get(p.parentPolicyId) ?? "—"}
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell className="max-w-50">
                            <p className="truncate">{p.insuredName}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {p.insurer}
                            </p>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {p.cob}
                          </TableCell>
                          <TableCell className="tabular">
                            {dateShort(p.inceptionDate)}
                            <span className="block text-xs text-muted-foreground">
                              s/d {dateShort(p.expiryDate)}
                            </span>
                          </TableCell>
                          <TableCell
                            className={
                              p.premium < 0
                                ? "tabular text-right font-medium text-destructive"
                                : "tabular text-right font-medium"
                            }
                          >
                            {money(p.premium, p.currency)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={p.type} />
                            {p.endorsementSeq ? (
                              <span className="tabular ml-1.5 text-xs text-muted-foreground">
                                ke-{p.endorsementSeq}
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              status={policyStatus(p.expiryDate, today)}
                            />
                          </TableCell>
                          <TableCell className="pr-4">
                            {latest ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="-mx-2 h-7 text-primary"
                                onClick={() => setFilesFor(p.id)}
                              >
                                <FileText data-icon="inline-start" />v
                                {latest.version}
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="-mx-2 h-7 text-muted-foreground"
                                onClick={() => setFilesFor(p.id)}
                              >
                                Upload
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </Card>

            <div className="mt-3">
              <TablePagination
                page={page}
                pageSize={pageSize}
                totalItems={totalItems}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                itemName="polis"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Status dihitung dari tanggal berakhir per {dateShort(today)}
          </span>
          <span>
            Total premium (setara IDR):{" "}
            <span className="tabular font-medium text-foreground">
              {rupiah(totalPremium)}
            </span>
          </span>
        </div>
      </div>

      {form ? (
        <PolicyForm
          key={form.key}
          open
          onOpenChange={(open) => {
            if (!open) setForm(null)
          }}
          policy={form.policy}
          preset={form.preset}
          clientOptions={clientOptions}
          formOptions={formOptions}
        />
      ) : null}
      <PolicyFilesSheet
        policy={filesPolicy}
        onOpenChange={(open) => {
          if (!open) setFilesFor(null)
        }}
      />
    </div>
  )
}
