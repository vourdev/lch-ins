"use client"

import * as React from "react"
import Link from "next/link"
import { Ban, Eye, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  deleteClientAction,
  toggleClientStatusAction,
} from "@/app/(app)/marketing/actions"
import {
  ACTION_COL_CLASS,
  RowActions,
  type RowAction,
} from "@/components/shared/row-actions"
import { StatusBadge, ToneBadge } from "@/components/shared/status-badge"
import { TableEmpty } from "@/components/shared/table-empty"
import { TablePagination, usePagination } from "@/components/shared/table-pagination"
import { ExportButtons, SearchInput } from "@/components/shared/table-toolbar"
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
import {
  CLASSES_OF_BUSINESS,
  CLIENT_STATUSES,
  kycMissing,
  type Client,
} from "@/lib/data"
import type { ExportSpec } from "@/lib/export"
import { maskEmail, maskMiddle } from "@/lib/format"
import { store, useCollection } from "@/lib/store"

const COB_ITEMS = [
  { label: "Semua COB", value: "all" },
  ...CLASSES_OF_BUSINESS.map((c) => ({ label: c, value: c })),
]
const STATUS_ITEMS = [
  { label: "Semua status", value: "all" },
  ...CLIENT_STATUSES.map((s) => ({ label: s, value: s })),
]

interface ClientTableProps {
  onEdit: (client: Client) => void
  initialClients?: Client[]
}

export function ClientTable({ onEdit, initialClients }: ClientTableProps) {
  React.useEffect(() => {
    if (initialClients && initialClients.length > 0) {
      for (const c of initialClients) {
        store.upsert("clients", c)
      }
    }
  }, [initialClients])

  const clients = useCollection("clients")
  const slips = useCollection("slips")
  const policies = useCollection("policies")
  const sppa = useCollection("sppa")
  const [query, setQuery] = React.useState("")
  const [cob, setCob] = React.useState("all")
  const [status, setStatus] = React.useState("all")

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return clients.filter((c) => {
      if (cob !== "all" && c.cob !== cob) return false
      if (status !== "all" && c.status !== status) return false
      if (!q) return true
      return [c.name, c.contactPerson, c.email, c.phone, c.npwp].some((v) =>
        (v ?? "").toLowerCase().includes(q)
      )
    })
  }, [clients, query, cob, status])

  const {
    page,
    pageSize,
    totalItems,
    paginatedItems: paginatedRows,
    setPage,
    setPageSize,
  } = usePagination(rows, 10)

  function actionsFor(c: Client): RowAction[] {
    // Klien yang sudah dipakai dokumen tidak dihapus, cukup dinonaktifkan (ERD).
    const used =
      Boolean((c as any).isUsedInDocuments) ||
      slips.some((s) => s.clientId === c.id) ||
      policies.some((p) => p.clientId === c.id) ||
      sppa.some((s) => s.clientId === c.id)

    const actions: RowAction[] = [
      {
        label: "Lihat detail",
        icon: Eye,
        render: <Link href={`/marketing/clients/${c.id}`} />,
      },
      { label: "Edit klien", icon: Pencil, onSelect: () => onEdit(c) },
    ]

    if (used) {
      actions.push({
        label: c.status === "Inactive" ? "Sudah nonaktif" : "Nonaktifkan",
        icon: Ban,
        destructive: true,
        disabled: c.status === "Inactive",
        confirm: {
          title: `Nonaktifkan ${c.name}?`,
          description:
            "Klien ini sudah dipakai di SPPA, slip, atau polis, jadi tidak dihapus. Statusnya diubah menjadi Inactive dan tetap tampil di dokumen lama.",
          actionLabel: "Nonaktifkan",
        },
        onSelect: async () => {
          const res = await toggleClientStatusAction(c.id, "Inactive")
          if (!res.ok) {
            toast.error(res.error || "Gagal menonaktifkan klien.")
            return
          }
          store.update("clients", c.id, { status: "Inactive" })
          toast.success("Klien dinonaktifkan", { description: c.name })
        },
      })
    } else {
      actions.push({
        label: "Hapus klien",
        icon: Trash2,
        destructive: true,
        confirm: {
          title: `Hapus ${c.name}?`,
          description:
            "Data klien beserta alamat dan berkas KYC-nya dihapus permanen dari database.",
          actionLabel: "Hapus",
        },
        onSelect: async () => {
          const res = await deleteClientAction(c.id)
          if (!res.ok) {
            toast.error(res.error || "Gagal menghapus klien.")
            return
          }
          store.remove("clients", c.id)
          toast.success("Klien dihapus", { description: c.name })
        },
      })
    }
    return actions
  }

  const exportSpec: ExportSpec<Client> = {
    filename: "klien-lch",
    sheet: "Klien",
    rows,
    columns: [
      { header: "Nama", value: (c) => c.name, width: 36 },
      { header: "Tipe", value: (c) => c.clientType },
      { header: "PIC", value: (c) => c.contactPerson },
      { header: "Email", value: (c) => c.email, width: 30 },
      { header: "Telepon", value: (c) => c.phone },
      { header: "NPWP", value: (c) => c.npwp },
      { header: "COB Utama", value: (c) => c.cob },
      { header: "Status", value: (c) => c.status },
      { header: "Tanggal KYC", value: (c) => c.kycDate, type: "date" },
      {
        header: "KYC Kurang",
        value: (c) => kycMissing(c).join(", "),
        width: 40,
      },
    ],
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="no-print flex flex-wrap items-center gap-2">
        <SearchInput
          value={query}
          onValueChange={setQuery}
          placeholder="Cari nama klien, kontak, email, nomor telepon, NPWP…"
        />
        <Select
          items={COB_ITEMS}
          value={cob}
          onValueChange={(v) => setCob(v as string)}
        >
          <SelectTrigger size="sm" className="w-42">
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
              <TableHead>Nama Klien</TableHead>
              <TableHead>Kontak &amp; PIC</TableHead>
              <TableHead>COB Utama</TableHead>
              <TableHead>Kelengkapan KYC</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-4">Alamat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableEmpty
                colSpan={7}
                message="Tidak ada data klien yang cocok"
              />
            ) : (
              paginatedRows.map((c) => {
                const missing = kycMissing(c)
                const primaryAddress =
                  c.addresses.find((a) => a.isPrimary) ?? c.addresses[0]
                return (
                  <TableRow key={c.id}>
                    <TableCell className={ACTION_COL_CLASS}>
                      <RowActions actions={actionsFor(c)} />
                    </TableCell>
                    <TableCell className="max-w-60">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/marketing/clients/${c.id}`}
                          className="truncate font-medium hover:underline text-foreground"
                        >
                          {c.name}
                        </Link>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          ({c.clientType})
                        </span>
                      </div>
                      {c.npwp ? (
                        <p className="tabular truncate text-xs text-muted-foreground">
                          NPWP {c.npwp}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-55">
                      <p className="truncate font-medium">{c.contactPerson}</p>
                      <p className="tabular truncate text-xs text-muted-foreground">
                        {[
                          c.phone ? maskMiddle(c.phone) : undefined,
                          c.email ? maskEmail(c.email) : undefined,
                        ]
                          .filter(Boolean)
                          .join(" • ") || "—"}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-40">
                      <span className="text-xs font-medium">{c.cob}</span>
                    </TableCell>
                    <TableCell className="max-w-50">
                      {missing.length === 0 ? (
                        <ToneBadge tone="success">Lengkap</ToneBadge>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <ToneBadge tone="warning">
                            Kurang {missing.length} data
                          </ToneBadge>
                          <span
                            className="truncate text-[11px] text-muted-foreground"
                            title={missing.join(", ")}
                          >
                            {missing.join(", ")}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="max-w-60 pr-4">
                      {primaryAddress ? (
                        <div className="flex flex-col">
                          <span className="truncate text-xs">
                            {primaryAddress.value}
                          </span>
                          {c.addresses.length > 1 ? (
                            <span className="text-[11px] text-muted-foreground">
                              +{c.addresses.length - 1} alamat lain
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
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
        itemName="klien"
      />
    </div>
  )
}
