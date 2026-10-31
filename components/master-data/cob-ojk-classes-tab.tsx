"use client"

import * as React from "react"
import { Pencil, Plus, Power } from "lucide-react"
import { toast } from "sonner"

import {
  createCobOjkClassAction,
  updateCobOjkClassAction,
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
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { CobOjkClassRecord } from "@/lib/server/cob-ojk-classes"

export interface CobOjkClassesTabProps {
  initialCobOjkClasses: CobOjkClassRecord[]
}

export function CobOjkClassesTab({ initialCobOjkClasses }: CobOjkClassesTabProps) {
  const permission = usePermission()
  const canManage = permission.canManage("/master-data")
  const [items, setItems] = React.useState<CobOjkClassRecord[]>(initialCobOjkClasses)
  const [search, setSearch] = React.useState("")
  const [isPending, startTransition] = React.useTransition()

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingItem, setEditingItem] = React.useState<CobOjkClassRecord | null>(null)
  const [name, setName] = React.useState("")
  const [isActive, setIsActive] = React.useState(true)

  const [prevInitial, setPrevInitial] = React.useState(initialCobOjkClasses)
  if (prevInitial !== initialCobOjkClasses) {
    setPrevInitial(initialCobOjkClasses)
    setItems(initialCobOjkClasses)
  }

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((it) => it.name.toLowerCase().includes(q))
  }, [items, search])

  const {
    page,
    pageSize,
    totalItems,
    paginatedItems,
    setPage,
    setPageSize,
  } = usePagination(filtered, 10)

  function openAdd() {
    setEditingItem(null)
    setName("")
    setIsActive(true)
    setDialogOpen(true)
  }

  function openEdit(item: CobOjkClassRecord) {
    setEditingItem(item)
    setName(item.name)
    setIsActive(item.isActive)
    setDialogOpen(true)
  }

  function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error("Nama klasifikasi OJK wajib diisi")
      return
    }

    startTransition(async () => {
      if (editingItem) {
        const res = await updateCobOjkClassAction(editingItem.id, { name: trimmed, isActive })
        if (!res.ok || !res.data) {
          toast.error(res.error ?? "Gagal memperbarui klasifikasi OJK")
          return
        }
        setItems((prev) => prev.map((it) => (it.id === editingItem.id ? res.data! : it)))
        toast.success(`Klasifikasi OJK "${trimmed}" berhasil diperbarui`)
      } else {
        const res = await createCobOjkClassAction({ name: trimmed, isActive })
        if (!res.ok || !res.data) {
          toast.error(res.error ?? "Gagal menambahkan klasifikasi OJK")
          return
        }
        setItems((prev) => [res.data!, ...prev])
        toast.success(`Klasifikasi OJK "${trimmed}" berhasil ditambahkan`)
      }
      setDialogOpen(false)
    })
  }

  function handleToggle(item: CobOjkClassRecord) {
    const next = !item.isActive
    startTransition(async () => {
      const res = await updateCobOjkClassAction(item.id, { name: item.name, isActive: next })
      if (!res.ok || !res.data) {
        toast.error(res.error ?? "Gagal mengubah status klasifikasi OJK")
        return
      }
      setItems((prev) => prev.map((it) => (it.id === item.id ? res.data! : it)))
      toast.success(next ? `"${item.name}" diaktifkan` : `"${item.name}" dinonaktifkan`)
    })
  }

  // Pola baris sama dengan Manajemen Pengguna: aksi di menu kolom pertama,
  // termasuk aktif/nonaktif yang dulu berupa switch di kolom sendiri.
  function actionsFor(item: CobOjkClassRecord): RowAction[] {
    return [
      { label: "Edit klasifikasi", icon: Pencil, onSelect: () => openEdit(item) },
      {
        label: item.isActive ? "Nonaktifkan" : "Aktifkan",
        icon: Power,
        disabled: isPending,
        onSelect: () => handleToggle(item),
      },
    ]
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder="Cari klasifikasi OJK…"
        />

        {canManage && (
          <Button onClick={openAdd}>
            <Plus data-icon="inline-start" />
            Tambah Klasifikasi OJK
          </Button>
        )}
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <Table className="min-w-160">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {canManage && <TableHead className={ACTION_COL_CLASS}>Aksi</TableHead>}
              <TableHead>Nama Klasifikasi OJK</TableHead>
              <TableHead className="w-36">Polis Terkait</TableHead>
              <TableHead className="w-28 pr-4">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableEmpty
                colSpan={canManage ? 4 : 3}
                message={
                  search
                    ? `Tidak ada klasifikasi OJK yang cocok dengan "${search}".`
                    : "Belum ada master klasifikasi OJK. Klik tombol Tambah untuk membuat baru."
                }
              />
            ) : (
              paginatedItems.map((item) => (
                <TableRow key={item.id}>
                  {canManage && (
                    <TableCell className={ACTION_COL_CLASS}>
                      <RowActions actions={actionsFor(item)} />
                    </TableCell>
                  )}
                  <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {item._count.policies} polis
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-4">
                    <StatusBadge status={item.isActive ? "Active" : "Inactive"} />
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
        itemName="klasifikasi"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Klasifikasi OJK" : "Tambah Klasifikasi OJK"}
            </DialogTitle>
            <DialogDescription>
              Klasifikasi lini usaha menurut OJK untuk pengelompokan pelaporan produksi dan polis.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ojk-name">
                Nama Klasifikasi <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ojk-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Rangka Kapal, Harta Benda, Kendaraan Bermotor"
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-2.5">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">Status Aktif</span>
                <span className="text-xs text-muted-foreground">
                  Menentukan apakah opsi ini muncul di dropdown form polis
                </span>
              </div>
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
              {isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
