import "server-only"

import { randomBytes } from "node:crypto"
import { hashPassword } from "better-auth/crypto"

import {
  ALLOWED_ROLE_CODES,
  validateRoleCodes,
  type RoleCode,
} from "@/lib/access"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/server/session"
import { recordAudit } from "@/server/services/audit"

export interface UserSummary {
  id: string
  name: string
  email: string
  roles: RoleCode[]
  jobTitle: string | null
  isActive: boolean
  mustChangePassword: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ListUsersParams {
  search?: string
  role?: string
  status?: "all" | "active" | "inactive"
}

/**
 * Buat kata sandi acak sementara yang kuat dan memenuhi standar keamanan.
 * Terdiri dari 16 karakter alfanumerik + karakter khusus.
 */
function generateTemporaryPassword(): string {
  const base = randomBytes(12).toString("base64url").slice(0, 14)
  return `${base}A1!`
}

/**
 * Mengambil daftar pengguna dengan filter dan pencarian.
 * Wajib Admin.
 */
export async function listUsers(
  params: ListUsersParams = {}
): Promise<UserSummary[]> {
  await requireAdmin("/users")

  const { search, role, status } = params
  const conditions: any[] = []

  if (search && search.trim()) {
    const q = search.trim()
    conditions.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { jobTitle: { contains: q, mode: "insensitive" } },
      ],
    })
  }

  if (role && role !== "all") {
    if (ALLOWED_ROLE_CODES.includes(role as RoleCode)) {
      conditions.push({
        roles: { has: role },
      })
    }
  }

  if (status && status !== "all") {
    conditions.push({
      isActive: status === "active",
    })
  }

  const where = conditions.length > 0 ? { AND: conditions } : {}

  const records = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      roles: true,
      jobTitle: true,
      isActive: true,
      mustChangePassword: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ createdAt: "asc" }],
  })

  return records.map((u) => ({
    ...u,
    roles: (u.roles as RoleCode[]) || [],
  }))
}

/**
 * Mengambil detail satu pengguna berdasarkan ID.
 * Wajib Admin.
 */
export async function getUserById(id: string): Promise<UserSummary | null> {
  await requireAdmin("/users")

  const u = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      roles: true,
      jobTitle: true,
      isActive: true,
      mustChangePassword: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!u) return null

  return {
    ...u,
    roles: (u.roles as RoleCode[]) || [],
  }
}

export interface CreateUserInput {
  name: string
  email: string
  roles: string[]
  jobTitle?: string | null
  isActive?: boolean
}

/**
 * Membuat akun pengguna baru, kredensial Better Auth, dan kata sandi sementara.
 * Wajib Admin.
 */
export async function createUser(data: CreateUserInput): Promise<{
  user: UserSummary
  temporaryPassword: string
}> {
  const admin = await requireAdmin("/users")

  const name = data.name?.trim()
  const email = data.email?.trim().toLowerCase()
  const jobTitle = data.jobTitle?.trim() || null
  const isActive = data.isActive ?? true

  if (!name || name.length < 2) {
    throw new Error("Nama lengkap wajib diisi minimal 2 karakter.")
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email || !emailRegex.test(email)) {
    throw new Error("Format alamat email tidak valid.")
  }

  const roleValidation = validateRoleCodes(data.roles)
  if (!roleValidation.valid) {
    throw new Error(roleValidation.error)
  }

  // Cek apakah email sudah terdaftar
  const existing = await prisma.user.findUnique({
    where: { email },
  })
  if (existing) {
    throw new Error(`Email ${email} sudah terdaftar di sistem.`)
  }

  const temporaryPassword = generateTemporaryPassword()
  const passwordHash = await hashPassword(temporaryPassword)

  // Buat pengguna dan akun kredensial Better Auth dalam transaksi
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name,
        email,
        roles: roleValidation.roles,
        jobTitle,
        isActive,
        mustChangePassword: true,
        emailVerified: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        roles: true,
        jobTitle: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    await tx.account.create({
      data: {
        userId: newUser.id,
        providerId: "credential",
        accountId: newUser.id,
        password: passwordHash,
      },
    })

    await recordAudit(tx, {
      userId: admin.id,
      entity: "users",
      entityId: newUser.id,
      action: "Create",
      after: {
        name: newUser.name,
        email: newUser.email,
        roles: newUser.roles,
        jobTitle: newUser.jobTitle,
        isActive: newUser.isActive,
      },
    })

    return newUser
  })

  return {
    user: {
      ...user,
      roles: (user.roles as RoleCode[]) || [],
    },
    temporaryPassword,
  }
}

export interface UpdateUserInput {
  name: string
  email: string
  roles: string[]
  jobTitle?: string | null
  isActive?: boolean
}

/**
 * Memperbarui profil pengguna, jabatan, dan penugasan role.
 * Memastikan proteksi last admin & pencegahan self-demotion/deactivation.
 * Wajib Admin.
 */
export async function updateUser(
  id: string,
  data: UpdateUserInput
): Promise<UserSummary> {
  const admin = await requireAdmin("/users")

  const name = data.name?.trim()
  const email = data.email?.trim().toLowerCase()
  const jobTitle = data.jobTitle?.trim() || null
  const isActive = data.isActive ?? true

  if (!name || name.length < 2) {
    throw new Error("Nama lengkap wajib diisi minimal 2 karakter.")
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email || !emailRegex.test(email)) {
    throw new Error("Format alamat email tidak valid.")
  }

  const roleValidation = validateRoleCodes(data.roles)
  if (!roleValidation.valid) {
    throw new Error(roleValidation.error)
  }

  const target = await prisma.user.findUnique({
    where: { id },
  })
  if (!target) {
    throw new Error("Pengguna tidak ditemukan.")
  }

  // Jika email berubah, cek duplikasi
  if (target.email !== email) {
    const emailConflict = await prisma.user.findUnique({
      where: { email },
    })
    if (emailConflict) {
      throw new Error(`Email ${email} sudah digunakan oleh akun lain.`)
    }
  }

  const hadAdminRole =
    target.roles.includes("admin") || target.roleId === "admin"
  const willHaveAdminRole = roleValidation.roles.includes("admin")

  // Proteksi 1: Pencegahan deaktivasi diri sendiri
  if (admin.id === id && !isActive) {
    throw new Error(
      "Anda tidak dapat menonaktifkan akun sendiri saat sedang masuk."
    )
  }

  // Proteksi 2: Pencegahan pencabutan role admin dari last active admin
  if (hadAdminRole && !willHaveAdminRole && target.isActive) {
    const activeAdmins = await prisma.user.count({
      where: {
        isActive: true,
        roles: { has: "admin" },
      },
    })
    if (activeAdmins <= 1) {
      throw new Error(
        "Tidak dapat mencabut role Admin dari satu-satunya administrator aktif sistem."
      )
    }
  }

  // Proteksi 3: Pencegahan penonaktifan last active admin
  if (hadAdminRole && target.isActive && !isActive) {
    const activeAdmins = await prisma.user.count({
      where: {
        isActive: true,
        roles: { has: "admin" },
      },
    })
    if (activeAdmins <= 1) {
      throw new Error(
        "Tidak dapat menonaktifkan satu-satunya administrator aktif sistem."
      )
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.user.update({
      where: { id },
      data: {
        name,
        email,
        roles: roleValidation.roles,
        jobTitle,
        isActive,
      },
      select: {
        id: true,
        name: true,
        email: true,
        roles: true,
        jobTitle: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Jika dinonaktifkan, cabut seluruh sesi aktifnya secara instan
    if (!isActive) {
      await tx.session.deleteMany({
        where: { userId: id },
      })
    }

    await recordAudit(tx, {
      userId: admin.id,
      entity: "users",
      entityId: id,
      action: "Update",
      before: {
        name: target.name,
        email: target.email,
        roles: target.roles,
        jobTitle: target.jobTitle,
        isActive: target.isActive,
      },
      after: {
        name: res.name,
        email: res.email,
        roles: res.roles,
        jobTitle: res.jobTitle,
        isActive: res.isActive,
      },
    })

    return res
  })

  return {
    ...updated,
    roles: (updated.roles as RoleCode[]) || [],
  }
}

/**
 * Mengubah status aktif/nonaktif akun pengguna.
 * Wajib Admin.
 */
export async function toggleUserStatus(
  id: string,
  isActive: boolean
): Promise<UserSummary> {
  const admin = await requireAdmin("/users")

  if (admin.id === id && !isActive) {
    throw new Error(
      "Anda tidak dapat menonaktifkan akun sendiri saat sedang masuk."
    )
  }

  const target = await prisma.user.findUnique({
    where: { id },
  })
  if (!target) {
    throw new Error("Pengguna tidak ditemukan.")
  }

  const hadAdminRole = target.roles.includes("admin")
  if (hadAdminRole && target.isActive && !isActive) {
    const activeAdmins = await prisma.user.count({
      where: {
        isActive: true,
        roles: { has: "admin" },
      },
    })
    if (activeAdmins <= 1) {
      throw new Error(
        "Tidak dapat menonaktifkan satu-satunya administrator aktif sistem."
      )
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        roles: true,
        jobTitle: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!isActive) {
      await tx.session.deleteMany({
        where: { userId: id },
      })
    }

    await recordAudit(tx, {
      userId: admin.id,
      entity: "users",
      entityId: id,
      action: "Update",
      before: { isActive: target.isActive },
      after: { isActive },
    })

    return res
  })

  return {
    ...updated,
    roles: (updated.roles as RoleCode[]) || [],
  }
}

/**
 * Mereset kata sandi pengguna ke kata sandi sementara baru,
 * menandai mustChangePassword = true, dan mencabut sesi lama.
 * Wajib Admin.
 */
export async function resetUserPassword(id: string): Promise<{
  temporaryPassword: string
}> {
  const admin = await requireAdmin("/users")

  const target = await prisma.user.findUnique({
    where: { id },
  })
  if (!target) {
    throw new Error("Pengguna tidak ditemukan.")
  }

  const temporaryPassword = generateTemporaryPassword()
  const passwordHash = await hashPassword(temporaryPassword)

  await prisma.$transaction(async (tx) => {
    const account = await tx.account.findFirst({
      where: { userId: id, providerId: "credential" },
    })

    if (account) {
      await tx.account.update({
        where: { id: account.id },
        data: { password: passwordHash },
      })
    } else {
      await tx.account.create({
        data: {
          userId: id,
          providerId: "credential",
          accountId: id,
          password: passwordHash,
        },
      })
    }

    await tx.user.update({
      where: { id },
      data: { mustChangePassword: true },
    })

    // Cabut seluruh sesi aktif yang ada
    await tx.session.deleteMany({
      where: { userId: id },
    })

    await recordAudit(tx, {
      userId: admin.id,
      entity: "users",
      entityId: id,
      action: "Update",
      after: { passwordReset: true },
    })
  })

  return { temporaryPassword }
}
