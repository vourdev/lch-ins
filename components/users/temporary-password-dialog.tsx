"use client"

import * as React from "react"
import { Check, Copy, KeyRound, ShieldAlert } from "lucide-react"
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

export function TemporaryPasswordDialog({
  open,
  onOpenChange,
  email,
  temporaryPassword,
  title = "Kata Sandi Sementara Dibuat",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  email: string
  temporaryPassword: string | null
  title?: string
}) {
  const [copied, setCopied] = React.useState(false)

  if (!temporaryPassword) return null

  async function handleCopy() {
    if (!temporaryPassword) return
    try {
      await navigator.clipboard.writeText(temporaryPassword)
      setCopied(true)
      toast.success("Kata sandi berhasil disalin ke clipboard")
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error("Gagal menyalin kata sandi")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <KeyRound className="size-4" />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>
            Kredensial sementara untuk akun <strong>{email}</strong>. Berikan
            kata sandi ini secara aman kepada pengguna.
          </DialogDescription>
        </DialogHeader>

        <div className="my-2 space-y-3">
          <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
            <code className="font-mono text-base font-semibold tracking-wider text-foreground select-all">
              {temporaryPassword}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-emerald-600" />
                  Tersalin
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  Salin
                </>
              )}
            </Button>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p>
              Kata sandi ini hanya ditampilkan satu kali di layar ini. Pengguna
              akan <strong>diwajibkan mengganti kata sandi</strong> saat pertama
              kali masuk ke sistem.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Selesai
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
