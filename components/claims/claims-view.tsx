"use client"

import * as React from "react"
import { CircleCheck, Clock, Eye, Pencil, Plus, Receipt, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { deleteClaimAction } from "@/app/(app)/claims/actions"
import { usePermission } from "@/components/auth/permission-provider"
import { ClaimDetailSheet } from "@/components/claims/claim-detail-sheet"
import { ClaimForm } from "@/components/claims/claim-form"
import { PageHeader } from "@/components/layout/page-header"
import { useToday } from "@/components/layout/today-provider"
import { ACTION_COL_CLASS, RowActions } from "@/components/shared/row-actions"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { TableEmpty } from "@/components/shared/table-empty"
import { TablePagination, usePagination } from "@/components/shared/table-pagination"
import { ExportButtons, SearchInput } from "@/components/shared/table-toolbar"
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
import { useCobFilterItems } from "@/components/shared/form-options-provider"
import { toIdr } from "@/lib/calc"
import {
  CLAIM_STAGES,
  CLAIM_STATUSES,
  isOpenClaim,
} from "@/lib/data"
import type { ExportSpec } from "@/lib/export"
import { compactMoney, dateShort, money } from "@/lib/format"
import type { ClaimFormOptions, ClaimRecord } from "@/lib/server/claims"
import { store } from "@/lib/store"

const STATUS_ITEMS = [
  { label: "Semua status", value: "all" },
  ...CLAIM_STATUSES.map((s) => ({ label: s, value: s })),
]

const STAGE_ITEMS = [
  { label: "Semua tahapan", value: "all" },
  ...CLAIM_STAGES.map((s) => ({ label: s, value: s })),
]

export interface ClaimsViewProps {
  initialClaims: ClaimRecord[]
  formOptions: ClaimFormOptions
}

export function ClaimsView({ initialClaims, formOptions }: ClaimsViewProps) {
  const cobItems = useCobFilterItems()
  const [items, setItems] = React.useState<ClaimRecord[]>(initialClaims)
  const [prevInitial, setPrevInitial] = React.useState(initialClaims)
  if (prevInitial !== initialClaims) {
    setPrevInitial(initialClaims)
    setItems(initialClaims)
  }

  React.useEffect(() => {
    store.hydrate("claims", initialClaims)
  }, [initialClaims])

  const today = useToday()
  const permission = usePermission()
  const canManage = permission.canManage("/claims")
  const [search, setSearch] = React.useState("")
  const [status, setStatus] = React.useState<string>("all")
  const [stage, setStage] = React.useState<string>("all")
  const [cob, setCob] = React.useState<string>("all")
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<{
    key: number
    claim: ClaimRecord | null
  } | null>(null)

  const [, startTransition] = React.useTransition()

  const openList = items.filter(isOpenClaim)
  const settledList = items.filter((c) => c.status === "Settled")
  const openTotalIdr = openList.reduce(
    (sum, c) => sum + toIdr(c.claimedAmount || c.estimatedLoss, c.currency),
    0
  )
  const settledTotalIdr = settledList.reduce(
    (sum, c) => sum + toIdr(c.paidAmount, c.currency),
    0
  )
  const totalClaimsIdr = items.reduce(
    (sum, c) => sum + toIdr(c.claimedAmount || c.estimatedLoss, c.currency),
    0
  )

  const filtered = items.filter((c) => {
    if (status !== "all" && c.status !== status) return false
    if (stage !== "all" && c.stage !== stage) return false
    if (cob !== "all" && c.cob !== cob) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      c.claimNo.toLowerCase().includes(q) ||
      c.insuredName.toLowerCase().includes(q) ||
      (c.policyNo || "").toLowerCase().includes(q) ||
      c.cob.toLowerCase().includes(q) ||
      (c.location || "").toLowerCase().includes(q) ||
      (c.lossDescription || "").toLowerCase().includes(q)
    )
  })

  const { page, pageSize, totalItems, paginatedItems, setPage, setPageSize } =
    usePagination(filtered, 10)

  const selected = items.find((c) => c.id === selectedId) ?? null

  function handleDelete(claim: ClaimRecord) {
    startTransition(async () => {
      const res = await deleteClaimAction(claim.id)
      if (!res.ok) {
        toast.error(res.error ?? "Gagal menghapus klaim")
        return
      }
      setItems((prev) => prev.filter((c) => c.id !== claim.id))
      store.replace(
        "claims",
        store.all("claims").filter((c) => c.id !== claim.id)
      )
      toast.success(`Klaim "${claim.claimNo}" berhasil dihapus`)
    })
  }

  function handleSaved(saved: ClaimRecord) {
    setItems((prev) =>
      prev.some((c) => c.id === saved.id)
        ? prev.map((c) => (c.id === saved.id ? saved : c))
        : [saved, ...prev]
    )
  }

  const exportSpec: ExportSpec<ClaimRecord> = {
    filename: `lch-klaim-${today}`,
    sheet: "Klaim",
    rows: filtered,
    columns: [
      { header: "No. Klaim", value: (c) => c.claimNo },
      { header: "No. Polis", value: (c) => c.policyNo },
      { header: "Tertanggung", value: (c) => c.insuredName, width: 36 },
      { header: "Asuransi", value: (c) => c.insurer, width: 36 },
      { header: "COB", value: (c) => c.cob },
      { header: "Tgl Kejadian", value: (c) => c.lossDate, type: "date" },
      { header: "Tgl Lapor", value: (c) => c.reportedDate, type: "date" },
      {
        header: "Tgl Dokumen Lengkap",
        value: (c) => c.documentCompleteDate,
        type: "date",
      },
      { header: "Tgl SPK/SPGR", value: (c) => c.spkDate, type: "date" },
      { header: "Mata Uang", value: (c) => c.currency },
      { header: "Estimasi Kerugian", value: (c) => c.estimatedLoss, type: "money" },
      { header: "Nilai Klaim", value: (c) => c.claimedAmount, type: "money" },
      { header: "Nilai Dibayar", value: (c) => c.paidAmount, type: "money" },
      { header: "Status", value: (c) => c.status },
      { header: "Tahapan", value: (c) => c.stage },
      { header: "Adjuster", value: (c) => c.adjuster },
      { header: "Lokasi", value: (c) => c.location },
      { header: "Deskripsi", value: (c) => c.lossDescription, width: 48 },
    ],
  }

  return (
    <>
      <PageHeader
        title="Klaim Asuransi"
        description="Pencatatan kerugian, monitoring berkas dokumen, dan penyelesaian klaim tertanggung."
        actions={
          canManage ? (
            <Button
              size="sm"
              onClick={() =>
                setForm((prev) => ({ key: (prev?.key ?? 0) + 1, claim: null }))
              }
            >
              <Plus className="size-4" />
              Catat Klaim Baru
            </Button>
          ) : null
        }
      />

      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Klaim Berjalan (Outstanding)"
            value={openList.length}
            sub={`${compactMoney(openTotalIdr)} potensi beban`}
            icon={Clock}
          />
          <StatCard
            label="Klaim Selesai (Settled)"
            value={settledList.length}
            sub={`${compactMoney(settledTotalIdr)} terbayar`}
            icon={CircleCheck}
          />
          <StatCard
            label="Total Klaim Tercatat"
            value={items.length}
            sub={`${compactMoney(totalClaimsIdr)} total pengajuan`}
            icon={Receipt}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            placeholder="Cari no. klaim, polis, tertanggung..."
            value={search}
            onValueChange={setSearch}
            className="w-full sm:w-64"
          />
          <Select
            items={cobItems}
            value={cob}
            onValueChange={(v) => setCob(v as string)}
          >
            <SelectTrigger size="sm" className="w-40">
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
            <SelectTrigger size="sm" className="w-42.5">
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
          <Select
            items={STAGE_ITEMS}
            value={stage}
            onValueChange={(v) => setStage(v as string)}
          >
            <SelectTrigger size="sm" className="w-49">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {STAGE_ITEMS.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <ExportButtons className="ml-auto" spec={exportSpec} />
        </div>

        <Card className="gap-0 overflow-hidden py-0">
          <Table className="min-w-200">
            <TableHeader>
              <TableRow>
                <TableHead className={ACTION_COL_CLASS}>Aksi</TableHead>
                <TableHead>No. Klaim</TableHead>
                <TableHead>Tertanggung & Polis</TableHead>
                <TableHead>COB</TableHead>
                <TableHead>Tgl Kejadian</TableHead>
                <TableHead className="text-right">Nilai Klaim</TableHead>
                <TableHead className="pr-4">Status & Tahapan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.length === 0 ? (
                <TableEmpty
                  colSpan={7}
                  message={
                    search || status !== "all" || stage !== "all" || cob !== "all"
                      ? "Tidak ada klaim yang cocok dengan filter yang dipilih."
                      : "Belum ada klaim yang tercatat."
                  }
                />
              ) : (
                paginatedItems.map((c: ClaimRecord) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedId(c.id)}
                  >
                    <TableCell
                      className={ACTION_COL_CLASS}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <RowActions
                        actions={[
                          {
                            label: "Detail",
                            icon: Eye,
                            onSelect: () => setSelectedId(c.id),
                          },
                          ...(canManage
                            ? [
                                {
                                  label: "Edit",
                                  icon: Pencil,
                                  onSelect: () =>
                                    setForm((prev) => ({
                                      key: (prev?.key ?? 0) + 1,
                                      claim: c,
                                    })),
                                },
                                {
                                  label: "Hapus",
                                  icon: Trash2,
                                  destructive: true,
                                  confirm: {
                                    title: `Hapus klaim ${c.claimNo}?`,
                                    description: `Data klaim untuk ${c.insuredName} akan dihapus secara permanen dari basis data.`,
                                    actionLabel: "Hapus",
                                  },
                                  onSelect: () => handleDelete(c),
                                },
                              ]
                            : []),
                        ]}
                      />
                    </TableCell>
                    <TableCell className="tabular font-medium text-foreground whitespace-nowrap">
                      {c.claimNo}
                    </TableCell>
                    <TableCell className="max-w-55">
                      <p className="truncate">{c.insuredName}</p>
                      <p className="tabular truncate text-xs text-muted-foreground">
                        {c.policyNo}
                      </p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {c.cob}
                    </TableCell>
                    <TableCell className="tabular whitespace-nowrap">
                      {dateShort(c.lossDate)}
                    </TableCell>
                    <TableCell className="tabular text-right font-medium whitespace-nowrap">
                      {money(c.claimedAmount || c.estimatedLoss, c.currency)}
                    </TableCell>
                    <TableCell className="pr-4">
                      <StatusBadge status={c.status} />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {c.stage}
                      </p>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        <TablePagination
          page={page}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemName="klaim"
        />

        <p className="text-xs text-muted-foreground">
          Klik baris untuk membuka detail lengkap. Klaim dapat diubah atau ditutup statusnya.
        </p>

        <ClaimDetailSheet
          claim={selected}
          open={selected !== null}
          onOpenChange={(v) => {
            if (!v) setSelectedId(null)
          }}
          onEdit={
            canManage
              ? (c) => {
                  setSelectedId(null)
                  const matched = items.find((it) => it.id === c.id)
                  setForm((prev) => ({ key: (prev?.key ?? 0) + 1, claim: matched ?? null }))
                }
              : undefined
          }
        />
        {form ? (
          <ClaimForm
            key={form.key}
            open
            onOpenChange={(open) => {
              if (!open) setForm(null)
            }}
            claim={form.claim}
            formOptions={formOptions}
            onSaved={handleSaved}
          />
        ) : null}
      </div>
    </>
  )
}
