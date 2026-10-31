"use client"

import * as React from "react"
import Link from "next/link"
import { Ban, Copy, Eye, FileText, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

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
import { useToday } from "@/components/layout/today-provider"
import { totalPremium, totalSumInsured } from "@/lib/calc"
import { useCobFilterItems } from "@/components/shared/form-options-provider"
import { SLIP_STATUSES, type PlacingSlip } from "@/lib/data"
import type { ExportSpec } from "@/lib/export"
import { dateShort, money } from "@/lib/format"
import { newId, store, useCollection } from "@/lib/store"
import type { PlacingSlipRecord } from "@/lib/server/placing-slips"
import {
  deletePlacingSlipAction,
  duplicatePlacingSlipAction,
  togglePlacingSlipStatusAction,
} from "@/app/(app)/underwriting/actions"

const STATUS_ITEMS = [
  { label: "Semua status", value: "all" },
  ...SLIP_STATUSES.map((s) => ({
    label: s === "Cancelled" ? "Dibatalkan" : s,
    value: s,
  })),
]

function actionsFor(
  slip: PlacingSlip,
  today: string,
  canManage: boolean
): RowAction[] {
  const actions: RowAction[] = [
    {
      label: "Lihat placing slip",
      icon: Eye,
      render: <Link href={`/underwriting/slip/${slip.id}`} />,
    },
  ]
  if (!canManage) {
    return actions
  }
  actions.push({
    label:
      slip.status === "Closed" || slip.status === "Cancelled"
        ? "Buka slip"
        : "Edit slip",
    icon: Pencil,
    render: <Link href={`/underwriting/edit/${slip.id}`} />,
  })
  if (
    slip.status === "Released" ||
    slip.status === "Quoted" ||
    slip.status === "Closed"
  ) {
    actions.push({
      label: "Draft quotation slip",
      icon: FileText,
      render: <Link href={`/underwriting/quotation/edit/${slip.id}`} />,
    })
  }
  actions.push({
    label: "Duplikat jadi draft baru",
    icon: Copy,
    onSelect: async () => {
      // Duplikasi via Server Action ke database
      const res = await duplicatePlacingSlipAction(slip.id)
      if (res.ok && res.data) {
        store.upsert("slips", res.data)
        toast.success("Slip diduplikasi", {
          description: `Draft baru untuk ${res.data.insuredName}`,
        })
      } else {
        // Fallback local memory jika id belum sync ke DB
        const copy: PlacingSlip = {
          ...slip,
          id: newId("s"),
          slipNo: null,
          seq: 0,
          status: "Draft",
          sppaId: null,
          subjectivity: undefined,
          securityPanel: undefined,
          closingInstruction: undefined,
          coverNoteRemarks: undefined,
          createdAt: today,
          updatedAt: today,
        }
        store.insert("slips", copy)
        toast.success("Slip diduplikasi", {
          description: `Draft baru untuk ${slip.insuredName}`,
        })
      }
    },
  })
  if (slip.status === "Draft") {
    actions.push({
      label: "Hapus draft",
      icon: Trash2,
      destructive: true,
      confirm: {
        title: "Hapus draft placing slip?",
        description: `Draft untuk ${slip.insuredName || "tertanggung"} belum bernomor, jadi dihapus permanen.`,
        actionLabel: "Hapus",
      },
      onSelect: async () => {
        store.remove("slips", slip.id)
        const res = await deletePlacingSlipAction(slip.id)
        if (!res.ok && res.error) {
          toast.error("Gagal menghapus dari database", { description: res.error })
        } else {
          toast.success("Draft slip dihapus")
        }
      },
    })
  } else if (slip.status === "Released" || slip.status === "Quoted") {
    actions.push({
      label: "Batalkan slip",
      icon: Ban,
      destructive: true,
      confirm: {
        title: `Batalkan slip ${slip.slipNo}?`,
        description:
          "Slip bernomor tidak dihapus supaya nomor tidak bolong. Statusnya menjadi Dibatalkan.",
        actionLabel: "Batalkan slip",
      },
      onSelect: async () => {
        store.update("slips", slip.id, {
          status: "Cancelled",
          updatedAt: today,
        })
        const res = await togglePlacingSlipStatusAction(slip.id, "Cancelled")
        if (!res.ok && res.error) {
          toast.error("Gagal memperbarui status di database", { description: res.error })
        } else {
          toast.success("Slip dibatalkan", {
            description: slip.slipNo ?? undefined,
          })
        }
      },
    })
  }
  return actions
}

export function SlipTable({
  initialSlips,
}: {
  initialSlips?: PlacingSlipRecord[]
}) {
  const today = useToday()
  const cobItems = useCobFilterItems()

  React.useEffect(() => {
    if (initialSlips && initialSlips.length > 0) {
      store.hydrate("slips", initialSlips)
    }
  }, [initialSlips])

  const slips = useCollection("slips")
  const permission = usePermission()
  const canManage = permission.canManage("/underwriting")
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState("all")
  const [cob, setCob] = React.useState("all")

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return slips.filter((s) => {
      if (status !== "all" && s.status !== status) return false
      if (cob !== "all" && s.cob !== cob) return false
      if (!q) return true
      return [
        s.slipNo ?? "",
        s.insuredName,
        s.typeOfCover,
        s.occupation ?? "",
      ].some((v) => v.toLowerCase().includes(q))
    })
  }, [slips, query, status, cob])

  const {
    page,
    pageSize,
    totalItems,
    paginatedItems: paginatedRows,
    setPage,
    setPageSize,
  } = usePagination(rows, 10)

  const exportSpec: ExportSpec<PlacingSlip> = {
    filename: "placing-slip-lch",
    sheet: "Placing Slip",
    rows,
    columns: [
      { header: "No. Slip", value: (s) => s.slipNo ?? "Draft" },
      { header: "Tertanggung", value: (s) => s.insuredName, width: 36 },
      { header: "COB", value: (s) => s.cob },
      { header: "Type of Cover", value: (s) => s.typeOfCover, width: 32 },
      { header: "Mata Uang", value: (s) => s.currency },
      {
        header: "Total Sum Insured",
        value: (s) => totalSumInsured(s),
        type: "money",
      },
      { header: "Total Premium", value: (s) => totalPremium(s), type: "money" },
      {
        header: "Brokerage (%)",
        value: (s) => s.brokeragePct,
        type: "percent",
      },
      { header: "Status", value: (s) => s.status },
      { header: "Diperbarui", value: (s) => s.updatedAt, type: "date" },
    ],
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="no-print flex flex-wrap items-center gap-2">
        <SearchInput
          value={query}
          onValueChange={setQuery}
          placeholder="Cari no. slip, tertanggung, type of cover…"
        />
        <Select
          items={cobItems}
          value={cob}
          onValueChange={(v) => setCob(v as string)}
        >
          <SelectTrigger size="sm" className="w-42">
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
          <SelectTrigger size="sm" className="w-37.5">
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

      <Card className="gap-0 overflow-hidden py-0">
        <Table className="min-w-210">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={ACTION_COL_CLASS}>
                <span className="sr-only">Aksi</span>
              </TableHead>
              <TableHead>No. Slip</TableHead>
              <TableHead>Nama Tertanggung</TableHead>
              <TableHead>Type of Cover</TableHead>
              <TableHead className="text-right">Total Sum Insured</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-4">Diperbarui</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableEmpty
                colSpan={7}
                message="Tidak ada placing slip yang cocok"
              />
            ) : (
              paginatedRows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className={ACTION_COL_CLASS}>
                    <RowActions actions={actionsFor(s, today, canManage)} />
                  </TableCell>
                  <TableCell className="max-w-57.5">
                    {s.slipNo ? (
                      <span className="tabular font-semibold text-primary">
                        {s.slipNo}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic">
                        Belum di-release
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-60">
                    <p className="truncate font-medium">{s.insuredName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.cob}
                    </p>
                  </TableCell>
                  <TableCell className="max-w-52.5">
                    <p className="truncate">{s.typeOfCover}</p>
                    {s.occupation ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {s.occupation}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="tabular text-right font-medium">
                    {money(totalSumInsured(s), s.currency)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={s.status} />
                  </TableCell>
                  <TableCell className="tabular pr-4 text-muted-foreground">
                    {dateShort(s.updatedAt)}
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
        itemName="placing slip"
      />

      <p className="text-xs text-muted-foreground">
        Pola nomor{" "}
        <span className="tabular">
          {"{seq}/LCH-PLCMT/PS[-{kode}]/{bulan romawi}/{tahun}"}
        </span>{" "}
        digenerate saat release
      </p>
    </div>
  )
}
