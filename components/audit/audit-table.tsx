"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Eye, Layers, RotateCcw } from "lucide-react"

import { exportAuditLogsAction } from "@/app/(app)/audit-trail/actions"
import { AuditDiffDialog } from "@/components/audit/audit-diff-dialog"
import {
  ACTION_LABELS,
  actionLabel,
  changeSummary,
  entityLabel,
} from "@/components/audit/audit-fields"
import { AUDIT_PAGE_SIZES, type AuditFilter } from "@/components/audit/audit-filter"
import { StatusBadge } from "@/components/shared/status-badge"
import { TableEmpty } from "@/components/shared/table-empty"
import { TablePagination } from "@/components/shared/table-pagination"
import { ExportButtons, SearchInput } from "@/components/shared/table-toolbar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
import type { ExportSpec } from "@/lib/export"
import type { AuditLogRecord, ListAuditLogsResult } from "@/lib/server/audit"

export interface AuditTableProps {
  result: ListAuditLogsResult
  filter: AuditFilter
  availableEntities: string[]
  users: { id: string; name: string }[]
}

const ALL = "all"

const ACTION_OPTIONS = [
  { label: "Semua Aksi", value: ALL },
  ...Object.entries(ACTION_LABELS).map(([value, label]) => ({ label, value })),
]

export function AuditTable({
  result,
  filter,
  availableEntities,
  users,
}: AuditTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [query, setQuery] = React.useState(filter.search)
  const [selectedLog, setSelectedLog] = React.useState<AuditLogRecord | null>(null)

  const entityOptions = [
    { label: "Semua Modul", value: ALL },
    ...availableEntities.map((ent) => ({ label: entityLabel(ent), value: ent })),
  ]
  const userOptions = [
    { label: "Semua Pengguna", value: ALL },
    ...users.map((u) => ({ label: u.name, value: u.id })),
  ]

  /** Filters live in the URL so the server can query the full log table. */
  const push = React.useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(searchParams.toString())
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v)
        else next.delete(k)
      }
      // A new filter always starts from the first page.
      if (!("page" in patch)) next.delete("page")
      router.push(next.size ? `${pathname}?${next}` : pathname)
    },
    [pathname, router, searchParams]
  )

  React.useEffect(() => {
    if (query === filter.search) return
    const t = setTimeout(() => push({ q: query }), 350)
    return () => clearTimeout(t)
  }, [query, filter.search, push])

  function resetFilters() {
    setQuery("")
    router.push(pathname)
  }

  const hasActiveFilters =
    Boolean(filter.search) ||
    Boolean(filter.action) ||
    Boolean(filter.entity) ||
    Boolean(filter.userId) ||
    Boolean(filter.startDate) ||
    Boolean(filter.endDate)

  const exportSpec: ExportSpec<AuditLogRecord> = {
    filename: "audit-trail-lch",
    sheet: "AuditTrail",
    rows: result.items,
    loadRows: async () => {
      const { search, action, entity, userId, startDate, endDate } = filter
      const res = await exportAuditLogsAction({
        search,
        action,
        entity,
        userId,
        startDate,
        endDate,
      })
      if (!res.ok) throw new Error(res.error)
      return res.data
    },
    columns: [
      {
        header: "Waktu",
        value: (l) =>
          new Date(l.createdAt).toLocaleString("id-ID", {
            dateStyle: "short",
            timeStyle: "medium",
          }),
      },
      { header: "Pengguna", value: (l) => `${l.userName} (${l.userEmail})` },
      { header: "Jabatan", value: (l) => l.userJobTitle ?? "—" },
      { header: "Aksi", value: (l) => actionLabel(l.action) },
      { header: "Modul", value: (l) => entityLabel(l.entity) },
      { header: "Data", value: (l) => l.entityLabel ?? "—" },
      { header: "Perubahan", value: (l) => changeSummary(l) },
    ],
  }


  return (
    <div className="flex flex-col gap-4">
      <div className="no-print flex flex-col gap-3 rounded-lg border bg-card p-3.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <SearchInput
            value={query}
            onValueChange={setQuery}
            placeholder="Cari pengguna atau modul…"
            className="w-full sm:max-w-xs"
          />

          <div className="flex flex-wrap items-center gap-2">
            <ExportButtons spec={exportSpec} />
            {hasActiveFilters ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="size-3.5 mr-1" />
                Reset Filter
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <Select
            items={ACTION_OPTIONS}
            value={filter.action ?? ALL}
            onValueChange={(v) => push({ action: v === ALL ? "" : (v ?? "") })}
          >
            <SelectTrigger size="sm" className="w-37" aria-label="Filter aksi">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {ACTION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select
            items={entityOptions}
            value={filter.entity || ALL}
            onValueChange={(v) => push({ entity: v === ALL ? "" : (v ?? "") })}
          >
            <SelectTrigger size="sm" className="w-42" aria-label="Filter modul">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {entityOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select
            items={userOptions}
            value={filter.userId || ALL}
            onValueChange={(v) => push({ user: v === ALL ? "" : (v ?? "") })}
          >
            <SelectTrigger size="sm" className="w-42" aria-label="Filter pengguna">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {userOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              value={filter.startDate}
              onChange={(e) => push({ from: e.target.value })}
              aria-label="Dari tanggal"
              className="h-8 w-38"
            />
            <span className="text-muted-foreground" aria-hidden="true">
              –
            </span>
            <Input
              type="date"
              value={filter.endDate}
              onChange={(e) => push({ to: e.target.value })}
              aria-label="Sampai tanggal"
              className="h-8 w-38"
            />
          </div>

          <span className="ml-auto text-xs text-muted-foreground font-medium">
            {result.total} log ditemukan
          </span>
        </div>
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <Table className="min-w-200">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-40">Waktu</TableHead>
              <TableHead className="w-52">Pengguna</TableHead>
              <TableHead className="w-24">Aksi</TableHead>
              <TableHead className="w-36">Modul</TableHead>
              <TableHead className="w-48">Data</TableHead>
              <TableHead>Perubahan</TableHead>
              <TableHead className="w-24 text-right pr-4">Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.length === 0 ? (
              <TableEmpty
                colSpan={7}
                message={
                  hasActiveFilters
                    ? "Tidak ada catatan audit yang cocok dengan filter."
                    : "Belum ada catatan aktivitas di sistem."
                }
              />
            ) : (
              result.items.map((log) => {
                return (
                  <TableRow key={log.id} className="text-xs">
                    <TableCell className="tabular text-muted-foreground font-mono">
                      {new Date(log.createdAt).toLocaleString("id-ID", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-foreground truncate max-w-48">
                        {log.userName}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate max-w-48">
                        {log.userEmail}
                      </p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={log.action} />
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 rounded bg-secondary/80 px-1.5 py-0.5 text-[11px] font-medium text-secondary-foreground">
                        <Layers className="size-3 shrink-0" />
                        <span className="truncate max-w-28">{entityLabel(log.entity)}</span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <p
                        className="truncate max-w-44 font-medium text-foreground"
                        title={log.entityLabel ?? undefined}
                      >
                        {log.entityLabel ?? "—"}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-64">
                      <p className="truncate text-muted-foreground" title={changeSummary(log)}>
                        {changeSummary(log)}
                      </p>
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                        className="h-7 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
                      >
                        <Eye className="size-3.5 mr-1" />
                        Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <TablePagination
        page={result.page}
        pageSize={result.pageSize}
        totalItems={result.total}
        onPageChange={(p) => push({ page: String(p) })}
        onPageSizeChange={(s) => push({ size: String(s) })}
        pageSizeOptions={AUDIT_PAGE_SIZES}
        itemName="Log Audit"
      />

      {selectedLog ? (
        <AuditDiffDialog
          log={selectedLog}
          open={Boolean(selectedLog)}
          onOpenChange={(open) => {
            if (!open) setSelectedLog(null)
          }}
        />
      ) : null}
    </div>
  )
}
