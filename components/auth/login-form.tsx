"use client"

import * as React from "react"
import { AlertTriangle, Eye, EyeOff, LoaderCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { authClient, signIn, signOut } from "@/lib/auth-client"

const INACTIVE_MESSAGE =
  "Akun ini sudah dinonaktifkan. Hubungi Admin untuk mengaktifkan kembali."

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)
  const [checkingSession, setCheckingSession] = React.useState(false)

  // Tangani Back-Forward Cache (BFCache) dan verifikasi sesi client-side.
  // Jika peramban kembali ke /login lewat tombol Back saat sesi masih aktif,
  // segera alihkan pengguna ke rute yang sesuai tanpa menampilkan form login.
  React.useEffect(() => {
    let active = true

    async function checkAuthAndRedirect() {
      try {
        const session = await authClient.getSession()
        if (!active) return
        if (session?.data?.user) {
          const user = session.data.user as {
            mustChangePassword?: boolean
            isActive?: boolean
          }
          // Sesi lama milik akun yang kini nonaktif ditolak server. Kalau tetap
          // dialihkan, browser bolak-balik antara /login dan halaman tujuan.
          if (user.isActive === false) {
            await signOut()
            if (active) setError(INACTIVE_MESSAGE)
            return
          }
          setCheckingSession(true)
          const safeNext =
            next.startsWith("/") && !next.startsWith("//") ? next : "/"
          const target = user.mustChangePassword ? "/change-password" : safeNext
          window.location.replace(target)
        }
      } catch {
        // Abaikan error saat pengecekan sesi offline/background
      }
    }

    checkAuthAndRedirect()

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        checkAuthAndRedirect()
      }
    }

    window.addEventListener("pageshow", onPageShow)
    return () => {
      active = false
      window.removeEventListener("pageshow", onPageShow)
    }
  }, [next])

  async function onSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)

    const { data, error } = await signIn.email({ email, password })

    if (error) {
      // Better Auth error messages are in English and distinguish between
      // non-existent email and invalid password. Normalize to a single generic
      // message to prevent user enumeration. ACCOUNT_INACTIVE only comes back
      // after the password matched (lib/auth.ts), so it can be named.
      setError(
        error.code === "ACCOUNT_INACTIVE"
          ? INACTIVE_MESSAGE
          : "Email atau kata sandi salah."
      )
      setPending(false)
      return
    }

    // Defensive validation against open redirect or protocol-relative redirect
    const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/"
    const userMustChange = (data?.user as { mustChangePassword?: boolean } | undefined)
      ?.mustChangePassword
    const target = userMustChange ? "/change-password" : safeNext

    // Gantikan riwayat browser agar tombol Back tidak mengembalikan ke /login
    window.location.replace(target)
  }

  if (checkingSession) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center text-sm text-muted-foreground">
        <LoaderCircle className="mb-2 size-5 animate-spin text-primary" />
        <p>Memverifikasi sesi…</p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@lch.co.id"
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="password">Kata sandi</FieldLabel>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Field>

      {error ? (
        <p
          role="alert"
          className="flex items-start gap-1.5 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="mt-1 w-full">
        {pending ? (
          <>
            <LoaderCircle className="size-4 animate-spin" />
            Masuk…
          </>
        ) : (
          "Masuk"
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Lupa kata sandi? Hubungi Admin untuk disetel ulang.
      </p>
    </form>
  )
}
