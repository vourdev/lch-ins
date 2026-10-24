"use client"

import * as React from "react"
import { ChevronDown, ChevronRight, Edit2, Layers, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  createCobAction,
  createCoverTypeAction,
  deleteCobAction,
  deleteCoverTypeAction,
  toggleCobStatusAction,
  toggleCoverTypeStatusAction,
  updateCobAction,
  updateCoverTypeAction,
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
import type { CoverType, LookupValue } from "@/lib/generated/prisma/client"
import type { MasterCobRecord } from "@/lib/server/master-data"

export interface CobCoverTabProps {
  initialCobs: MasterCobRecord[]
  rateModes: LookupValue[]
  formVariants: LookupValue[]
}

export function CobCoverTab({
  initialCobs,
  rateModes,
  formVariants,
}: CobCoverTabProps) {
  const [cobs, setCobs] = React.useState<MasterCobRecord[]>(initialCobs)
  const [query, setQuery] = React.useState("")
  const [expandedCobIds, setExpandedCobIds] = React.useState<Record<string, boolean>>({})
  const [isPending, startTransition] = React.useTransition()

  // Modal COB State
  const [cobDialogOpen, setCobDialogOpen] = React.useState(false)
  const [editingCob, setEditingCob] = React.useState<MasterCobRecord | null>(null)
  const [cobCode, setCobCode] = React.useState("")
  const [cobName, setCobName] = React.useState("")
  const [cobRateModeId, setCobRateModeId] = React.useState(rateModes[0]?.id ?? "")
  const [cobFormVariantId, setCobFormVariantId] = React.useState(formVariants[0]?.id ?? "")
  const [cobIsActive, setCobIsActive] = React.useState(true)

  // Modal Cover Type State
  const [coverDialogOpen, setCoverDialogOpen] = React.useState(false)
  const [parentCobId, setParentCobId] = React.useState("")
  const [editingCover, setEditingCover] = React.useState<CoverType | null>(null)
  const [coverCode, setCoverCode] = React.useState("")
  const [coverName, setCoverName] = React.useState("")
  const [coverIsActive, setCoverIsActive] = React.useState(true)

  const [prevInitialCobs, setPrevInitialCobs] = React.useState(initialCobs)
  if (prevInitialCobs !== initialCobs) {
    setPrevInitialCobs(initialCobs)
    setCobs(initialCobs)
  }

  const filteredCobs = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return cobs
    return cobs.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.coverTypes.some(
          (ct) => ct.code.toLowerCase().includes(q) || ct.name.toLowerCase().includes(q)
        )
    )
  }, [cobs, query])

  function toggleExpand(cobId: string) {
    setExpandedCobIds((prev) => ({ ...prev, [cobId]: !prev[cobId] }))
  }

  // Handle COB Dialog Open
  function openAddCob() {
    setEditingCob(null)
    setCobCode("")
    setCobName("")
    setCobRateModeId(rateModes[0]?.id ?? "")
    setCobFormVariantId(formVariants[0]?.id ?? "")
    setCobIsActive(true)
    setCobDialogOpen(true)
  }

  function openEditCob(cob: MasterCobRecord) {
    setEditingCob(cob)
    setCobCode(cob.code)
    setCobName(cob.name)
    setCobRateModeId(cob.rateModeId)
    setCobFormVariantId(cob.formVariantId)
    setCobIsActive(cob.isActive)
    setCobDialogOpen(true)
  }

  // Handle Cover Type Dialog Open
  function openAddCover(cobId: string, cobCodeVal: string) {
    setParentCobId(cobId)
    setEditingCover(null)
    setCoverCode(cobCodeVal)
    setCoverName("")
    setCoverIsActive(true)
    setCoverDialogOpen(true)
  }

  function openEditCover(cobId: string, cover: CoverType) {
    setParentCobId(cobId)
    setEditingCover(cover)
    setCoverCode(cover.code)
    setCoverName(cover.name)
    setCoverIsActive(cover.isActive)
    setCoverDialogOpen(true)
  }

  function handleSaveCob() {
    if (!cobCode.trim() || !cobName.trim()) {
      toast.error("Kode dan nama COB wajib diisi")
      return
    }

    startTransition(async () => {
      if (editingCob) {
        const res = await updateCobAction(editingCob.id, {
          code: cobCode,
          name: cobName,
          rateModeId: cobRateModeId,
          formVariantId: cobFormVariantId,
          isActive: cobIsActive,
        })
        if (!res.ok) {
          toast.error(res.error)
          return
        }
        toast.success("COB berhasil diperbarui")
        setCobs((prev) =>
          prev.map((c) =>
            c.id === editingCob.id
              ? {
                  ...c,
                  code: cobCode,
                  name: cobName,
                  rateModeId: cobRateModeId,
                  formVariantId: cobFormVariantId,
                  isActive: cobIsActive,
                  rateMode: rateModes.find((r) => r.id === cobRateModeId) ?? c.rateMode,
                  formVariant: formVariants.find((f) => f.id === cobFormVariantId) ?? c.formVariant,
                }
              : c
          )
        )
      } else {
        const res = await createCobAction({
          code: cobCode,
          name: cobName,
          rateModeId: cobRateModeId,
          formVariantId: cobFormVariantId,
          isActive: cobIsActive,
        })
        if (!res.ok || !res.data) {
          toast.error(res.error)
          return
        }
        toast.success("COB baru berhasil ditambahkan")
        const newRecord: MasterCobRecord = {
          ...(res.data as MasterCobRecord),
          rateMode: rateModes.find((r) => r.id === cobRateModeId)!,
          formVariant: formVariants.find((f) => f.id === cobFormVariantId)!,
          coverTypes: [],
          _count: { sppa: 0, placingSlips: 0, policies: 0, clients: 0 },
        }
        setCobs((prev) => [newRecord, ...prev])
      }
      setCobDialogOpen(false)
    })
  }

  function handleSaveCover() {
    if (!coverCode.trim() || !coverName.trim()) {
      toast.error("Kode dan nama Cover Type wajib diisi")
      return
    }

    startTransition(async () => {
      if (editingCover) {
        const res = await updateCoverTypeAction(editingCover.id, {
          cobId: parentCobId,
          code: coverCode,
          name: coverName,
          isActive: coverIsActive,
        })
        if (!res.ok) {
          toast.error(res.error)
          return
        }
        toast.success("Cover Type berhasil diperbarui")
        setCobs((prev) =>
          prev.map((c) =>
            c.id === parentCobId
              ? {
                  ...c,
                  coverTypes: c.coverTypes.map((ct) =>
                    ct.id === editingCover.id
                      ? { ...ct, code: coverCode, name: coverName, isActive: coverIsActive }
                      : ct
                  ),
                }
              : c
          )
        )
      } else {
        const res = await createCoverTypeAction({
          cobId: parentCobId,
          code: coverCode,
          name: coverName,
          isActive: coverIsActive,
        })
        if (!res.ok || !res.data) {
          toast.error(res.error)
          return
        }
        toast.success("Cover Type baru berhasil ditambahkan")
        setCobs((prev) =>
          prev.map((c) =>
            c.id === parentCobId
              ? {
                  ...c,
                  coverTypes: [...c.coverTypes, res.data as CoverType],
                }
              : c
          )
        )
      }
      setCoverDialogOpen(false)
    })
  }

  function handleToggleCob(id: string, current: boolean) {
    const next = !current
    startTransition(async () => {
      const res = await toggleCobStatusAction(id, next)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setCobs((prev) => prev.map((c) => (c.id === id ? { ...c, isActive: next } : c)))
      toast.success(next ? "COB diaktifkan" : "COB dinonaktifkan")
    })
  }

  function handleToggleCover(cobId: string, coverId: string, current: boolean) {
    const next = !current
    startTransition(async () => {
      const res = await toggleCoverTypeStatusAction(coverId, next)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setCobs((prev) =>
        prev.map((c) =>
          c.id === cobId
            ? {
                ...c,
                coverTypes: c.coverTypes.map((ct) =>
                  ct.id === coverId ? { ...ct, isActive: next } : ct
                ),
              }
            : c
        )
      )
      toast.success(next ? "Cover Type diaktifkan" : "Cover Type dinonaktifkan")
    })
  }

  function handleDeleteCob(cob: MasterCobRecord) {
    const totalUsage =
      cob._count.sppa +
      cob._count.placingSlips +
      cob._count.policies +
      cob._count.clients +
      cob.coverTypes.length

    if (totalUsage > 0) {
      toast.error(
        `COB "${cob.name}" sedang digunakan atau memiliki sub-cover type. Nonaktifkan statusnya alih-alih menghapus.`
      )
      return
    }

    if (!confirm(`Hapus COB "${cob.name}"?`)) return

    startTransition(async () => {
      const res = await deleteCobAction(cob.id)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setCobs((prev) => prev.filter((c) => c.id !== cob.id))
      toast.success("COB berhasil dihapus")
    })
  }

  function handleDeleteCover(cobId: string, cover: CoverType) {
    if (!confirm(`Hapus Cover Type "${cover.name}"?`)) return

    startTransition(async () => {
      const res = await deleteCoverTypeAction(cover.id)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setCobs((prev) =>
        prev.map((c) =>
          c.id === cobId
            ? {
                ...c,
                coverTypes: c.coverTypes.filter((ct) => ct.id !== cover.id),
              }
            : c
        )
      )
      toast.success("Cover Type berhasil dihapus")
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3.5 shadow-xs">
        <SearchInput
          value={query}
          onValueChange={setQuery}
          placeholder="Cari kode atau nama COB / Cover Type…"
          className="w-full sm:max-w-xs"
        />
        <Button size="sm" onClick={openAddCob} className="h-9 gap-1.5 text-xs">
          <Plus className="size-4" />
          Tambah COB Baru
        </Button>
      </div>

      {/* COB Table */}
      <Card className="gap-0 overflow-hidden py-0">
        <Table className="min-w-200">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12"></TableHead>
              <TableHead className="w-24">Kode</TableHead>
              <TableHead>Nama Class of Business</TableHead>
              <TableHead className="w-32">Satuan Tarif</TableHead>
              <TableHead className="w-36">Varian Form</TableHead>
              <TableHead className="w-28 text-center">Sub-Cover</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-32 text-right pr-4">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCobs.length === 0 ? (
              <TableEmpty
                colSpan={8}
                message={
                  query ? "Tidak ada COB yang cocok dengan pencarian." : "Belum ada data COB."
                }
              />
            ) : (
              filteredCobs.map((cob) => {
                const isExpanded = expandedCobIds[cob.id]
                const totalUsed =
                  cob._count.sppa +
                  cob._count.placingSlips +
                  cob._count.policies +
                  cob._count.clients

                return (
                  <React.Fragment key={cob.id}>
                    <TableRow className="text-xs hover:bg-muted/40 transition-colors">
                      <TableCell className="pl-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleExpand(cob.id)}
                          className="size-6 text-muted-foreground hover:text-foreground"
                          title="Lihat Type of Cover"
                        >
                          {isExpanded ? (
                            <ChevronDown className="size-3.5" />
                          ) : (
                            <ChevronRight className="size-3.5" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-mono font-semibold text-foreground">
                        {cob.code}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{cob.name}</div>
                        {totalUsed > 0 && (
                          <div className="text-[11px] text-muted-foreground">
                            Dipakai: {totalUsed} data transaksi
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[11px] font-normal">
                          {cob.rateMode?.name ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Layers className="size-3" />
                          {cob.formVariant?.name ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        <Badge variant="secondary" className="text-xs">
                          {cob.coverTypes.length}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={cob.isActive ? "Active" : "Inactive"} />
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditCob(cob)}
                            className="size-7 text-muted-foreground hover:text-foreground"
                            title="Edit COB"
                          >
                            <Edit2 className="size-3.5" />
                          </Button>
                          <Switch
                            checked={cob.isActive}
                            onCheckedChange={() => handleToggleCob(cob.id, cob.isActive)}
                            disabled={isPending}
                            title={cob.isActive ? "Nonaktifkan COB" : "Aktifkan COB"}
                            className="scale-75"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCob(cob)}
                            disabled={isPending || totalUsed > 0 || cob.coverTypes.length > 0}
                            className="size-7 text-destructive hover:bg-destructive/10"
                            title={
                              totalUsed > 0
                                ? "Tidak dapat dihapus karena sudah dipakai transaksi"
                                : "Hapus COB"
                            }
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Sub-Cover Rows */}
                    {isExpanded && (
                      <TableRow className="bg-muted/15 hover:bg-muted/20">
                        <TableCell colSpan={8} className="p-0 pl-12 pr-4 py-3">
                          <div className="flex flex-col gap-2 rounded-md border bg-card/60 p-3">
                            <div className="flex items-center justify-between border-b pb-2">
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Sub-Cover Type untuk COB {cob.name} ({cob.coverTypes.length})
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openAddCover(cob.id, cob.code)}
                                className="h-7 gap-1 text-xs"
                              >
                                <Plus className="size-3" />
                                Tambah Sub-Cover
                              </Button>
                            </div>

                            {cob.coverTypes.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic py-2">
                                Belum ada sub-cover type untuk COB ini.
                              </p>
                            ) : (
                              <div className="divide-y text-xs">
                                {cob.coverTypes.map((ct) => (
                                  <div
                                    key={ct.id}
                                    className="flex items-center justify-between py-2"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-medium text-foreground">
                                        {ct.code}
                                      </span>
                                      <span>—</span>
                                      <span className="text-foreground">{ct.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <StatusBadge status={ct.isActive ? "Active" : "Inactive"} />
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => openEditCover(cob.id, ct)}
                                        className="size-6 text-muted-foreground hover:text-foreground"
                                        title="Edit Sub-Cover"
                                      >
                                        <Edit2 className="size-3" />
                                      </Button>
                                      <Switch
                                        checked={ct.isActive}
                                        onCheckedChange={() =>
                                          handleToggleCover(cob.id, ct.id, ct.isActive)
                                        }
                                        disabled={isPending}
                                        className="scale-65"
                                        title={ct.isActive ? "Nonaktifkan" : "Aktifkan"}
                                      />
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteCover(cob.id, ct)}
                                        disabled={isPending}
                                        className="size-6 text-destructive hover:bg-destructive/10"
                                        title="Hapus Sub-Cover"
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

      {/* Dialog COB */}
      <Dialog open={cobDialogOpen} onOpenChange={setCobDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCob ? "Edit Class of Business" : "Tambah COB Baru"}</DialogTitle>
            <DialogDescription className="text-xs">
              Konfigurasi kode COB 2 digit dan varian penentuan rate pada dokumen underwriting.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3.5 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cob-code" className="text-xs font-medium">
                Kode COB (2 digit unik) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cob-code"
                placeholder="Contoh: 01, 03, 11"
                value={cobCode}
                inputMode="numeric"
                onChange={(e) => setCobCode(e.target.value.replace(/\D/g, ""))}
                maxLength={4}
                className="h-8.5 font-mono text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cob-name" className="text-xs font-medium">
                Nama Class of Business <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cob-name"
                placeholder="Contoh: Property, Marine Cargo, Motor Vehicle"
                value={cobName}
                onChange={(e) => setCobName(e.target.value)}
                className="h-8.5 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cob-ratemode" className="text-xs font-medium">
                Satuan Rate Bawaan <span className="text-destructive">*</span>
              </Label>
              <Select
                items={rateModes.map((rm) => ({ label: `${rm.name} (${rm.code})`, value: rm.id }))}
                value={cobRateModeId}
                onValueChange={(val) => setCobRateModeId(val ?? "")}
              >
                <SelectTrigger id="cob-ratemode" className="h-8.5 text-xs">
                  <SelectValue placeholder="Pilih satuan rate" />
                </SelectTrigger>
                <SelectContent>
                  {rateModes.map((rm) => (
                    <SelectItem key={rm.id} value={rm.id} className="text-xs">
                      {rm.name} ({rm.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cob-formvariant" className="text-xs font-medium">
                Varian Form Placing Slip <span className="text-destructive">*</span>
              </Label>
              <Select
                items={formVariants.map((fv) => ({ label: `${fv.name} (${fv.code})`, value: fv.id }))}
                value={cobFormVariantId}
                onValueChange={(val) => setCobFormVariantId(val ?? "")}
              >
                <SelectTrigger id="cob-formvariant" className="h-8.5 text-xs">
                  <SelectValue placeholder="Pilih varian form" />
                </SelectTrigger>
                <SelectContent>
                  {formVariants.map((fv) => (
                    <SelectItem key={fv.id} value={fv.id} className="text-xs">
                      {fv.name} ({fv.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-2.5">
              <span className="text-xs font-medium">Status Aktif Operasional</span>
              <Switch checked={cobIsActive} onCheckedChange={setCobIsActive} />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCobDialogOpen(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveCob}
              disabled={isPending}
              className="text-xs"
            >
              {editingCob ? "Simpan Perubahan" : "Tambah COB"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Cover Type */}
      <Dialog open={coverDialogOpen} onOpenChange={setCoverDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCover ? "Edit Type of Cover" : "Tambah Sub-Cover Type"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Sub-tipe jaminan asuransi (contoh: 0311 Marine Cargo Open Cover).
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3.5 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cover-code" className="text-xs font-medium">
                Kode Sub-Cover (3-6 karakter unik) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cover-code"
                placeholder="Contoh: 0101, 0311"
                value={coverCode}
                onChange={(e) => setCoverCode(e.target.value)}
                maxLength={6}
                className="h-8.5 font-mono text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cover-name" className="text-xs font-medium">
                Nama Type of Cover <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cover-name"
                placeholder="Contoh: Marine Cargo Open Cover, Property All Risks"
                value={coverName}
                onChange={(e) => setCoverName(e.target.value)}
                className="h-8.5 text-xs"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-2.5">
              <span className="text-xs font-medium">Status Aktif Operasional</span>
              <Switch checked={coverIsActive} onCheckedChange={setCoverIsActive} />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCoverDialogOpen(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveCover}
              disabled={isPending}
              className="text-xs"
            >
              {editingCover ? "Simpan Perubahan" : "Tambah Sub-Cover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
