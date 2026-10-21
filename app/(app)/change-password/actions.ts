"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { hashPassword, verifyPassword } from "better-auth/crypto"

import { CREDENTIAL_PROVIDER_ID } from "@/lib/constants"
import { prisma } from "@/lib/prisma"
import { currentUser } from "@/lib/server/session"

export interface ChangePasswordResult {
  error?: string
  success?: boolean
}

export async function changePasswordAction(
  _prevState: ChangePasswordResult | null,
  formData: FormData
): Promise<ChangePasswordResult> {
  const user = await currentUser()
  if (!user) {
    return { error: "Sesi tidak ditemukan. Silakan login kembali." }
  }

  const currentPassword =
    formData.get("currentPassword")?.toString().trim() ?? ""
  const newPassword = formData.get("newPassword")?.toString().trim() ?? ""
  const confirmPassword =
    formData.get("confirmPassword")?.toString().trim() ?? ""

  if (!currentPassword) {
    return { error: "Kata sandi saat ini wajib diisi." }
  }
  if (!newPassword || newPassword.length < 10) {
    return { error: "Kata sandi baru minimal 10 karakter." }
  }
  if (newPassword !== confirmPassword) {
    return { error: "Konfirmasi kata sandi baru tidak cocok." }
  }
  if (currentPassword === newPassword) {
    return {
      error: "Kata sandi baru tidak boleh sama dengan kata sandi saat ini.",
    }
  }

  const account = await prisma.account.findFirst({
    where: { userId: user.id, providerId: CREDENTIAL_PROVIDER_ID },
  })

  if (!account || !account.password) {
    return { error: "Akun kredensial tidak ditemukan." }
  }

  const isCurrentValid = await verifyPassword({
    password: currentPassword,
    hash: account.password,
  })

  if (!isCurrentValid) {
    return { error: "Kata sandi saat ini salah." }
  }

  const newHash = await hashPassword(newPassword)

  await prisma.$transaction([
    prisma.account.update({
      where: { id: account.id },
      data: { password: newHash },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { mustChangePassword: false },
    }),
  ])

  revalidatePath("/", "layout")
  redirect("/")
}
