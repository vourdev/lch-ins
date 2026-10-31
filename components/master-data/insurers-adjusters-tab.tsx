"use client"

import * as React from "react"
import { Info, Pencil, Plus, Power } from "lucide-react"
import { toast } from "sonner"

import {
  createAdjusterAction,
  createInsurerAction,
  toggleAdjusterStatusAction,
  toggleInsurerStatusAction,
  updateAdjusterAction,
  updateInsurerAction,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import type { Adjuster, Insurer } from "@/lib/generated/prisma/client"

export interface InsurersAdjustersTabProps {
  initialInsurers: Insurer[]
  initialAdjusters: Adjuster[]
}

export function InsurersAdjustersTab({
  initialInsurers,
  initialAdjusters,
}: InsurersAdjustersTabProps) {
  const permission = usePermission()
  const canManage = permission.canManage("/master-data")
  const [partnerType, setPartnerType] = React.useState<"insurer" | "adjuster">("insurer")
  const [insurers, setInsurers] = React.useState<Insurer[]>(initialInsurers)
  const [adjusters, setAdjusters] = React.useState<Adjuster[]>(initialAdjusters)
  const [query, setQuery] = React.useState("")
  const [isPending, startTransition] = React.useTransition()

  // Modal State
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingItem, setEditingItem] = React.useState<Insurer | Adjuster | null>(null)
  const [name, setName] = React.useState("")
  const [contactPerson, setContactPerson] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [address, setAddress] = React.useState("")
  const [isActive, setIsActive] = React.useState(true)

  const [prevInsurers, setPrevInsurers] = React.useState(initialInsurers)
  if (prevInsurers !== initialInsurers) {
    setPrevInsurers(initialInsurers)
    setInsurers(initialInsurers)
  }

  const [prevAdjusters, setPrevAdjusters] = React.useState(initialAdjusters)
  if (prevAdjusters !== initialAdjusters) {
    setPrevAdjusters(initialAdjusters)
    setAdjusters(initialAdjusters)
  }

  const filteredInsurers = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return insurers
    return insurers.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.contactPerson && i.contactPerson.toLowerCase().includes(q)) ||
        (i.email && i.email.toLowerCase().includes(q)) ||
        (i.phone && i.phone.toLowerCase().includes(q))
    )
  }, [insurers, query])

  const filteredAdjusters = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return adjusters
    return adjusters.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.contactPerson && a.contactPerson.toLowerCase().includes(q)) ||
        (a.email && a.email.toLowerCase().includes(q)) ||
        (a.phone && a.phone.toLowerCase().includes(q))
    )
  }, [adjusters, query])

  const currentList = partnerType === "insurer" ? filteredInsurers : filteredAdjusters
  const {
    page,
    pageSize,
    totalItems,
    paginatedItems,
    setPage,
    setPageSize,
  } = usePagination<Insurer | Adjuster>(currentList, 10)

  function openAddDialog() {
    setEditingItem(null)
    setName("")
    setContactPerson("")
    setEmail("")
    setPhone("")
    setAddress("")
    setIsActive(true)
    setDialogOpen(true)
  }

  function openEditDialog(item: Insurer | Adjuster) {
    setEditingItem(item)
    setName(item.name)
    setContactPerson(item.contactPerson ?? "")
    setEmail(item.email ?? "")
    setPhone(item.phone ?? "")
    setAddress(item.address ?? "")
    setIsActive(item.isActive)
    setDialogOpen(true)
  }

  function handleSave() {
    if (!name.trim()) {
      toast.error("Nama rekanan wajib diisi")
      return
    }

    startTransition(async () => {
      if (partnerType === "insurer") {
        if (editingItem) {
          const res = await updateInsurerAction(editingItem.id, {
            name,
            contactPerson,
            email,
            phone,
            address,
            isActive,
          })
          if (!res.ok) {
            toast.error(res.error)
            return
          }
          toast.success("Data asuransi berhasil diperbarui")
          setInsurers((prev) =>
            prev.map((i) =>
              i.id === editingItem.id
                ? { ...i, name, contactPerson, email, phone, address, isActive }
                : i
            )
          )
        } else {
          const res = await createInsurerAction({
            name,
            contactPerson,
            email,
            phone,
            address,
            isActive,
          })
          if (!res.ok || !res.data) {
            toast.error(res.error)
            return
          }
          toast.success("Asuransi baru berhasil ditambahkan")
          setInsurers((prev) => [res.data as Insurer, ...prev])
        }
      } else {
        if (editingItem) {
          const res = await updateAdjusterAction(editingItem.id, {
            name,
            contactPerson,
            email,
            phone,
            address,
            isActive,
          })
          if (!res.ok) {
            toast.error(res.error)
            return
          }
          toast.success("Data adjuster berhasil diperbarui")
          setAdjusters((prev) =>
            prev.map((a) =>
              a.id === editingItem.id
                ? { ...a, name, contactPerson, email, phone, address, isActive }
                : a
            )
          )
        } else {
          const res = await createAdjusterAction({
            name,
            contactPerson,
            email,
            phone,
            address,
            isActive,
          })
          if (!res.ok || !res.data) {
            toast.error(res.error)
            return
          }
          toast.success("Adjuster baru berhasil ditambahkan")
          setAdjusters((prev) => [res.data as Adjuster, ...prev])
        }
      }
      setDialogOpen(false)
    })
  }

  function handleToggleInsurer(id: string, current: boolean) {
    const next = !current
    startTransition(async () => {
      const res = await toggleInsurerStatusAction(id, next)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setInsurers((prev) => prev.map((i) => (i.id === id ? { ...i, isActive: next } : i)))
      toast.success(next ? "Asuransi diaktifkan" : "Asuransi dinonaktifkan")
    })
  }

  function handleToggleAdjuster(id: string, current: boolean) {
    const next = !current
    startTransition(async () => {
      const res = await toggleAdjusterStatusAction(id, next)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setAdjusters((prev) => prev.map((a) => (a.id === id ? { ...a, isActive: next } : a)))
      toast.success(next ? "Adjuster diaktifkan" : "Adjuster dinonaktifkan")
    })
  }

  function actionsFor(item: Insurer | Adjuster): RowAction[] {
    return [
      { label: "Edit data", icon: Pencil, onSelect: () => openEditDialog(item) },
      {
        label: item.isActive ? "Nonaktifkan" : "Aktifkan",
        icon: Power,
        disabled: isPending,
        onSelect: () =>
          partnerType === "insurer"
            ? handleToggleInsurer(item.id, item.isActive)
            : handleToggleAdjuster(item.id, item.isActive),
      },
    ]
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Informative Banner */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-200">
        <Info className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <div className="flex flex-col gap-0.5">
          <p className="font-medium">Menunggu Daftar Rekanan Final LCH</p>
          <p className="text-muted-foreground dark:text-amber-200/80">
            Daftar asuransi rekanan dan loss adjuster saat ini dapat Anda kelola secara mandiri.
            Ketika daftar resmi dari LCH tiba, data ini dapat diselaraskan sewaktu-waktu.
          </p>
        </div>
      </div>

      <Tabs
        value={partnerType}
        onValueChange={(val) => {
          setPartnerType(val as "insurer" | "adjuster")
          setQuery("")
        }}
      >
        <TabsList>
          <TabsTrigger value="insurer">Asuransi Rekanan ({insurers.length})</TabsTrigger>
          <TabsTrigger value="adjuster">Loss Adjuster ({adjusters.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          value={query}
          onValueChange={setQuery}
          placeholder={`Cari nama, kontak, atau email ${
            partnerType === "insurer" ? "asuransi" : "adjuster"
          }…`}
        />

        {canManage && (
          <Button onClick={openAddDialog}>
            <Plus data-icon="inline-start" />
            {partnerType === "insurer" ? "Tambah Asuransi" : "Tambah Adjuster"}
          </Button>
        )}
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <Table className="min-w-200">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {canManage && <TableHead className={ACTION_COL_CLASS}>Aksi</TableHead>}
              <TableHead className="w-56">
                Nama {partnerType === "insurer" ? "Perusahaan Asuransi" : "Loss Adjuster"}
              </TableHead>
              <TableHead className="w-40">Contact Person</TableHead>
              <TableHead className="w-44">Email</TableHead>
              <TableHead className="w-36">Telepon</TableHead>
              <TableHead>Alamat Kantor</TableHead>
              <TableHead className="w-24 pr-4">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentList.length === 0 ? (
              <TableEmpty
                colSpan={canManage ? 7 : 6}
                message={
                  query
                    ? `Tidak ada ${
                        partnerType === "insurer" ? "asuransi" : "adjuster"
                      } yang cocok dengan pencarian.`
                    : `Belum ada data ${partnerType === "insurer" ? "asuransi" : "adjuster"}.`
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
                  <TableCell>{item.contactPerson || "—"}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {item.email || "—"}
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {item.phone || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground truncate max-w-64">
                    {item.address || "—"}
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
        itemName={partnerType === "insurer" ? "asuransi" : "adjuster"}
      />

      {/* Modal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem
                ? `Edit ${partnerType === "insurer" ? "Asuransi" : "Adjuster"}`
                : `Tambah ${partnerType === "insurer" ? "Asuransi" : "Adjuster"} Baru`}
            </DialogTitle>
            <DialogDescription>
              Masukkan informasi rekanan {partnerType === "insurer" ? "penanggung risiko" : "penilai klaim"}.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="partner-name">
                Nama Perusahaan / Lembaga <span className="text-destructive">*</span>
              </Label>
              <Input
                id="partner-name"
                placeholder="Contoh: PT Asuransi Wahana Tata, PT McLarens Indonesia"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="partner-cp">
                Contact Person (PIC)
              </Label>
              <Input
                id="partner-cp"
                placeholder="Nama PIC operasional"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="partner-email">
                  Email
                </Label>
                <Input
                  id="partner-email"
                  type="email"
                  placeholder="kontak@rekanan.co.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="partner-phone">
                  No. Telepon
                </Label>
                <Input
                  id="partner-phone"
                  type="tel"
                  placeholder="021-... atau +62..."
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/[^0-9+() -]/g, ""))
                  }
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="partner-address">
                Alamat Kantor
              </Label>
              <Textarea
                id="partner-address"
                placeholder="Alamat kantor rekanan"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-2.5">
              <span className="text-sm font-medium">Status Aktif Operasional</span>
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
              {editingItem ? "Simpan Perubahan" : "Simpan Rekanan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
