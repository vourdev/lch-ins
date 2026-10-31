"use client"

import * as React from "react"
import { Lock, Pencil, Plus, Power, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  createLookupValueAction,
  deleteLookupValueAction,
  toggleLookupValueStatusAction,
  updateLookupValueAction,
} from "@/app/(app)/master-data/actions"
import {
  ACTION_COL_CLASS,
  RowActions,
  type RowAction,
} from "@/components/shared/row-actions"
import { StatusBadge } from "@/components/shared/status-badge"
import { TableEmpty } from "@/components/shared/table-empty"
import { TablePagination, usePagination } from "@/components/shared/table-pagination"
import { SearchInput } from "@/components/shared/table-toolbar"
import { usePermission } from "@/components/auth/permission-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { LookupValue } from "@/lib/generated/prisma/client"

export interface LookupValuesTabProps {
  initialLookups: LookupValue[]
  availableTypes: string[]
}

const TYPE_LABELS: Record<string, string> = {
  client_status: "Status Klien",
  client_type: "Tipe Klien",
  id_type: "Jenis Identitas",
  policy_type: "Tipe Polis",
  claim_status: "Status Klaim",
  claim_stage: "Tahapan Klaim",
  payment_type: "Jenis Pembayaran",
  bank: "Daftar Bank",
  construction_class: "Kelas Konstruksi Bangunan",
  rate_mode: "Satuan Tarif (Per mil / Persen)",
  form_variant: "Varian Form Slip",
  insurance_purpose: "Tujuan Asuransi",
  income_source: "Sumber Dana",
  address_type: "Jenis Alamat",
  client_document_type: "Jenis Dokumen Klien",
  security_role: "Posisi Co-Insurance (Leader / Member)",
  role: "Peran Pengguna (Role)",
  account_type: "Jenis Akun Perkiraan",
  payment_model: "Model Pembayaran Premi",
  placement_location: "Lokasi Penempatan",
  rate_line_kind: "Jenis Baris Rate",
  reset_period: "Periode Reset Penomoran",
}

export function LookupValuesTab({
  initialLookups,
  availableTypes,
}: LookupValuesTabProps) {
  const permission = usePermission()
  const canManage = permission.canManage("/master-data")
  const [selectedType, setSelectedType] = React.useState<string>(
    availableTypes[0] ?? "client_status"
  )
  const [lookups, setLookups] = React.useState<LookupValue[]>(initialLookups)
  const [query, setQuery] = React.useState("")
  const [isPending, startTransition] = React.useTransition()
  const categoryItems = availableTypes.map((t) => ({
    label: TYPE_LABELS[t] ?? t,
    value: t,
  }))

  // Modal State
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingLookup, setEditingLookup] = React.useState<LookupValue | null>(null)
  const [code, setCode] = React.useState("")
  const [name, setName] = React.useState("")
  const [sortOrder, setSortOrder] = React.useState(0)
  const [isActive, setIsActive] = React.useState(true)

  const [prevLookups, setPrevLookups] = React.useState(initialLookups)
  if (prevLookups !== initialLookups) {
    setPrevLookups(initialLookups)
    setLookups(initialLookups)
  }

  const filteredLookups = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return lookups
      .filter((l) => l.lookupType === selectedType)
      .filter(
        (l) =>
          !q ||
          l.code.toLowerCase().includes(q) ||
          l.name.toLowerCase().includes(q)
      )
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [lookups, selectedType, query])

  const {
    page,
    pageSize,
    totalItems,
    paginatedItems,
    setPage,
    setPageSize,
  } = usePagination(filteredLookups, 10)

  function openAddDialog() {
    setEditingLookup(null)
    setCode("")
    setName("")
    const currentMaxSort = filteredLookups.reduce((max, l) => Math.max(max, l.sortOrder), 0)
    setSortOrder(currentMaxSort + 1)
    setIsActive(true)
    setDialogOpen(true)
  }

  function openEditDialog(lookup: LookupValue) {
    setEditingLookup(lookup)
    setCode(lookup.code)
    setName(lookup.name)
    setSortOrder(lookup.sortOrder)
    setIsActive(lookup.isActive)
    setDialogOpen(true)
  }

  function handleSave() {
    if (!name.trim() || (!editingLookup && !code.trim())) {
      toast.error("Kode dan nama nilai pilihan wajib diisi")
      return
    }

    startTransition(async () => {
      if (editingLookup) {
        const res = await updateLookupValueAction(editingLookup.id, {
          lookupType: selectedType,
          code: editingLookup.isSystem ? editingLookup.code : code,
          name,
          sortOrder,
          isActive,
        })
        if (!res.ok) {
          toast.error(res.error)
          return
        }
        toast.success("Nilai pilihan berhasil diperbarui")
        setLookups((prev) =>
          prev.map((l) =>
            l.id === editingLookup.id
              ? {
                  ...l,
                  name,
                  sortOrder,
                  isActive,
                  code: editingLookup.isSystem ? editingLookup.code : code,
                }
              : l
          )
        )
      } else {
        const res = await createLookupValueAction({
          lookupType: selectedType,
          code,
          name,
          sortOrder,
          isSystem: false,
          isActive,
        })
        if (!res.ok || !res.data) {
          toast.error(res.error)
          return
        }
        toast.success("Nilai pilihan baru berhasil ditambahkan")
        setLookups((prev) => [...prev, res.data as LookupValue])
      }
      setDialogOpen(false)
    })
  }

  function handleToggleStatus(id: string, current: boolean) {
    const next = !current
    startTransition(async () => {
      const res = await toggleLookupValueStatusAction(id, next)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setLookups((prev) => prev.map((l) => (l.id === id ? { ...l, isActive: next } : l)))
      toast.success(next ? "Pilihan diaktifkan" : "Pilihan dinonaktifkan")
    })
  }

  function handleDelete(lookup: LookupValue) {
    if (lookup.isSystem) {
      toast.error("Nilai pilihan sistem dilindungi dan tidak dapat dihapus.")
      return
    }

    startTransition(async () => {
      const res = await deleteLookupValueAction(lookup.id)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setLookups((prev) => prev.filter((l) => l.id !== lookup.id))
      toast.success("Nilai pilihan berhasil dihapus")
    })
  }

  function actionsFor(lookup: LookupValue): RowAction[] {
    return [
      { label: "Edit label", icon: Pencil, onSelect: () => openEditDialog(lookup) },
      {
        label: lookup.isActive ? "Nonaktifkan" : "Aktifkan",
        icon: Power,
        disabled: isPending,
        onSelect: () => handleToggleStatus(lookup.id, lookup.isActive),
      },
      {
        label: lookup.isSystem ? "Hapus (entri sistem)" : "Hapus",
        icon: Trash2,
        destructive: true,
        disabled: isPending || lookup.isSystem,
        confirm: {
          title: "Hapus nilai pilihan ini?",
          description: `"${lookup.name}" dihapus permanen dari kategori ini.`,
          actionLabel: "Hapus",
        },
        onSelect: () => handleDelete(lookup),
      },
    ]
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            items={categoryItems}
            value={selectedType}
            onValueChange={(val) => setSelectedType(val ?? "client_status")}
          >
            <SelectTrigger size="sm" className="w-60" aria-label="Kategori pilihan">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {categoryItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <SearchInput
            value={query}
            onValueChange={setQuery}
            placeholder="Cari kode atau label…"
          />
        </div>

        {canManage && (
          <Button onClick={openAddDialog}>
            <Plus data-icon="inline-start" />
            Tambah Pilihan Baru
          </Button>
        )}
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <Table className="min-w-200">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {canManage && <TableHead className={ACTION_COL_CLASS}>Aksi</TableHead>}
              <TableHead className="w-16 text-center">Urutan</TableHead>
              <TableHead className="w-48">Kode Sistem</TableHead>
              <TableHead>Label Pilihan Dropdown</TableHead>
              <TableHead className="w-32">Tipe Entri</TableHead>
              <TableHead className="w-28 pr-4">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLookups.length === 0 ? (
              <TableEmpty
                colSpan={canManage ? 6 : 5}
                message={
                  query
                    ? "Tidak ada nilai pilihan yang cocok dengan pencarian."
                    : "Belum ada nilai pilihan untuk kategori ini."
                }
              />
            ) : (
              paginatedItems.map((lookup) => (
                <TableRow key={lookup.id}>
                  {canManage && (
                    <TableCell className={ACTION_COL_CLASS}>
                      <RowActions actions={actionsFor(lookup)} />
                    </TableCell>
                  )}
                  <TableCell className="text-center font-mono text-muted-foreground">
                    {lookup.sortOrder}
                  </TableCell>
                  <TableCell className="font-mono font-semibold text-foreground">
                    {lookup.code}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{lookup.name}</TableCell>
                  <TableCell>
                    {lookup.isSystem ? (
                      <Badge
                        variant="secondary"
                        className="gap-1 font-normal text-muted-foreground"
                      >
                        <Lock className="size-3" />
                        Sistem
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="font-normal">
                        Kustom
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="pr-4">
                    <StatusBadge status={lookup.isActive ? "Active" : "Inactive"} />
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
        itemName="pilihan"
      />

      {/* Modal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingLookup ? "Edit Nilai Pilihan" : "Tambah Nilai Pilihan Baru"}
            </DialogTitle>
            <DialogDescription>
              Kategori: <strong>{TYPE_LABELS[selectedType] ?? selectedType}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lookup-code">
                Kode Sistem <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lookup-code"
                placeholder="Contoh: Active, Korporasi, IDR"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={Boolean(editingLookup?.isSystem)}
                className="font-mono"
              />
              {editingLookup?.isSystem && (
                <p className="text-[11px] text-muted-foreground italic">
                  Kode entri sistem dilindungi karena digunakan langsung oleh logika program.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lookup-name">
                Label Tampilan Dropdown <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lookup-name"
                placeholder="Contoh: Aktif, Korporasi / Badan Usaha"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lookup-sort">
                Urutan Tampil (Sort Order)
              </Label>
              <Input
                id="lookup-sort"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={sortOrder}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, "")
                  setSortOrder(cleaned === "" ? 0 : Math.max(0, parseInt(cleaned, 10)))
                }}
                className="font-mono"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-2.5">
              <span className="text-sm font-medium">Status Aktif di Dropdown</span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isPending}
            >
              {editingLookup ? "Simpan Perubahan" : "Simpan Pilihan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
