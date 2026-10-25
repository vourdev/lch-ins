"use client"

import * as React from "react"
import Link from "next/link"
import { CalendarClock, Printer } from "lucide-react"

import { useToday } from "@/components/layout/today-provider"
import { ACTION_COL_CLASS, RowActions } from "@/components/shared/row-actions"
import { StatusBadge, ToneBadge } from "@/components/shared/status-badge"
import { TableEmpty } from "@/components/shared/table-empty"
import {
  TablePagination,
  usePagination,
} from "@/components/shared/table-pagination"
import { ExportButtons } from "@/components/shared/table-toolbar"
import { Card } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
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
import {
  CLASSES_OF_BUSINESS,
  policyStatus,
  premiumIdr,
  type Policy,
} from "@/lib/data"
import { daysBetween } from "@/lib/date"
import type { ExportSpec } from "@/lib/export"
import { dateShort, rupiah } from "@/lib/format"
import {
  DEFAULT_RENEWAL_PERIOD,
  RENEWAL_PERIODS,
  renewalCandidates,
  renewalQuery,
} from "@/lib/renewal"
import { useCollection } from "@/lib/store"

const PERIOD_ITEMS = RENEWAL_PERIODS.map((d) => ({
  label: `${d} hari`,
  value: d,
}))
const COB_ITEMS = [
  { label: "Semua COB", value: "all" },
  ...CLASSES_OF_BUSINESS.map((c) => ({ label: c, value: c })),
]

export function RenewalNotice({
  initialPolicies,
  initialPeriod = DEFAULT_RENEWAL_PERIOD,
  initialCob = "all",
}: {
  initialPolicies?: Policy[]
  initialPeriod?: string
  initialCob?: string
}) {
  const today = useToday()
  const sessionPolicies = useCollection("policies")
  // Store baru berisi data database setelah Policy Database dibuka, jadi data server didahulukan.
  const policies = initialPolicies ?? sessionPolicies
  const [period, setPeriod] = React.useState(initialPeriod)
  const [cob, setCob] = React.useState(initialCob)

  const rows = React.useMemo(
    () => renewalCandidates(policies, today, Number(period), cob),
    [policies, period, cob, today]
  )
  const printParams = renewalQuery(period, cob)

  const {
    page,
    pageSize,
    totalItems,
    paginatedItems: paginatedRows,
    setPage,
    setPageSize,
  } = usePagination(rows, 10)

  const totalPremium = rows.reduce((a, p) => a + premiumIdr(p), 0)

  const exportSpec: ExportSpec<Policy> = {
    filename: "renewal-notice",
    sheet: "Renewal",
    rows,
    columns: [
      { header: "No. Polis", value: (p) => p.policyNo },
      { header: "Tertanggung", value: (p) => p.insuredName, width: 36 },
      { header: "COB", value: (p) => p.cob },
      { header: "Asuransi", value: (p) => p.insurer, width: 36 },
      { header: "Tanggal Berakhir", value: (p) => p.expiryDate, type: "date" },
      {
        header: "Sisa Hari",
        value: (p) => daysBetween(today, p.expiryDate),
        type: "number",
      },
      { header: "Mata Uang", value: (p) => p.currency },
      { header: "Premium", value: (p) => p.premium, type: "money" },
    ],
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <Field className="w-35">
          <FieldLabel>Jatuh tempo dalam</FieldLabel>
          <Select
            items={PERIOD_ITEMS}
            value={period}
            onValueChange={(v) => setPeriod(v as string)}
          >
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {PERIOD_ITEMS.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field className="w-45">
          <FieldLabel>Class of Business</FieldLabel>
          <Select
            items={COB_ITEMS}
            value={cob}
            onValueChange={(v) => setCob(v as string)}
          >
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {COB_ITEMS.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <ExportButtons
          className="ml-auto"
          spec={exportSpec}
          printHref={`/marketing/renewal?${printParams}`}
        />
      </div>

      <Card className="flex-row items-center gap-3 px-5 py-4">
        <CalendarClock className="size-5 shrink-0 text-primary" />
        <p className="text-sm">
          <span className="font-semibold">{rows.length} polis</span> jatuh tempo
          dalam {period} hari ke depan dengan total premium{" "}
          <span className="tabular font-semibold">{rupiah(totalPremium)}</span>.
        </p>
      </Card>

      <Card className="overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={ACTION_COL_CLASS}>
                <span className="sr-only">Aksi</span>
              </TableHead>
              <TableHead>No. Polis</TableHead>
              <TableHead>Nama Tertanggung</TableHead>
              <TableHead>COB</TableHead>
              <TableHead>Asuransi</TableHead>
              <TableHead>Tanggal Berakhir</TableHead>
              <TableHead className="text-right">Premium</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableEmpty
                colSpan={8}
                message="Tidak ada polis jatuh tempo pada periode ini"
              />
            ) : (
              paginatedRows.map((p) => {
                const days = daysBetween(today, p.expiryDate)
                return (
                  <TableRow key={p.id}>
                    <TableCell className={ACTION_COL_CLASS}>
                      <RowActions
                        actions={[
                          {
                            label: "Cetak surat pemberitahuan",
                            icon: Printer,
                            render: (
                              <Link
                                href={`/marketing/renewal/${p.id}?${printParams}`}
                              />
                            ),
                          },
                        ]}
                      />
                    </TableCell>
                    <TableCell className="tabular font-medium">
                      {p.policyNo}
                    </TableCell>
                    <TableCell className="max-w-55 truncate">
                      {p.insuredName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.cob}
                    </TableCell>
                    <TableCell className="max-w-55 truncate text-xs text-muted-foreground">
                      {p.insurer}
                    </TableCell>
                    <TableCell>
                      <span className="tabular">{dateShort(p.expiryDate)}</span>
                      <ToneBadge
                        tone={days <= 30 ? "warning" : "info"}
                        className="ml-2"
                      >
                        {days} hari
                      </ToneBadge>
                    </TableCell>
                    <TableCell className="tabular text-right font-medium">
                      {rupiah(premiumIdr(p))}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={policyStatus(p.expiryDate, today)} />
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
        itemName="polis"
      />
    </div>
  )
}
