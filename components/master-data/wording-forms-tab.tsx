"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import {
  createWordingFormAction,
  toggleWordingFormStatusAction,
} from "@/app/(app)/master-data/actions"
import { StatusBadge } from "@/components/shared/status-badge"
import { TableEmpty } from "@/components/shared/table-empty"
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
import type { WordingForm } from "@/lib/generated/prisma/client"

export interface WordingFormsTabProps {
  initialWordingForms: WordingForm[]
}

export function WordingFormsTab({ initialWordingForms }: WordingFormsTabProps) {
  const permission = usePermission()
  const canManage = permission.canManage("/master-data")
  const [wordingForms, setWordingForms] = React.useState<WordingForm[]>(initialWordingForms)
  const [isPending, startTransition] = React.useTransition()

  const [wordingDialogOpen, setWordingDialogOpen] = React.useState(false)
  const [wordingName, setWordingName] = React.useState("")

  const [prevWordingForms, setPrevWordingForms] = React.useState(initialWordingForms)
  if (prevWordingForms !== initialWordingForms) {
    setPrevWordingForms(initialWordingForms)
    setWordingForms(initialWordingForms)
  }

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

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button
            size="sm"
            onClick={() => {
              setWordingName("")
              setWordingDialogOpen(true)
            }}
            className="h-9 gap-1.5 text-xs"
          >
            <Plus className="size-4" />
            Tambah Wording Form
          </Button>
        </div>
      )}

      <Card className="gap-0 overflow-hidden py-0">
        <Table className="min-w-200">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Nama Wording Form Baku</TableHead>
              <TableHead className="w-28">Status</TableHead>
              {canManage && <TableHead className="w-24 text-right pr-4">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {wordingForms.length === 0 ? (
              <TableEmpty colSpan={canManage ? 3 : 2} message="Belum ada data wording form polis baku." />
            ) : (
              wordingForms.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium text-foreground">{w.name}</TableCell>
                  <TableCell>
                    <StatusBadge status={w.isActive ? "Active" : "Inactive"} />
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end">
                        <Switch
                          checked={w.isActive}
                          onCheckedChange={() => handleToggleWording(w.id, w.isActive)}
                          disabled={isPending}
                          className="scale-75"
                          title={w.isActive ? "Nonaktifkan wording" : "Aktifkan wording"}
                        />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={wordingDialogOpen} onOpenChange={setWordingDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Wording Form Polis Baku</DialogTitle>
            <DialogDescription className="text-xs">
              Masukkan nama format baku polis asuransi (contoh: Polis Standar Asuransi Kendaraan
              Bermotor Indonesia / PSAKBI).
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2 text-xs">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wording-name" className="text-xs font-medium">
                Nama Wording Form <span className="text-destructive">*</span>
              </Label>
              <Input
                id="wording-name"
                placeholder="Contoh: PSAKI (Polis Standar Asuransi Kebakaran Indonesia)"
                value={wordingName}
                onChange={(e) => setWordingName(e.target.value)}
                className="h-8.5 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setWordingDialogOpen(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveWording}
              disabled={isPending}
              className="text-xs"
            >
              Simpan Wording Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
