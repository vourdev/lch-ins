"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Eye, Pencil, Plus } from "lucide-react"

import { usePermission } from "@/components/auth/permission-provider"
import { PageHeader } from "@/components/layout/page-header"
import {
  ACTION_COL_CLASS,
  RowActions,
  type RowAction,
} from "@/components/shared/row-actions"
import { TableEmpty } from "@/components/shared/table-empty"
import { TablePagination } from "@/components/shared/table-pagination"
import { SearchInput } from "@/components/shared/table-toolbar"
import { Badge } from "@/components/ui/badge"
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
import { wordingText } from "@/lib/data"
import type { ClauseListItem } from "@/lib/server/clauses"

const ALL = "all"

export interface MasterClausesProps {
  result: {
    items: ClauseListItem[]
    total: number
    page: number
    pageSize: number
    pageCount: number
  }
  groups: string[]
  cobs: { id: string; name: string; code: string }[]
  filter: { query: string; sourceGroup: string; cobId: string; page: number }
  canManage?: boolean
}

export function MasterClauses({
  result,
  groups,
  cobs,
  filter,
  canManage,
}: MasterClausesProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const permission = usePermission()
  const canManageEffective =
    canManage ?? permission.canManage("/underwriting/master-clauses")
  const [query, setQuery] = React.useState(filter.query)

  /** Filter disimpan di URL supaya hasil pencarian bisa dibagikan dan di-back. */
  const push = React.useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(searchParams.toString())
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v)
        else next.delete(k)
      }
      // Mengganti filter selalu balik ke halaman pertama.
      if (!("page" in patch)) next.delete("page")
      router.push(next.size ? `${pathname}?${next}` : pathname)
    },
    [pathname, router, searchParams]
  )

  // Ketikan ditunda sebentar supaya tidak memukul database tiap huruf.
  React.useEffect(() => {
    if (query === filter.query) return
    const t = setTimeout(() => push({ q: query }), 350)
    return () => clearTimeout(t)
  }, [query, filter.query, push])

  const groupItems = [
    { label: "Semua kelompok", value: ALL },
    ...groups.map((g) => ({ label: g, value: g })),
  ]
  const cobItems = [
    { label: "Semua class", value: ALL },
    ...cobs.map((c) => ({ label: c.name, value: c.id })),
  ]

  function actionsFor(c: ClauseListItem): RowAction[] {
    const href = `/underwriting/master-clauses/${c.id}`
    return [
      canManageEffective
        ? { label: "Edit clause", icon: Pencil, render: <Link href={href} /> }
        : { label: "Lihat detail", icon: Eye, render: <Link href={href} /> },
    ]
  }

  return (
    <>
      <PageHeader
        title="Master Clauses"
        description="Pustaka klausula LCH, dipakai saat menyusun placing slip"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={query}
            onValueChange={setQuery}
            placeholder="Cari judul atau isi wording…"
          />

          <Select
            items={groupItems}
            value={filter.sourceGroup || ALL}
            onValueChange={(v) => push({ group: v === ALL ? "" : (v as string) })}
          >
            <SelectTrigger size="sm" className="w-[170px]" aria-label="Filter kelompok">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {groupItems.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select
            items={cobItems}
            value={filter.cobId || ALL}
            onValueChange={(v) => push({ cob: v === ALL ? "" : (v as string) })}
          >
            <SelectTrigger size="sm" className="w-[190px]" aria-label="Filter class of business">
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
        </div>

        {canManageEffective ? (
          <Button
            render={<Link href="/underwriting/master-clauses/new" />}
            nativeButton={false}
          >
            <Plus data-icon="inline-start" />
            Tambah Clause
          </Button>
        ) : null}
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <Table className="min-w-200">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={ACTION_COL_CLASS}>Aksi</TableHead>
              <TableHead>Clause</TableHead>
              <TableHead className="w-40">Kelompok</TableHead>
              <TableHead className="w-44">Class of Business</TableHead>
              <TableHead className="w-56 pr-4">Type of Cover</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.length === 0 ? (
              <TableEmpty
                colSpan={5}
                message="Tidak ada clause. Ubah kata kunci atau filter di atas."
              />
            ) : (
              result.items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className={ACTION_COL_CLASS}>
                    <RowActions actions={actionsFor(c)} />
                  </TableCell>
                  <TableCell className="max-w-120 whitespace-normal">
                    <p className="font-medium">{c.title}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {wordingText(c.wordingHtml)}
                    </p>
                  </TableCell>
                  <TableCell>
                    {c.sourceGroup ? (
                      <Badge variant="secondary">{c.sourceGroup}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {c.cobName ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="max-w-56 truncate pr-4">
                    {c.coverTypeName ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <TablePagination
        page={result.page}
        pageSize={result.pageSize}
        totalItems={result.total}
        onPageChange={(p) => push({ page: String(p) })}
        itemName="clause"
      />
    </>
  )
}
