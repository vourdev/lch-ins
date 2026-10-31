"use server"

import { revalidatePath } from "next/cache"
import { unstable_rethrow } from "next/navigation"
import { z } from "zod"

import type {
  Adjuster,
  BankAccount,
  CoverType,
  Currency,
  Insurer,
  LookupValue,
  VehicleBrand,
  VehicleType,
  WordingForm,
} from "@/lib/generated/prisma/client"
import {
  createCobOjkClass,
  updateCobOjkClass,
  type CobOjkClassRecord,
} from "@/lib/server/cob-ojk-classes"
import {
  createAdjuster,
  createBankAccount,
  createCoverType,
  createCurrency,
  createInsurer,
  createLookupValue,
  createWordingForm,
  deleteCoverType,
  deleteLookupValue,
  toggleAdjusterStatus,
  toggleBankAccountStatus,
  toggleCobStatus,
  toggleCoverTypeStatus,
  toggleCurrencyStatus,
  toggleInsurerStatus,
  toggleLookupValueStatus,
  toggleWordingFormStatus,
  updateAdjuster,
  updateBankAccount,
  updateCoverType,
  updateInsurer,
  updateLookupValue,
} from "@/lib/server/master-data"
import { requireManage } from "@/lib/server/session"
import {
  createVehicleBrand,
  createVehicleType,
  deleteVehicleBrand,
  deleteVehicleType,
  toggleVehicleBrandStatus,
  toggleVehicleTypeStatus,
  updateVehicleBrand,
  updateVehicleType,
} from "@/lib/server/vehicles"

export interface ActionResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: string
}

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const coverTypeSchema = z.object({
  cobId: z.string().min(1, "Pilih COB yang valid"),
  code: z.string().trim().min(3, "Kode Cover Type minimal 3 karakter"),
  name: z.string().trim().min(2, "Nama Cover Type minimal 2 karakter"),
  // Masuk ke nomor slip (PS-PAR), jadi tidak boleh berisi garis miring atau
  // spasi yang memecah format nomor.
  abbreviation: z
    .string()
    .trim()
    .max(10, "Singkatan maksimal 10 karakter")
    .regex(/^[A-Za-z0-9]*$/, "Singkatan hanya huruf dan angka, tanpa spasi")
    .transform((v) => (v ? v.toUpperCase() : null))
    .nullish(),
  isActive: z.boolean().optional(),
})

const currencySchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/, "Kode mata uang harus 3 huruf (ISO 4217), contoh JPY")
    .transform((v) => v.toUpperCase()),
  name: z.string().trim().min(2, "Nama mata uang minimal 2 karakter"),
})

const insurerSchema = z.object({
  name: z.string().trim().min(2, "Nama Asuransi minimal 2 karakter"),
  contactPerson: z.string().trim().nullish(),
  email: z.string().trim().nullish(),
  phone: z.string().trim().nullish(),
  address: z.string().trim().nullish(),
  isActive: z.boolean().optional(),
})

const adjusterSchema = z.object({
  name: z.string().trim().min(2, "Nama Adjuster minimal 2 karakter"),
  contactPerson: z.string().trim().nullish(),
  email: z.string().trim().nullish(),
  phone: z.string().trim().nullish(),
  address: z.string().trim().nullish(),
  isActive: z.boolean().optional(),
})

const bankAccountSchema = z.object({
  bankId: z.string().min(1, "Pilih bank yang valid"),
  accountNo: z.string().trim().min(3, "Nomor rekening minimal 3 karakter"),
  accountName: z.string().trim().min(3, "Nama pemilik rekening minimal 3 karakter"),
  currencyCode: z.string().trim().min(2, "Pilih mata uang"),
  isPremiumTrust: z.boolean().optional(),
  coaAccountId: z.string().nullish(),
  isActive: z.boolean().optional(),
})

const wordingFormSchema = z.object({
  name: z.string().trim().min(2, "Nama wording form minimal 2 karakter"),
})

const lookupValueSchema = z.object({
  lookupType: z.string().trim().min(2, "Tipe lookup minimal 2 karakter"),
  code: z.string().trim().min(1, "Kode nilai minimal 1 karakter"),
  name: z.string().trim().min(1, "Label tampilan minimal 1 karakter"),
  sortOrder: z.coerce.number().int().default(0),
  isSystem: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

// ---------------------------------------------------------------------------
// 1. COB Actions
// ---------------------------------------------------------------------------

// Dari aplikasi, COB hanya bisa diaktifkan atau dinonaktifkan. Tambah, ubah,
// dan hapus COB dikerjakan developer lewat migrasi, sesuai kesepakatan dengan
// LCH pada 31 Oktober 2026: COB baru perlu penyesuaian form placing slip,
// satuan rate, tarif, dan dokumen cetak sebelum bisa dipakai.

export async function toggleCobStatusAction(
  id: string,
  isActive: boolean
): Promise<ActionResponse<void>> {
  try {
    const session = await requireManage("/master-data")
    await toggleCobStatus(id, isActive, session.id)
    revalidatePath("/master-data")
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal mengubah status COB",
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Cover Type Actions
// ---------------------------------------------------------------------------

export async function createCoverTypeAction(
  data: z.infer<typeof coverTypeSchema>
): Promise<ActionResponse<CoverType>> {
  try {
    const session = await requireManage("/master-data")
    const parsed = coverTypeSchema.parse(data)
    const res = await createCoverType(parsed, session.id)
    revalidatePath("/master-data")
    return { ok: true, data: res }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal menambah Cover Type",
    }
  }
}

export async function updateCoverTypeAction(
  id: string,
  data: z.infer<typeof coverTypeSchema>
): Promise<ActionResponse<CoverType>> {
  try {
    const session = await requireManage("/master-data")
    const parsed = coverTypeSchema.parse(data)
    const res = await updateCoverType(id, parsed, session.id)
    revalidatePath("/master-data")
    return { ok: true, data: res }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal memperbarui Cover Type",
    }
  }
}

export async function toggleCoverTypeStatusAction(
  id: string,
  isActive: boolean
): Promise<ActionResponse<void>> {
  try {
    const session = await requireManage("/master-data")
    await toggleCoverTypeStatus(id, isActive, session.id)
    revalidatePath("/master-data")
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal mengubah status Cover Type",
    }
  }
}

export async function deleteCoverTypeAction(
  id: string
): Promise<ActionResponse<void>> {
  try {
    const session = await requireManage("/master-data")
    await deleteCoverType(id, session.id)
    revalidatePath("/master-data")
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal menghapus Cover Type",
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Insurers & Adjusters Actions
// ---------------------------------------------------------------------------

export async function createInsurerAction(
  data: z.infer<typeof insurerSchema>
): Promise<ActionResponse<Insurer>> {
  try {
    const session = await requireManage("/master-data")
    const parsed = insurerSchema.parse(data)
    const res = await createInsurer(parsed, session.id)
    revalidatePath("/master-data")
    return { ok: true, data: res }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal menambah data asuradur",
    }
  }
}

export async function updateInsurerAction(
  id: string,
  data: z.infer<typeof insurerSchema>
): Promise<ActionResponse<Insurer>> {
  try {
    const session = await requireManage("/master-data")
    const parsed = insurerSchema.parse(data)
    const res = await updateInsurer(id, parsed, session.id)
    revalidatePath("/master-data")
    return { ok: true, data: res }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal memperbarui data asuradur",
    }
  }
}

export async function toggleInsurerStatusAction(
  id: string,
  isActive: boolean
): Promise<ActionResponse<void>> {
  try {
    const session = await requireManage("/master-data")
    await toggleInsurerStatus(id, isActive, session.id)
    revalidatePath("/master-data")
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal mengubah status asuradur",
    }
  }
}

export async function createAdjusterAction(
  data: z.infer<typeof adjusterSchema>
): Promise<ActionResponse<Adjuster>> {
  try {
    const session = await requireManage("/master-data")
    const parsed = adjusterSchema.parse(data)
    const res = await createAdjuster(parsed, session.id)
    revalidatePath("/master-data")
    return { ok: true, data: res }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal menambah data adjuster",
    }
  }
}

export async function updateAdjusterAction(
  id: string,
  data: z.infer<typeof adjusterSchema>
): Promise<ActionResponse<Adjuster>> {
  try {
    const session = await requireManage("/master-data")
    const parsed = adjusterSchema.parse(data)
    const res = await updateAdjuster(id, parsed, session.id)
    revalidatePath("/master-data")
    return { ok: true, data: res }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal memperbarui data adjuster",
    }
  }
}

export async function toggleAdjusterStatusAction(
  id: string,
  isActive: boolean
): Promise<ActionResponse<void>> {
  try {
    const session = await requireManage("/master-data")
    await toggleAdjusterStatus(id, isActive, session.id)
    revalidatePath("/master-data")
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal mengubah status adjuster",
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Bank Account & Wording Form Actions
// ---------------------------------------------------------------------------

export async function createBankAccountAction(
  data: z.infer<typeof bankAccountSchema>
): Promise<ActionResponse<BankAccount>> {
  try {
    const session = await requireManage("/master-data")
    const parsed = bankAccountSchema.parse(data)
    const res = await createBankAccount(parsed, session.id)
    revalidatePath("/master-data")
    return { ok: true, data: res }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal menambah rekening bank",
    }
  }
}

export async function updateBankAccountAction(
  id: string,
  data: z.infer<typeof bankAccountSchema>
): Promise<ActionResponse<BankAccount>> {
  try {
    const session = await requireManage("/master-data")
    const parsed = bankAccountSchema.parse(data)
    const res = await updateBankAccount(id, parsed, session.id)
    revalidatePath("/master-data")
    return { ok: true, data: res }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal memperbarui rekening bank",
    }
  }
}

export async function toggleBankAccountStatusAction(
  id: string,
  isActive: boolean
): Promise<ActionResponse<void>> {
  try {
    const session = await requireManage("/master-data")
    await toggleBankAccountStatus(id, isActive, session.id)
    revalidatePath("/master-data")
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal mengubah status rekening bank",
    }
  }
}

export async function createCurrencyAction(
  data: z.input<typeof currencySchema>
): Promise<ActionResponse<Currency>> {
  try {
    const session = await requireManage("/master-data")
    const parsed = currencySchema.parse(data)
    const res = await createCurrency(parsed, session.id)
    revalidatePath("/master-data")
    return { ok: true, data: res }
  } catch (err) {
    unstable_rethrow(err)
    return {
      ok: false,
      error: err instanceof z.ZodError
        ? err.issues[0]?.message ?? "Data mata uang tidak valid"
        : err instanceof Error
          ? err.message
          : "Gagal menambah mata uang",
    }
  }
}

export async function toggleCurrencyStatusAction(
  code: string,
  isActive: boolean
): Promise<ActionResponse<void>> {
  try {
    const session = await requireManage("/master-data")
    await toggleCurrencyStatus(code, isActive, session.id)
    revalidatePath("/master-data")
    return { ok: true }
  } catch (err) {
    unstable_rethrow(err)
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal mengubah status mata uang",
    }
  }
}

export async function createWordingFormAction(
  data: z.infer<typeof wordingFormSchema>
): Promise<ActionResponse<WordingForm>> {
  try {
    const session = await requireManage("/master-data")
    const parsed = wordingFormSchema.parse(data)
    const res = await createWordingForm(parsed.name, session.id)
    revalidatePath("/master-data")
    return { ok: true, data: res }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal menambah wording form",
    }
  }
}

export async function toggleWordingFormStatusAction(
  id: string,
  isActive: boolean
): Promise<ActionResponse<void>> {
  try {
    const session = await requireManage("/master-data")
    await toggleWordingFormStatus(id, isActive, session.id)
    revalidatePath("/master-data")
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal mengubah status wording form",
    }
  }
}

// ---------------------------------------------------------------------------
// 5. Lookup Values Actions
// ---------------------------------------------------------------------------

export async function createLookupValueAction(
  data: z.infer<typeof lookupValueSchema>
): Promise<ActionResponse<LookupValue>> {
  try {
    const session = await requireManage("/master-data")
    const parsed = lookupValueSchema.parse(data)
    const res = await createLookupValue(parsed, session.id)
    revalidatePath("/master-data")
    return { ok: true, data: res }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal menambah nilai lookup",
    }
  }
}

export async function updateLookupValueAction(
  id: string,
  data: z.infer<typeof lookupValueSchema>
): Promise<ActionResponse<LookupValue>> {
  try {
    const session = await requireManage("/master-data")
    const parsed = lookupValueSchema.parse(data)
    const res = await updateLookupValue(id, parsed, session.id)
    revalidatePath("/master-data")
    return { ok: true, data: res }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal memperbarui nilai lookup",
    }
  }
}

export async function toggleLookupValueStatusAction(
  id: string,
  isActive: boolean
): Promise<ActionResponse<void>> {
  try {
    const session = await requireManage("/master-data")
    await toggleLookupValueStatus(id, isActive, session.id)
    revalidatePath("/master-data")
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal mengubah status nilai lookup",
    }
  }
}

export async function deleteLookupValueAction(
  id: string
): Promise<ActionResponse<void>> {
  try {
    const session = await requireManage("/master-data")
    await deleteLookupValue(id, session.id)
    revalidatePath("/master-data")
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal menghapus nilai lookup",
    }
  }
}

const cobOjkClassSchema = z.object({
  name: z.string().trim().min(2, "Nama klasifikasi OJK minimal 2 karakter").max(150),
  isActive: z.boolean(),
})

const cobOjkClassIdSchema = z.uuid("ID klasifikasi OJK tidak valid")

export async function createCobOjkClassAction(
  data: z.infer<typeof cobOjkClassSchema>
): Promise<ActionResponse<CobOjkClassRecord>> {
  try {
    const session = await requireManage("/master-data")
    const parsed = cobOjkClassSchema.safeParse(data)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message }
    const res = await createCobOjkClass(parsed.data.name, session.id)
    revalidatePath("/master-data")
    revalidatePath("/policies")
    return { ok: true, data: res }
  } catch (err) {
    unstable_rethrow(err)
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal menambah klasifikasi OJK",
    }
  }
}

export async function updateCobOjkClassAction(
  id: string,
  data: z.infer<typeof cobOjkClassSchema>
): Promise<ActionResponse<CobOjkClassRecord>> {
  try {
    const session = await requireManage("/master-data")
    const classId = cobOjkClassIdSchema.safeParse(id)
    if (!classId.success) return { ok: false, error: "ID klasifikasi OJK tidak valid" }
    const parsed = cobOjkClassSchema.safeParse(data)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message }
    const res = await updateCobOjkClass(classId.data, parsed.data, session.id)
    revalidatePath("/master-data")
    revalidatePath("/policies")
    return { ok: true, data: res }
  } catch (err) {
    unstable_rethrow(err)
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal memperbarui klasifikasi OJK",
    }
  }
}

// ---------------------------------------------------------------------------
// Merek dan tipe kendaraan
// ---------------------------------------------------------------------------

const vehicleIdSchema = z.uuid()

const vehicleBrandSchema = z.object({
  name: z.string().trim().min(1, "Nama merek wajib diisi"),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

const vehicleTypeSchema = z.object({
  brandId: z.uuid("Pilih merek yang valid"),
  name: z.string().trim().min(1, "Nama tipe wajib diisi"),
  isActive: z.boolean().optional(),
})

const vehicleTypeUpdateSchema = z.object({
  brandId: z.uuid("Pilih merek yang valid").optional(),
  name: z.string().trim().min(1, "Nama tipe wajib diisi"),
  isActive: z.boolean().optional(),
})

/** Shared wrapper: access check, revalidation of every page that lists vehicles, and error text. */
async function vehicleAction<T>(
  fallbackError: string,
  run: (userId: string) => Promise<T>
): Promise<ActionResponse<T>> {
  try {
    const session = await requireManage("/master-data")
    const data = await run(session.id)
    revalidatePath("/master-data")
    revalidatePath("/marketing")
    revalidatePath("/underwriting")
    return { ok: true, data }
  } catch (err) {
    unstable_rethrow(err)
    return { ok: false, error: err instanceof Error ? err.message : fallbackError }
  }
}

function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown, message?: string): T {
  const parsed = schema.safeParse(value)
  if (!parsed.success) throw new Error(message ?? parsed.error.issues[0]?.message)
  return parsed.data
}

export async function createVehicleBrandAction(
  data: z.infer<typeof vehicleBrandSchema>
): Promise<ActionResponse<VehicleBrand>> {
  return vehicleAction("Gagal menambah merek", (userId) =>
    createVehicleBrand(parseOrThrow(vehicleBrandSchema, data), userId)
  )
}

export async function updateVehicleBrandAction(
  id: string,
  data: z.infer<typeof vehicleBrandSchema>
): Promise<ActionResponse<VehicleBrand>> {
  return vehicleAction("Gagal memperbarui merek", (userId) =>
    updateVehicleBrand(
      parseOrThrow(vehicleIdSchema, id, "Merek tidak valid"),
      parseOrThrow(vehicleBrandSchema, data),
      userId
    )
  )
}

export async function toggleVehicleBrandStatusAction(
  id: string,
  isActive: boolean
): Promise<ActionResponse<void>> {
  return vehicleAction("Gagal mengubah status merek", (userId) =>
    toggleVehicleBrandStatus(
      parseOrThrow(vehicleIdSchema, id, "Merek tidak valid"),
      isActive,
      userId
    )
  )
}

export async function deleteVehicleBrandAction(id: string): Promise<ActionResponse<void>> {
  return vehicleAction("Gagal menghapus merek", (userId) =>
    deleteVehicleBrand(parseOrThrow(vehicleIdSchema, id, "Merek tidak valid"), userId)
  )
}

export async function createVehicleTypeAction(
  data: z.infer<typeof vehicleTypeSchema>
): Promise<ActionResponse<VehicleType>> {
  return vehicleAction("Gagal menambah tipe", (userId) =>
    createVehicleType(parseOrThrow(vehicleTypeSchema, data), userId)
  )
}

export async function updateVehicleTypeAction(
  id: string,
  data: z.infer<typeof vehicleTypeUpdateSchema>
): Promise<ActionResponse<VehicleType>> {
  return vehicleAction("Gagal memperbarui tipe", (userId) =>
    updateVehicleType(
      parseOrThrow(vehicleIdSchema, id, "Tipe tidak valid"),
      parseOrThrow(vehicleTypeUpdateSchema, data),
      userId
    )
  )
}

export async function toggleVehicleTypeStatusAction(
  id: string,
  isActive: boolean
): Promise<ActionResponse<void>> {
  return vehicleAction("Gagal mengubah status tipe", (userId) =>
    toggleVehicleTypeStatus(
      parseOrThrow(vehicleIdSchema, id, "Tipe tidak valid"),
      isActive,
      userId
    )
  )
}

export async function deleteVehicleTypeAction(id: string): Promise<ActionResponse<void>> {
  return vehicleAction("Gagal menghapus tipe", (userId) =>
    deleteVehicleType(parseOrThrow(vehicleIdSchema, id, "Tipe tidak valid"), userId)
  )
}
