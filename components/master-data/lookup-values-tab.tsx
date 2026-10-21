"use client"

import * as React from "react"
import { Edit2, Lock, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  createLookupValueAction,
  deleteLookupValueAction,
  toggleLookupValueStatusAction,
  updateLookupValueAction,
} from "@/app/(app)/master-data/actions"
import { StatusBadge } from "@/components/shared/status-badge"
import { TableEmpty } from "@/components/shared/table-empty"
import { SearchInput } from "@/components/shared/table-toolbar"
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
}

export function LookupValuesTab({
  initialLookups,
  availableTypes,
}: LookupValuesTabProps) {
  const [selectedType, setSelectedType] = React.useState<string>(
    availableTypes[0] ?? "client_status"
  )
  const [lookups, setLookups] = React.useState<LookupValue[]>(initialLookups)
  const [query, setQuery] = React.useState("")
  const [isPending, startTransition] = React.useTransition()

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

    if (!confirm(`Hapus nilai pilihan "${lookup.name}"?`)) return

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

  return (
    <div className="flex flex-col gap-4">
      {/* Category selector & Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3.5 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
              Kategori Pilihan:
            </span>
            <Select value={selectedType} onValueChange={(val) => setSelectedType(val ?? "client_status")}>
              <SelectTrigger className="h-8.5 w-60 text-xs font-medium">
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                {availableTypes.map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">
                    {TYPE_LABELS[t] ?? t} ({t})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <SearchInput
            value={query}
            onValueChange={setQuery}
            placeholder="Cari kode atau label…"
            className="w-full sm:max-w-xs"
          />
        </div>

        <Button size="sm" onClick={openAddDialog} className="h-9 gap-1.5 text-xs">
          <Plus className="size-4" />
          Tambah Pilihan Baru
        </Button>
      </div>

      {/* Table */}
      <Card className="gap-0 overflow-hidden py-0">
        <Table className="min-w-200">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-16 text-center">Urutan</TableHead>
              <TableHead className="w-48">Kode Sistem</TableHead>
              <TableHead>Label Pilihan Dropdown</TableHead>
              <TableHead className="w-32">Tipe Entri</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-28 text-right pr-4">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLookups.length === 0 ? (
              <TableEmpty
                colSpan={6}
                message={
                  query
                    ? "Tidak ada nilai pilihan yang cocok dengan pencarian."
                    : "Belum ada nilai pilihan untuk kategori ini."
                }
              />
            ) : (
              filteredLookups.map((lookup) => (
                <TableRow key={lookup.id} className="text-xs hover:bg-muted/40 transition-colors">
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
                        className="gap-1 text-[11px] font-normal text-muted-foreground"
                      >
                        <Lock className="size-3" />
                        Sistem
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[11px] font-normal">
                        Kustom
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={lookup.isActive ? "Active" : "Inactive"} />
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(lookup)}
                        className="size-7 text-muted-foreground hover:text-foreground"
                        title="Edit label pilihan"
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Switch
                        checked={lookup.isActive}
                        onCheckedChange={() => handleToggleStatus(lookup.id, lookup.isActive)}
                        disabled={isPending}
                        className="scale-75"
                        title={lookup.isActive ? "Nonaktifkan pilihan" : "Aktifkan pilihan"}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(lookup)}
                        disabled={isPending || lookup.isSystem}
                        className="size-7 text-destructive hover:bg-destructive/10"
                        title={
                          lookup.isSystem
                            ? "Entri sistem dilindungi dan tidak dapat dihapus"
                            : "Hapus pilihan kustom"
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Modal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingLookup ? "Edit Nilai Pilihan" : "Tambah Nilai Pilihan Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Kategori: <strong>{TYPE_LABELS[selectedType] ?? selectedType}</strong> (
              {selectedType})
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2 text-xs">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lookup-code" className="text-xs font-medium">
                Kode Sistem <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lookup-code"
                placeholder="Contoh: Active, Korporasi, IDR"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={Boolean(editingLookup?.isSystem)}
                className="h-8.5 font-mono text-xs"
              />
              {editingLookup?.isSystem && (
                <p className="text-[11px] text-muted-foreground italic">
                  Kode entri sistem dilindungi karena digunakan langsung oleh logika program.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lookup-name" className="text-xs font-medium">
                Label Tampilan Dropdown <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lookup-name"
                placeholder="Contoh: Aktif, Korporasi / Badan Usaha"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8.5 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lookup-sort" className="text-xs font-medium">
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
                className="h-8.5 font-mono text-xs"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-2.5">
              <span className="text-xs font-medium">Status Aktif di Dropdown</span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isPending}
              className="text-xs"
            >
              {editingLookup ? "Simpan Perubahan" : "Simpan Pilihan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
