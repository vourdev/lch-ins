"use client"

import * as React from "react"
import { Eye, Layers, RotateCcw } from "lucide-react"

import { AuditDiffDialog } from "@/components/audit/audit-diff-dialog"
import {
  ACTION_LABELS,
  actionLabel,
  changeSummary,
  entityLabel,
  fieldLabel,
  visibleChangeKeys,
} from "@/components/audit/audit-fields"
import { StatusBadge } from "@/components/shared/status-badge"
import { TableEmpty } from "@/components/shared/table-empty"
import { TablePagination, usePagination } from "@/components/shared/table-pagination"
import { ExportButtons, SearchInput } from "@/components/shared/table-toolbar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
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
import type { AuditLogRecord } from "@/lib/server/audit"

export interface AuditTableProps {
  initialLogs: AuditLogRecord[]
  availableEntities?: string[]
}

const ACTION_OPTIONS = [
  { label: "Semua Aksi", value: "all" },
  ...Object.entries(ACTION_LABELS).map(([value, label]) => ({ label, value })),
]

export function AuditTable({
  initialLogs,
  availableEntities = [],
}: AuditTableProps) {
  const [query, setQuery] = React.useState("")
  const [actionFilter, setActionFilter] = React.useState("all")
  const [entityFilter, setEntityFilter] = React.useState("all")
  const [startDate, setStartDate] = React.useState("")
  const [endDate, setEndDate] = React.useState("")
  const [selectedLog, setSelectedLog] = React.useState<AuditLogRecord | null>(null)

  const entityOptions = React.useMemo(() => {
    const list = Array.from(
      new Set([...availableEntities, ...initialLogs.map((l) => l.entity)])
    ).filter(Boolean)
    return [
      { label: "Semua Modul", value: "all" },
      ...list.map((ent) => ({
        label: entityLabel(ent),
        value: ent,
      })),
    ]
  }, [availableEntities, initialLogs])

  const filteredLogs = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return initialLogs.filter((log) => {
      if (actionFilter !== "all" && log.action !== actionFilter) {
        return false
      }
      if (
        entityFilter !== "all" &&
        log.entity.toLowerCase() !== entityFilter.toLowerCase()
      ) {
        return false
      }
      if (startDate) {
        const logDate = log.createdAt.slice(0, 10)
        if (logDate < startDate) return false
      }
      if (endDate) {
        const logDate = log.createdAt.slice(0, 10)
        if (logDate > endDate) return false
      }
      if (!q) return true

      return [
        log.userName,
        log.userEmail,
        log.userJobTitle,
        log.entityLabel,
        entityLabel(log.entity),
        ...visibleChangeKeys(log).map(fieldLabel),
      ].some((text) => text?.toLowerCase().includes(q))
    })
  }, [initialLogs, query, actionFilter, entityFilter, startDate, endDate])

  const {
    page,
    pageSize,
    totalItems,
    paginatedItems: paginatedRows,
    setPage,
    setPageSize,
  } = usePagination(filteredLogs, 15)

  function resetFilters() {
    setQuery("")
    setActionFilter("all")
    setEntityFilter("all")
    setStartDate("")
    setEndDate("")
  }

  const hasActiveFilters =
    Boolean(query) ||
    actionFilter !== "all" ||
    entityFilter !== "all" ||
    Boolean(startDate) ||
    Boolean(endDate)

  const exportSpec: ExportSpec<AuditLogRecord> = {
    filename: "audit-trail-lch",
    sheet: "AuditTrail",
    rows: filteredLogs,
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
            placeholder="Cari pengguna, data, atau perubahan…"
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

        <div className="flex flex-wrap items-center gap-2.5 pt-1 border-t text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground font-medium">Aksi:</span>
            <Select
              items={ACTION_OPTIONS}
              value={actionFilter}
              onValueChange={(val) => setActionFilter(val ?? "all")}
            >
              <SelectTrigger className="h-8 w-37 text-xs">
                <SelectValue placeholder="Pilih aksi" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground font-medium">Modul:</span>
            <Select
              items={entityOptions}
              value={entityFilter}
              onValueChange={(val) => setEntityFilter(val ?? "all")}
            >
              <SelectTrigger className="h-8 w-42 text-xs">
                <SelectValue placeholder="Pilih modul" />
              </SelectTrigger>
              <SelectContent>
                {entityOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground font-medium">Dari:</span>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="YYYY-MM-DD"
              className="h-8 w-35 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground font-medium">Sampai:</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="YYYY-MM-DD"
              className="h-8 w-35 text-xs"
            />
          </div>

          <span className="ml-auto text-xs text-muted-foreground font-medium">
            {totalItems} log ditemukan
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
            {filteredLogs.length === 0 ? (
              <TableEmpty
                colSpan={7}
                message={
                  hasActiveFilters
                    ? "Tidak ada catatan audit yang cocok dengan filter."
                    : "Belum ada catatan aktivitas di sistem."
                }
              />
            ) : (
              paginatedRows.map((log) => {
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
        page={page}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[15, 30, 50, 100]}
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
