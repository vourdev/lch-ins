"use client"

import * as React from "react"
import { Plus, Power } from "lucide-react"
import { toast } from "sonner"

import {
  createWordingFormAction,
  toggleWordingFormStatusAction,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { WordingForm } from "@/lib/generated/prisma/client"

export interface WordingFormsTabProps {
  initialWordingForms: WordingForm[]
}

export function WordingFormsTab({ initialWordingForms }: WordingFormsTabProps) {
  const permission = usePermission()
  const canManage = permission.canManage("/master-data")
  const [wordingForms, setWordingForms] = React.useState<WordingForm[]>(initialWordingForms)
  const [search, setSearch] = React.useState("")
  const [isPending, startTransition] = React.useTransition()

  const [wordingDialogOpen, setWordingDialogOpen] = React.useState(false)
  const [wordingName, setWordingName] = React.useState("")

  const [prevWordingForms, setPrevWordingForms] = React.useState(initialWordingForms)
  if (prevWordingForms !== initialWordingForms) {
    setPrevWordingForms(initialWordingForms)
    setWordingForms(initialWordingForms)
  }

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return wordingForms
    return wordingForms.filter((w) => w.name.toLowerCase().includes(q))
  }, [wordingForms, search])

  const {
    page,
    pageSize,
    totalItems,
    paginatedItems,
    setPage,
    setPageSize,
  } = usePagination(filtered, 10)

  function handleSaveWording() {
    if (!wordingName.trim()) {
      toast.error("Nama wording form wajib diisi")
      return
    }

    startTransition(async () => {
      const res = await createWordingFormAction({ name: wordingName })
      if (!res.ok || !res.data) {
        toast.error(res.error)
        return
      }
      toast.success("Wording form baru berhasil ditambahkan")
      setWordingForms((prev) => [res.data as WordingForm, ...prev])
      setWordingName("")
      setWordingDialogOpen(false)
    })
  }

  function handleToggleWording(id: string, current: boolean) {
    const next = !current
    startTransition(async () => {
      const res = await toggleWordingFormStatusAction(id, next)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setWordingForms((prev) => prev.map((w) => (w.id === id ? { ...w, isActive: next } : w)))
      toast.success(next ? "Wording form diaktifkan" : "Wording form dinonaktifkan")
    })
  }

  // Pola baris sama dengan Manajemen Pengguna: aksi di menu kolom pertama.
  function actionsFor(w: WordingForm): RowAction[] {
    return [
      {
        label: w.isActive ? "Nonaktifkan" : "Aktifkan",
        icon: Power,
        disabled: isPending,
        onSelect: () => handleToggleWording(w.id, w.isActive),
      },
    ]
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder="Cari nama wording form…"
        />

        {canManage && (
          <Button
            onClick={() => {
              setWordingName("")
              setWordingDialogOpen(true)
            }}
          >
            <Plus data-icon="inline-start" />
            Tambah Wording Form
          </Button>
        )}
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <Table className="min-w-160">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {canManage && <TableHead className={ACTION_COL_CLASS}>Aksi</TableHead>}
              <TableHead>Nama Wording Form Baku</TableHead>
              <TableHead className="w-28 pr-4">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableEmpty
                colSpan={canManage ? 3 : 2}
                message={
                  search
                    ? `Tidak ada wording form yang cocok dengan "${search}".`
                    : "Belum ada data wording form polis baku."
                }
              />
            ) : (
              paginatedItems.map((w) => (
                <TableRow key={w.id}>
                  {canManage && (
                    <TableCell className={ACTION_COL_CLASS}>
                      <RowActions actions={actionsFor(w)} />
                    </TableCell>
                  )}
                  <TableCell className="font-medium text-foreground">{w.name}</TableCell>
                  <TableCell className="pr-4">
                    <StatusBadge status={w.isActive ? "Active" : "Inactive"} />
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
        itemName="wording form"
      />

      <Dialog open={wordingDialogOpen} onOpenChange={setWordingDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Wording Form Polis Baku</DialogTitle>
            <DialogDescription>
              Masukkan nama format baku polis asuransi (contoh: Polis Standar Asuransi Kendaraan
              Bermotor Indonesia / PSAKBI).
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wording-name">
                Nama Wording Form <span className="text-destructive">*</span>
              </Label>
              <Input
                id="wording-name"
                placeholder="Contoh: PSAKI (Polis Standar Asuransi Kebakaran Indonesia)"
                value={wordingName}
                onChange={(e) => setWordingName(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setWordingDialogOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveWording}
              disabled={isPending}
            >
              Simpan Wording Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
