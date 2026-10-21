"use client"

import * as React from "react"
import { Loader2, UserPlus, UserCog } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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
import { type RoleCode } from "@/lib/access"
import { RoleMultiSelect } from "./role-multi-select"
import {
  createUserAction,
  updateUserAction,
} from "@/app/(app)/users/actions"
import type { UserSummary } from "@/lib/server/users"

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: UserSummary | null
  currentUserId?: string
  onSuccess: (payload: { user: UserSummary; temporaryPassword?: string }) => void
}

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  currentUserId,
  onSuccess,
}: UserFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-125">
        {open ? (
          <UserFormContent
            key={user?.id ?? "new"}
            user={user}
            currentUserId={currentUserId}
            onOpenChange={onOpenChange}
            onSuccess={onSuccess}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function UserFormContent({
  user,
  currentUserId,
  onOpenChange,
  onSuccess,
}: {
  user?: UserSummary | null
  currentUserId?: string
  onOpenChange: (open: boolean) => void
  onSuccess: (payload: { user: UserSummary; temporaryPassword?: string }) => void
}) {
  const isEditing = Boolean(user)
  const [isPending, startTransition] = React.useTransition()

  const [name, setName] = React.useState(user?.name ?? "")
  const [email, setEmail] = React.useState(user?.email ?? "")
  const [jobTitle, setJobTitle] = React.useState(user?.jobTitle ?? "")
  const [selectedRoles, setSelectedRoles] = React.useState<RoleCode[]>(user?.roles ?? [])
  const [isActive, setIsActive] = React.useState(user?.isActive ?? true)
  const [formError, setFormError] = React.useState<string | null>(null)

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)

    if (!name.trim()) {
      setFormError("Nama lengkap wajib diisi.")
      return
    }

    if (!email.trim()) {
      setFormError("Email wajib diisi.")
      return
    }

    if (selectedRoles.length === 0) {
      setFormError("Pilih minimal satu peran (role) untuk pengguna.")
      return
    }

    const formData = new FormData()
    formData.append("name", name.trim())
    formData.append("email", email.trim().toLowerCase())
    formData.append("jobTitle", jobTitle.trim())
    selectedRoles.forEach((role) => formData.append("roles", role))

    startTransition(async () => {
      try {
        if (isEditing && user) {
          formData.append("id", user.id)
          formData.append("isActive", isActive ? "true" : "false")
          const res = await updateUserAction(null, formData)
          if (!res.ok || !res.data) {
            setFormError(res.error ?? "Gagal memperbarui pengguna.")
            toast.error(res.error ?? "Gagal memperbarui pengguna.")
            return
          }
          toast.success("Data pengguna berhasil diperbarui.")
          onSuccess({ user: res.data })
          onOpenChange(false)
        } else {
          const res = await createUserAction(null, formData)
          if (!res.ok || !res.data) {
            setFormError(res.error ?? "Gagal menambahkan pengguna.")
            toast.error(res.error ?? "Gagal menambahkan pengguna.")
            return
          }
          toast.success("Pengguna baru berhasil ditambahkan.")
          onSuccess({
            user: res.data.user,
            temporaryPassword: res.data.temporaryPassword,
          })
          onOpenChange(false)
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Terjadi kesalahan sistem."
        setFormError(msg)
        toast.error(msg)
      }
    })
  }

  const isSelf = user?.id === currentUserId

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            {isEditing ? (
              <UserCog className="size-4" />
            ) : (
              <UserPlus className="size-4" />
            )}
          </div>
          <DialogTitle>
            {isEditing ? "Edit Pengguna" : "Tambah Pengguna Baru"}
          </DialogTitle>
        </div>
        <DialogDescription>
          {isEditing
            ? "Perbarui informasi akun, jabatan, dan hak akses pengguna."
            : "Masukkan informasi akun dan pilih hak akses peran."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        {formError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {formError}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="user-name">
            Nama Lengkap <span className="text-destructive">*</span>
          </Label>
          <Input
            id="user-name"
            placeholder="Contoh: Budi Santoso"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isPending}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="user-email">
            Alamat Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="user-email"
            type="email"
            placeholder="nama@lch.co.id"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isPending}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="user-job-title">Jabatan / Posisi</Label>
          <Input
            id="user-job-title"
            placeholder="Contoh: SPV, Staff, Direktur"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="user-roles">
              Peran Pengguna (Multi-Role) <span className="text-destructive">*</span>
            </Label>
            <span className="text-xs text-muted-foreground">
              {selectedRoles.length} dipilih
            </span>
          </div>
          <RoleMultiSelect
            id="user-roles"
            value={selectedRoles}
            onChange={setSelectedRoles}
            disabled={isPending}
          />
        </div>

        {isEditing && (
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="user-status" className="cursor-pointer">
                Status Akun
              </Label>
              <p className="text-xs text-muted-foreground">
                {isActive
                  ? "Akun aktif dan dapat masuk ke sistem."
                  : "Akun nonaktif dan seluruh sesi akan dicabut."}
              </p>
              {isSelf && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  Akun sendiri tidak dapat dinonaktifkan.
                </p>
              )}
            </div>
            <Switch
              id="user-status"
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={isPending || isSelf}
            />
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Batal
          </Button>
          <Button type="submit" disabled={isPending} className="gap-2">
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {isEditing ? "Simpan Perubahan" : "Buat Pengguna"}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}
