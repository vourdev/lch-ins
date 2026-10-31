"use client"

import * as React from "react"
import { ChevronDown, ChevronRight, Edit2, Layers, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  createCoverTypeAction,
  deleteCoverTypeAction,
  toggleCobStatusAction,
  toggleCoverTypeStatusAction,
  updateCoverTypeAction,
} from "@/app/(app)/master-data/actions"
import { StatusBadge } from "@/components/shared/status-badge"
import { TableEmpty } from "@/components/shared/table-empty"
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
import type { CoverType } from "@/lib/generated/prisma/client"
import type { MasterCobRecord } from "@/lib/server/master-data"

export interface CobCoverTabProps {
  initialCobs: MasterCobRecord[]
}

/**
 * COB hanya bisa diaktifkan atau dinonaktifkan di sini. Tambah, ubah, dan
 * hapus COB lewat developer (lihat app/(app)/master-data/actions.ts). Type of
 * cover tetap dikelola penuh oleh LCH.
 */
export function CobCoverTab({ initialCobs }: CobCoverTabProps) {
  const permission = usePermission()
  const canManage = permission.canManage("/master-data")
  const [cobs, setCobs] = React.useState<MasterCobRecord[]>(initialCobs)
  const [query, setQuery] = React.useState("")
  const [expandedCobIds, setExpandedCobIds] = React.useState<Record<string, boolean>>({})
  const [isPending, startTransition] = React.useTransition()

  // Modal Cover Type State
  const [coverDialogOpen, setCoverDialogOpen] = React.useState(false)
  const [parentCobId, setParentCobId] = React.useState("")
  const [editingCover, setEditingCover] = React.useState<CoverType | null>(null)
  const [coverCode, setCoverCode] = React.useState("")
  const [coverName, setCoverName] = React.useState("")
  const [coverAbbreviation, setCoverAbbreviation] = React.useState("")
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

  // Handle Cover Type Dialog Open
  function openAddCover(cobId: string, cobCodeVal: string) {
    setParentCobId(cobId)
    setEditingCover(null)
    setCoverCode(cobCodeVal)
    setCoverName("")
    setCoverAbbreviation("")
    setCoverIsActive(true)
    setCoverDialogOpen(true)
  }

  function openEditCover(cobId: string, cover: CoverType) {
    setParentCobId(cobId)
    setEditingCover(cover)
    setCoverCode(cover.code)
    setCoverName(cover.name)
    setCoverAbbreviation(cover.abbreviation ?? "")
    setCoverIsActive(cover.isActive)
    setCoverDialogOpen(true)
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
          abbreviation: coverAbbreviation,
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
                      ? {
                          ...ct,
                          code: coverCode,
                          name: coverName,
                          abbreviation: res.data?.abbreviation ?? null,
                          isActive: coverIsActive,
                        }
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
          abbreviation: coverAbbreviation,
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
        />
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
              {canManage && <TableHead className="w-32 text-right pr-4">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCobs.length === 0 ? (
              <TableEmpty
                colSpan={canManage ? 8 : 7}
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
                    <TableRow>
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
                          <div className="text-xs text-muted-foreground">
                            Dipakai: {totalUsed} data transaksi
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {cob.rateMode?.name ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <Layers className="size-3.5" />
                          {cob.formVariant?.name ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        <Badge variant="secondary">
                          {cob.coverTypes.length}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={cob.isActive ? "Active" : "Inactive"} />
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <Switch
                              checked={cob.isActive}
                              onCheckedChange={() => handleToggleCob(cob.id, cob.isActive)}
                              disabled={isPending}
                              title={cob.isActive ? "Nonaktifkan COB" : "Aktifkan COB"}
                              className="scale-75"
                            />
                          </div>
                        </TableCell>
                      )}
                    </TableRow>

                    {/* Sub-Cover Rows */}
                    {isExpanded && (
                      <TableRow className="bg-muted/15 hover:bg-muted/20">
                        <TableCell colSpan={canManage ? 8 : 7} className="p-0 pl-12 pr-4 py-3">
                          <div className="flex flex-col gap-2 rounded-md border bg-card/60 p-3">
                            <div className="flex items-center justify-between border-b pb-2">
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Sub-Cover Type untuk COB {cob.name} ({cob.coverTypes.length})
                              </span>
                              {canManage && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openAddCover(cob.id, cob.code)}
                                  className="h-7 gap-1 text-xs"
                                >
                                  <Plus className="size-3" />
                                  Tambah Sub-Cover
                                </Button>
                              )}
                            </div>

                            {cob.coverTypes.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic py-2">
                                Belum ada sub-cover type untuk COB ini.
                              </p>
                            ) : (
                              <div className="divide-y">
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
                                      {ct.abbreviation ? (
                                        <span
                                          className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
                                          title="Singkatan di nomor slip"
                                        >
                                          PS-{ct.abbreviation}
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <StatusBadge status={ct.isActive ? "Active" : "Inactive"} />
                                      {canManage && (
                                        <>
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
                                        </>
                                      )}
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
              {!editingCover ? (
                <p className="text-[11px] text-muted-foreground">
                  Dua digit kode COB sudah terisi. Lanjutkan dengan nomor urut,
                  misalnya ketik 11 untuk 0311.
                </p>
              ) : null}
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

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cover-abbreviation" className="text-xs font-medium">
                Singkatan di Nomor Slip
              </Label>
              <Input
                id="cover-abbreviation"
                placeholder="Contoh: PAR, IAR, MC"
                value={coverAbbreviation}
                onChange={(e) => setCoverAbbreviation(e.target.value.toUpperCase())}
                maxLength={10}
                className="h-8.5 font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Dipakai di nomor slip, misalnya 001/LCH-PLCMT/PS-PAR/X/2026.
                Kosongkan bila nomor slip cukup PS tanpa singkatan.
              </p>
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
