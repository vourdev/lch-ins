"use client"

import { useState } from "react"
import { useActionState } from "react"
import { AlertTriangle, Eye, EyeOff, LoaderCircle, LogOut } from "lucide-react"

import { changePasswordAction, type ChangePasswordResult } from "@/app/(app)/change-password/actions"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { signOut } from "@/lib/auth-client"

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<
    ChangePasswordResult | null,
    FormData
  >(changePasswordAction, null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {/* 4. Current password */}
      <Field className="gap-1.5">
        <FieldLabel htmlFor="currentPassword" className="text-sm font-medium">
          Kata sandi saat ini
        </FieldLabel>
        <div className="relative">
          <Input
            id="currentPassword"
            name="currentPassword"
            type={showCurrentPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            autoFocus
            placeholder="Masukkan kata sandi sementara"
            className="rounded-lg pr-10 text-sm"
          />
          <button
            type="button"
            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showCurrentPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          >
            {showCurrentPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
      </Field>

      {/* 5. New password */}
      <Field className="gap-1.5">
        <FieldLabel htmlFor="newPassword" className="text-sm font-medium">
          Kata sandi baru
        </FieldLabel>
        <div className="relative">
          <Input
            id="newPassword"
            name="newPassword"
            type={showNewPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            placeholder="Minimal 10 karakter"
            className="rounded-lg pr-10 text-sm"
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showNewPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          >
            {showNewPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
      </Field>

      {/* 6. Confirm new password */}
      <Field className="gap-1.5">
        <FieldLabel htmlFor="confirmPassword" className="text-sm font-medium">
          Konfirmasi kata sandi baru
        </FieldLabel>
        <div className="relative">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            placeholder="Ulangi kata sandi baru"
            className="rounded-lg pr-10 text-sm"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showConfirmPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          >
            {showConfirmPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
      </Field>

      {/* 7. Inline validation & error messages */}
      {state?.error ? (
        <p
          role="alert"
          className="flex items-start gap-1.5 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>{state.error}</span>
        </p>
      ) : null}

      {/* 8. Primary action */}
      <Button
        type="submit"
        disabled={pending}
        className="mt-1 h-10 w-full rounded-lg text-sm font-medium"
      >
        {pending ? (
          <>
            <LoaderCircle className="size-4 animate-spin mr-2" />
            Menyimpan kata sandi…
          </>
        ) : (
          "Simpan kata sandi baru"
        )}
      </Button>

      {/* 9. Secondary logout action */}
      <Button
        type="button"
        variant="ghost"
        className="h-10 w-full rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground gap-2"
        onClick={async () => {
          try {
            await signOut()
          } finally {
            window.location.replace("/login")
          }
        }}
      >
        <LogOut className="size-4" />
        <span>Logout</span>
      </Button>
    </form>
  )
}
