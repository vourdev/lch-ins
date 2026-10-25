import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { connection } from "next/server"

import { LoginForm } from "@/components/auth/login-form"
import { LchLogo } from "@/components/documents/letterhead"
import { currentUser } from "@/lib/server/session"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Masuk — LCH Insurance Brokers" }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  await connection()
  const { next } = await searchParams
  // Hanya terima path internal, supaya parameter ini tidak bisa dipakai
  // mengarahkan pengguna ke situs lain setelah login.
  const target = next?.startsWith("/") && !next.startsWith("//") ? next : "/"

  // Jika pengguna sudah memiliki sesi aktif yang valid di database,
  // langsung arahkan ke tujuan (atau dashboard). Pemeriksaan dilakukan di sini
  // dan bukan di proxy agar cookie kedaluwarsa/stale tidak memicu infinite redirect.
  const user = await currentUser()
  if (user) {
    if (user.mustChangePassword) {
      redirect("/change-password")
    }
    redirect(target)
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          <h1 className="sr-only">PT. LCH Insurance Brokers</h1>
          <div className="rounded-xl bg-white px-5 py-3 shadow-sm ring-1 ring-black/5">
            <LchLogo alt="" className="h-10 w-auto" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Sistem Back Office
          </p>
        </div>

        <div className="rounded-xl border bg-background p-6 shadow-sm">
          <LoginForm next={target} />
        </div>
      </div>
    </main>
  )
}
