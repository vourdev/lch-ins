"use client"

import * as React from "react"
import Link from "next/link"
import { FilePlus2, Pencil, Plus, Printer, Send, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { SppaForm } from "@/components/marketing/sppa-form"
import {
  deleteSppaAction,
  toggleSppaStatusAction,
} from "@/app/(app)/marketing/actions"
import {
  ACTION_COL_CLASS,
  RowActions,
  type RowAction,
} from "@/components/shared/row-actions"
import { StatusBadge } from "@/components/shared/status-badge"
import { TableEmpty } from "@/components/shared/table-empty"
import { TablePagination, usePagination } from "@/components/shared/table-pagination"
import { ExportButtons, SearchInput } from "@/components/shared/table-toolbar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Sppa, VehicleBrandOption } from "@/lib/data"
import type { SppaRecord } from "@/lib/server/sppa"
import type { ExportSpec } from "@/lib/export"
import { dateShort, money } from "@/lib/format"
import { store, useCollection } from "@/lib/store"

export interface SppaTableProps {
  initialSppa?: SppaRecord[]
  /** Batasi ke satu klien (dipakai di halaman detail klien). */
  clientId?: string
  compact?: boolean
  vehicleOptions?: VehicleBrandOption[]
}

export function SppaTable({
  initialSppa,
  clientId,
  compact,
  vehicleOptions,
}: SppaTableProps) {
  const all = useCollection("sppa")
  const slips = useCollection("slips")
  const [query, setQuery] = React.useState("")
  const [isPending, startTransition] = React.useTransition()

  React.useEffect(() => {
    if (!initialSppa?.length) return
    for (const item of initialSppa) {
      store.upsert("sppa", item)
    }
  }, [initialSppa])
  const [form, setForm] = React.useState<{
    key: number
    sppa: Sppa | null
  } | null>(null)

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return all.filter((s) => {
      if (clientId && s.clientId !== clientId) return false
      if (!q) return true
      return [s.insuredName, s.typeOfCover, s.cob, s.riskLocation].some((v) =>
        v.toLowerCase().includes(q)
      )
    })
  }, [all, query, clientId])

  const {
    page,
    pageSize,
    totalItems,
    paginatedItems: paginatedRows,
    setPage,
    setPageSize,
  } = usePagination(rows, compact ? 5 : 10)

  function actionsFor(s: Sppa): RowAction[] {
    const slipCount = slips.filter((x) => x.sppaId === s.id).length
    const actions: RowAction[] = [
      {
        label: "Cetak SPPA",
        icon: Printer,
        render: <Link href={`/marketing/sppa/${s.id}`} />,
      },
      {
        label: "Buat placing slip",
        icon: FilePlus2,
        render: <Link href={`/underwriting/new?sppa=${s.id}`} />,
      },
      {
        label: "Edit SPPA",
        icon: Pencil,
        onSelect: () =>
          setForm((prev) => ({ key: (prev?.key ?? 0) + 1, sppa: s })),
      },
    ]
    if (s.status === "Draft") {
      actions.push({
        label: "Tandai Submitted",
        icon: Send,
        disabled: isPending,
        onSelect: () => {
          startTransition(async () => {
            const res = await toggleSppaStatusAction(s.id, "Submitted")
            if (res.ok) {
              store.update("sppa", s.id, { status: "Submitted" })
              toast.success("SPPA ditandai Submitted")
            } else {
              toast.error(res.error || "Gagal mengubah status SPPA")
            }
          })
        },
      })
    }
    actions.push({
      label: slipCount ? "Hapus (sudah jadi slip)" : "Hapus SPPA",
      icon: Trash2,
      destructive: true,
      disabled: slipCount > 0 || isPending,
      confirm: {
        title: "Hapus SPPA ini?",
        description: `SPPA ${s.insuredName} (${s.cob}) dihapus permanen.`,
        actionLabel: "Hapus",
      },
      onSelect: () => {
        startTransition(async () => {
          const res = await deleteSppaAction(s.id)
          if (res.ok) {
            store.remove("sppa", s.id)
            toast.success("SPPA dihapus")
          } else {
            toast.error(res.error || "Gagal menghapus SPPA")
          }
        })
      },
    })
    return actions
  }

  const exportSpec: ExportSpec<Sppa> = {
    filename: "sppa-lch",
    sheet: "SPPA",
    rows,
    columns: [
      { header: "Tanggal", value: (s) => s.createdAt, type: "date" },
      { header: "Tertanggung", value: (s) => s.insuredName, width: 36 },
      { header: "COB", value: (s) => s.cob },
      { header: "Type of Cover", value: (s) => s.typeOfCover, width: 32 },
      { header: "Lokasi Risiko", value: (s) => s.riskLocation, width: 40 },
      { header: "Mata Uang", value: (s) => s.currency },
      {
        header: "Nilai Pertanggungan",
        value: (s) => s.sumInsured,
        type: "money",
      },
      { header: "Mulai", value: (s) => s.periodStart, type: "date" },
      { header: "Berakhir", value: (s) => s.periodEnd, type: "date" },
      { header: "Status", value: (s) => s.status },
    ],
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="no-print flex flex-wrap items-center gap-2">
        {!compact ? (
          <SearchInput
            value={query}
            onValueChange={setQuery}
            placeholder="Cari tertanggung, COB, lokasi…"
          />
        ) : null}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {!compact ? <ExportButtons spec={exportSpec} /> : null}
          <Button
            size="sm"
            onClick={() =>
              setForm((prev) => ({ key: (prev?.key ?? 0) + 1, sppa: null }))
            }
          >
            <Plus data-icon="inline-start" />
            Buat SPPA
          </Button>
        </div>
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <Table className="min-w-200">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={ACTION_COL_CLASS}>
                <span className="sr-only">Aksi</span>
              </TableHead>
              <TableHead>Tertanggung</TableHead>
              <TableHead>Type of Cover</TableHead>
              <TableHead className="text-right">Nilai Pertanggungan</TableHead>
              <TableHead>Periode</TableHead>
              <TableHead>Slip</TableHead>
              <TableHead className="pr-4">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableEmpty colSpan={7} message="Belum ada SPPA" />
            ) : (
              paginatedRows.map((s) => {
                const linked = slips.filter((x) => x.sppaId === s.id)
                return (
                  <TableRow key={s.id}>
                    <TableCell className={ACTION_COL_CLASS}>
                      <RowActions actions={actionsFor(s)} />
                    </TableCell>
                    <TableCell className="max-w-60">
                      <p className="truncate font-medium">{s.insuredName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        Dibuat {dateShort(s.createdAt)}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-55">
                      <p className="truncate">{s.typeOfCover}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {s.cob}
                      </p>
                    </TableCell>
                    <TableCell className="tabular text-right font-medium">
                      {money(s.sumInsured, s.currency)}
                    </TableCell>
                    <TableCell className="tabular text-xs">
                      {dateShort(s.periodStart)}
                      <span className="block text-muted-foreground">
                        s/d {dateShort(s.periodEnd)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {linked.length ? (
                        <Link
                          href={`/underwriting/edit/${linked[0].id}`}
                          className="text-primary underline-offset-2 hover:underline"
                        >
                          {linked[0].slipNo ?? "Draft slip"}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Belum ada</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-4">
                      <StatusBadge status={s.status} />
                    </TableCell>
                  </TableRow>
                )
              })
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
        pageSizeOptions={compact ? [5, 10, 20] : [10, 25, 50, 100]}
        itemName="SPPA"
      />

      {form ? (
        <SppaForm
          key={form.key}
          open
          onOpenChange={(open) => {
            if (!open) setForm(null)
          }}
          sppa={form.sppa}
          clientId={clientId}
          vehicleOptions={vehicleOptions}
        />
      ) : null}
    </div>
  )
}
