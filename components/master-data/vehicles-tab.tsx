"use client"

import * as React from "react"
import { ChevronDown, ChevronRight, Edit2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  createVehicleBrandAction,
  createVehicleTypeAction,
  deleteVehicleBrandAction,
  deleteVehicleTypeAction,
  toggleVehicleBrandStatusAction,
  toggleVehicleTypeStatusAction,
  updateVehicleBrandAction,
  updateVehicleTypeAction,
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
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type {
  VehicleBrandRecord,
  VehicleTypeRecord,
} from "@/lib/server/vehicles"

export interface VehiclesTabProps {
  initialBrands: VehicleBrandRecord[]
}

export function VehiclesTab({ initialBrands }: VehiclesTabProps) {
  const [brands, setBrands] = React.useState<VehicleBrandRecord[]>(initialBrands)
  const [query, setQuery] = React.useState("")
  const [expandedBrandIds, setExpandedBrandIds] = React.useState<Record<string, boolean>>({})
  const [isPending, startTransition] = React.useTransition()

  const [brandDialogOpen, setBrandDialogOpen] = React.useState(false)
  const [editingBrand, setEditingBrand] = React.useState<VehicleBrandRecord | null>(null)
  const [brandName, setBrandName] = React.useState("")
  const [brandSortOrder, setBrandSortOrder] = React.useState("0")
  const [brandIsActive, setBrandIsActive] = React.useState(true)

  const [typeDialogOpen, setTypeDialogOpen] = React.useState(false)
  const [parentBrand, setParentBrand] = React.useState<VehicleBrandRecord | null>(null)
  const [editingType, setEditingType] = React.useState<VehicleTypeRecord | null>(null)
  const [typeName, setTypeName] = React.useState("")
  const [typeIsActive, setTypeIsActive] = React.useState(true)

  const [prevInitial, setPrevInitial] = React.useState(initialBrands)
  if (prevInitial !== initialBrands) {
    setPrevInitial(initialBrands)
    setBrands(initialBrands)
  }

  const filteredBrands = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return brands
    return brands.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.types.some((t) => t.name.toLowerCase().includes(q))
    )
  }, [brands, query])

  function toggleExpand(brandId: string) {
    setExpandedBrandIds((prev) => ({ ...prev, [brandId]: !prev[brandId] }))
  }

  function openAddBrand() {
    setEditingBrand(null)
    setBrandName("")
    setBrandSortOrder("0")
    setBrandIsActive(true)
    setBrandDialogOpen(true)
  }

  function openEditBrand(brand: VehicleBrandRecord) {
    setEditingBrand(brand)
    setBrandName(brand.name)
    setBrandSortOrder(String(brand.sortOrder))
    setBrandIsActive(brand.isActive)
    setBrandDialogOpen(true)
  }

  function openAddType(brand: VehicleBrandRecord) {
    setParentBrand(brand)
    setEditingType(null)
    setTypeName("")
    setTypeIsActive(true)
    setTypeDialogOpen(true)
  }

  function openEditType(brand: VehicleBrandRecord, type: VehicleTypeRecord) {
    setParentBrand(brand)
    setEditingType(type)
    setTypeName(type.name)
    setTypeIsActive(type.isActive)
    setTypeDialogOpen(true)
  }

  function handleSaveBrand() {
    const trimmed = brandName.trim()
    if (!trimmed) {
      toast.error("Nama merek wajib diisi")
      return
    }
    const sortOrderNum = Number.parseInt(brandSortOrder, 10)
    const validSortOrder = Number.isNaN(sortOrderNum) || sortOrderNum < 0 ? 0 : sortOrderNum

    startTransition(async () => {
      if (editingBrand) {
        const res = await updateVehicleBrandAction(editingBrand.id, {
          name: trimmed,
          sortOrder: validSortOrder,
          isActive: brandIsActive,
        })
        if (!res.ok) {
          toast.error(res.error)
          return
        }
        toast.success("Merek berhasil diperbarui")
        setBrands((prev) =>
          prev.map((b) =>
            b.id === editingBrand.id
              ? {
                  ...b,
                  name: trimmed,
                  sortOrder: validSortOrder,
                  isActive: brandIsActive,
                }
              : b
          )
        )
      } else {
        const res = await createVehicleBrandAction({
          name: trimmed,
          sortOrder: validSortOrder,
          isActive: brandIsActive,
        })
        if (!res.ok || !res.data) {
          toast.error(res.error)
          return
        }
        toast.success("Merek baru berhasil ditambahkan")
        const created = res.data
        setBrands((prev) => [
          ...prev,
          {
            id: created.id,
            name: created.name,
            sortOrder: created.sortOrder,
            isActive: created.isActive,
            usage: 0,
            types: [],
          },
        ])
      }
      setBrandDialogOpen(false)
    })
  }

  function handleSaveType() {
    if (!parentBrand) return
    const trimmed = typeName.trim()
    if (!trimmed) {
      toast.error("Nama tipe wajib diisi")
      return
    }

    startTransition(async () => {
      if (editingType) {
        const res = await updateVehicleTypeAction(editingType.id, {
          name: trimmed,
          isActive: typeIsActive,
        })
        if (!res.ok) {
          toast.error(res.error)
          return
        }
        toast.success("Tipe berhasil diperbarui")
        setBrands((prev) =>
          prev.map((b) =>
            b.id === parentBrand.id
              ? {
                  ...b,
                  types: b.types.map((t) =>
                    t.id === editingType.id
                      ? { ...t, name: trimmed, isActive: typeIsActive }
                      : t
                  ),
                }
              : b
          )
        )
      } else {
        const res = await createVehicleTypeAction({
          brandId: parentBrand.id,
          name: trimmed,
          isActive: typeIsActive,
        })
        if (!res.ok || !res.data) {
          toast.error(res.error)
          return
        }
        toast.success("Tipe baru berhasil ditambahkan")
        const created = res.data
        setBrands((prev) =>
          prev.map((b) =>
            b.id === parentBrand.id
              ? {
                  ...b,
                  types: [
                    ...b.types,
                    {
                      id: created.id,
                      brandId: created.brandId,
                      name: created.name,
                      isActive: created.isActive,
                      usage: 0,
                    },
                  ],
                }
              : b
          )
        )
      }
      setTypeDialogOpen(false)
    })
  }

  function handleToggleBrand(id: string, current: boolean) {
    const next = !current
    startTransition(async () => {
      const res = await toggleVehicleBrandStatusAction(id, next)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setBrands((prev) => prev.map((b) => (b.id === id ? { ...b, isActive: next } : b)))
      toast.success(next ? "Merek diaktifkan" : "Merek dinonaktifkan")
    })
  }

  function handleToggleType(brandId: string, typeId: string, current: boolean) {
    const next = !current
    startTransition(async () => {
      const res = await toggleVehicleTypeStatusAction(typeId, next)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setBrands((prev) =>
        prev.map((b) =>
          b.id === brandId
            ? {
                ...b,
                types: b.types.map((t) => (t.id === typeId ? { ...t, isActive: next } : t)),
              }
            : b
        )
      )
      toast.success(next ? "Tipe diaktifkan" : "Tipe dinonaktifkan")
    })
  }

  function handleDeleteBrand(brand: VehicleBrandRecord) {
    if (brand.usage > 0) {
      toast.error(
        `Merek "${brand.name}" sudah dipakai SPPA atau placing slip. Nonaktifkan saja alih-alih menghapus.`
      )
      return
    }
    if (brand.types.length > 0) {
      toast.error(`Hapus dulu semua tipe di bawah merek "${brand.name}".`)
      return
    }
    if (!confirm(`Hapus merek "${brand.name}"?`)) return

    startTransition(async () => {
      const res = await deleteVehicleBrandAction(brand.id)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setBrands((prev) => prev.filter((b) => b.id !== brand.id))
      toast.success("Merek berhasil dihapus")
    })
  }

  function handleDeleteType(brandId: string, type: VehicleTypeRecord) {
    if (type.usage > 0) {
      toast.error(
        `Tipe "${type.name}" sudah dipakai SPPA atau placing slip. Nonaktifkan saja alih-alih menghapus.`
      )
      return
    }
    if (!confirm(`Hapus tipe "${type.name}"?`)) return

    startTransition(async () => {
      const res = await deleteVehicleTypeAction(type.id)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setBrands((prev) =>
        prev.map((b) =>
          b.id === brandId
            ? {
                ...b,
                types: b.types.filter((t) => t.id !== type.id),
              }
            : b
        )
      )
      toast.success("Tipe berhasil dihapus")
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3.5 shadow-xs">
        <SearchInput
          value={query}
          onValueChange={setQuery}
          placeholder="Cari merek atau tipe kendaraan…"
          className="w-full sm:max-w-xs"
        />
        <Button size="sm" onClick={openAddBrand} className="h-9 gap-1.5 text-xs">
          <Plus className="size-4" />
          Tambah Merek Baru
        </Button>
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <Table className="min-w-180">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12"></TableHead>
              <TableHead className="w-20">Urutan</TableHead>
              <TableHead>Nama Merek Kendaraan</TableHead>
              <TableHead className="w-28 text-center">Jumlah Tipe</TableHead>
              <TableHead className="w-32">Penggunaan</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-32 text-right pr-4">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBrands.length === 0 ? (
              <TableEmpty
                colSpan={7}
                message={
                  query
                    ? "Tidak ada merek kendaraan yang cocok dengan pencarian."
                    : "Belum ada data merek kendaraan."
                }
              />
            ) : (
              filteredBrands.map((brand) => {
                const isExpanded = expandedBrandIds[brand.id]

                return (
                  <React.Fragment key={brand.id}>
                    <TableRow className="text-xs hover:bg-muted/40 transition-colors">
                      <TableCell className="pl-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleExpand(brand.id)}
                          className="size-6 text-muted-foreground hover:text-foreground"
                          title="Lihat Tipe Kendaraan"
                          aria-label={isExpanded ? `Tutup tipe ${brand.name}` : `Buka tipe ${brand.name}`}
                        >
                          {isExpanded ? (
                            <ChevronDown className="size-3.5" />
                          ) : (
                            <ChevronRight className="size-3.5" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {brand.sortOrder}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{brand.name}</div>
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        <Badge variant="secondary" className="text-xs">
                          {brand.types.length}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {brand.usage > 0 ? (
                          <span className="text-[11px] text-muted-foreground">
                            {brand.usage} transaksi
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">
                            Belum dipakai
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={brand.isActive ? "Active" : "Inactive"} />
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditBrand(brand)}
                            className="size-7 text-muted-foreground hover:text-foreground"
                            title="Edit Merek"
                            aria-label={`Edit merek ${brand.name}`}
                          >
                            <Edit2 className="size-3.5" />
                          </Button>
                          <Switch
                            checked={brand.isActive}
                            onCheckedChange={() => handleToggleBrand(brand.id, brand.isActive)}
                            disabled={isPending}
                            title={brand.isActive ? "Nonaktifkan Merek" : "Aktifkan Merek"}
                            aria-label={`Status merek ${brand.name}`}
                            className="scale-75"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteBrand(brand)}
                            disabled={isPending || brand.usage > 0 || brand.types.length > 0}
                            className="size-7 text-muted-foreground hover:text-destructive"
                            title={
                              brand.usage > 0
                                ? "Tidak dapat dihapus karena sudah dipakai transaksi"
                                : brand.types.length > 0
                                  ? "Hapus dulu semua tipe di merek ini"
                                  : "Hapus Merek"
                            }
                            aria-label={`Hapus merek ${brand.name}`}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow className="bg-muted/15 hover:bg-muted/20">
                        <TableCell colSpan={7} className="p-0 pl-12 pr-4 py-3">
                          <div className="flex flex-col gap-2 rounded-md border bg-card/60 p-3">
                            <div className="flex items-center justify-between border-b pb-2">
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Tipe Kendaraan untuk Merek {brand.name} ({brand.types.length})
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openAddType(brand)}
                                className="h-7 gap-1 text-xs"
                                aria-label={`Tambah tipe untuk merek ${brand.name}`}
                              >
                                <Plus className="size-3" />
                                Tambah Tipe
                              </Button>
                            </div>

                            {brand.types.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic py-2">
                                Belum ada tipe kendaraan untuk merek ini.
                              </p>
                            ) : (
                              <div className="divide-y text-xs">
                                {brand.types.map((type) => (
                                  <div
                                    key={type.id}
                                    className="flex items-center justify-between py-2"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-foreground">
                                        {type.name}
                                      </span>
                                      {type.usage > 0 ? (
                                        <span className="text-[11px] text-muted-foreground">
                                          ({type.usage} transaksi)
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <StatusBadge status={type.isActive ? "Active" : "Inactive"} />
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => openEditType(brand, type)}
                                        className="size-6 text-muted-foreground hover:text-foreground"
                                        title="Edit Tipe"
                                        aria-label={`Edit tipe ${type.name}`}
                                      >
                                        <Edit2 className="size-3" />
                                      </Button>
                                      <Switch
                                        checked={type.isActive}
                                        onCheckedChange={() =>
                                          handleToggleType(brand.id, type.id, type.isActive)
                                        }
                                        disabled={isPending}
                                        className="scale-65"
                                        title={
                                          type.isActive ? "Nonaktifkan Tipe" : "Aktifkan Tipe"
                                        }
                                        aria-label={`Status tipe ${type.name}`}
                                      />
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteType(brand.id, type)}
                                        disabled={isPending || type.usage > 0}
                                        className="size-6 text-muted-foreground hover:text-destructive"
                                        title={
                                          type.usage > 0
                                            ? "Tidak dapat dihapus karena sudah dipakai transaksi"
                                            : "Hapus Tipe"
                                        }
                                        aria-label={`Hapus tipe ${type.name}`}
                                      >
                                        <Trash2 className="size-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={brandDialogOpen} onOpenChange={setBrandDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBrand ? "Edit Merek Kendaraan" : "Tambah Merek Kendaraan Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Merek kendaraan yang dapat dipilih saat pembuatan SPPA dan placing slip.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3.5 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="brand-name" className="text-xs font-medium">
                Nama Merek <span className="text-destructive">*</span>
              </Label>
              <Input
                id="brand-name"
                placeholder="Contoh: Toyota, Honda, Daihatsu"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="h-8.5 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="brand-sort" className="text-xs font-medium">
                Urutan Tampilan
              </Label>
              <Input
                id="brand-sort"
                type="number"
                min={0}
                placeholder="0"
                value={brandSortOrder}
                onChange={(e) => setBrandSortOrder(e.target.value)}
                className="h-8.5 text-xs"
              />
              <span className="text-[11px] text-muted-foreground">
                Merek dengan urutan lebih kecil muncul lebih awal di dropdown.
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-2.5">
              <span className="text-xs font-medium">Status Aktif Operasional</span>
              <Switch
                checked={brandIsActive}
                onCheckedChange={setBrandIsActive}
                aria-label="Status aktif merek"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBrandDialogOpen(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveBrand}
              disabled={isPending}
              className="text-xs"
            >
              {editingBrand ? "Simpan Perubahan" : "Tambah Merek"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingType
                ? `Edit Tipe (${parentBrand?.name ?? ""})`
                : `Tambah Tipe Kendaraan (${parentBrand?.name ?? ""})`}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Model/tipe kendaraan di bawah merek {parentBrand?.name ?? ""}.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3.5 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type-name" className="text-xs font-medium">
                Nama Tipe <span className="text-destructive">*</span>
              </Label>
              <Input
                id="type-name"
                placeholder="Contoh: Avanza, Innova Zenix, HR-V"
                value={typeName}
                onChange={(e) => setTypeName(e.target.value)}
                className="h-8.5 text-xs"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-2.5">
              <span className="text-xs font-medium">Status Aktif Operasional</span>
              <Switch
                checked={typeIsActive}
                onCheckedChange={setTypeIsActive}
                aria-label="Status aktif tipe"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTypeDialogOpen(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveType}
              disabled={isPending}
              className="text-xs"
            >
              {editingType ? "Simpan Perubahan" : "Tambah Tipe"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
