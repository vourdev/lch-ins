"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import type { ClientStatus, SppaStatus } from "@/lib/data/types"
import {
  createClient,
  deleteClient,
  toggleClientStatus,
  updateClient,
  type ClientInput,
  type ClientRecord,
} from "@/lib/server/clients"
import {
  createSppa,
  deleteSppa,
  toggleSppaStatus,
  updateSppa,
  type SppaInput,
  type SppaRecord,
} from "@/lib/server/sppa"
import { requireManage } from "@/lib/server/session"

export interface ActionResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: string
}

const clientInputSchema = z.object({
  clientType: z.enum(["Korporasi", "Perorangan"]),
  name: z.string().trim().min(1, "Nama klien wajib diisi"),
  npwp: z.string().nullish(),
  idType: z.string().nullish(),
  idNumber: z.string().nullish(),
  birthPlace: z.string().nullish(),
  birthDate: z.string().nullish(),
  contactPerson: z.string().nullish(),
  contactPersonIdNumber: z.string().nullish(),
  email: z.string().nullish(),
  phone: z.string().nullish(),
  incomeSource: z.string().nullish(),
  insurancePurpose: z.string().nullish(),
  insurancePurposeNote: z.string().nullish(),
  kycDate: z.string().nullish(),
  cob: z.string().nullish(),
  status: z.string().nullish(),
  notes: z.string().nullish(),
  addresses: z
    .array(
      z.object({
        id: z.string().optional(),
        label: z.string().min(1, "Jenis alamat wajib diisi"),
        value: z.string().min(1, "Alamat wajib diisi"),
        isPrimary: z.boolean().optional(),
      })
    )
    .optional(),
  documents: z
    .array(
      z.object({
        id: z.string().optional(),
        type: z.string(),
        fileName: z.string(),
        url: z.string().optional(),
      })
    )
    .optional(),
})

export async function createClientAction(
  input: ClientInput
): Promise<ActionResponse<ClientRecord>> {
  try {
    const user = await requireManage("/marketing")
    const parsed = clientInputSchema.safeParse(input)
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      return {
        ok: false,
        error: firstIssue ? firstIssue.message : "Data input klien tidak valid.",
      }
    }

    const created = await createClient(parsed.data as ClientInput, user.id)

    revalidatePath("/marketing")
    return { ok: true, data: created }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal menambahkan klien baru."
    return { ok: false, error: message }
  }
}

export async function updateClientAction(
  id: string,
  input: ClientInput
): Promise<ActionResponse<ClientRecord>> {
  try {
    const user = await requireManage("/marketing")
    if (!id || !id.trim()) {
      return { ok: false, error: "ID klien tidak valid." }
    }

    const parsed = clientInputSchema.safeParse(input)
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      return {
        ok: false,
        error: firstIssue ? firstIssue.message : "Data input klien tidak valid.",
      }
    }

    const updated = await updateClient(id.trim(), parsed.data as ClientInput, user.id)

    revalidatePath("/marketing")
    revalidatePath(`/marketing/clients/${id}`)
    return { ok: true, data: updated }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal memperbarui data klien."
    return { ok: false, error: message }
  }
}

export async function toggleClientStatusAction(
  id: string,
  status: ClientStatus
): Promise<ActionResponse<void>> {
  try {
    const user = await requireManage("/marketing")
    if (!id || !id.trim()) {
      return { ok: false, error: "ID klien tidak valid." }
    }

    await toggleClientStatus(id.trim(), status, user.id)

    revalidatePath("/marketing")
    revalidatePath(`/marketing/clients/${id}`)
    return { ok: true }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal mengubah status klien."
    return { ok: false, error: message }
  }
}

export async function deleteClientAction(
  id: string
): Promise<ActionResponse<void>> {
  try {
    const user = await requireManage("/marketing")
    if (!id || !id.trim()) {
      return { ok: false, error: "ID klien tidak valid." }
    }

    await deleteClient(id.trim(), user.id)

    revalidatePath("/marketing")
    return { ok: true }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal menghapus data klien."
    return { ok: false, error: message }
  }
}

const sppaInputSchema = z
  .object({
    clientId: z.string().trim().min(1, "Klien wajib dipilih"),
    cob: z.string().trim().min(1, "Class of Business wajib dipilih"),
    typeOfCover: z.string().trim().min(1, "Tipe penutupan wajib diisi"),
    insuredName: z.string().trim().min(1, "Nama tertanggung wajib diisi"),
    riskLocation: z.string().nullish(),
    occupation: z.string().nullish(),
    occupationId: z.string().nullish(),
    coverTypeId: z.string().nullish(),
    vehicleBrandId: z.uuid("Merek kendaraan tidak valid").nullish(),
    vehicleTypeId: z.uuid("Tipe kendaraan tidak valid").nullish(),
    currency: z.string().default("IDR"),
    sumInsured: z.coerce.number().min(0, "Nilai pertanggungan tidak boleh negatif"),
    periodStart: z.string().nullish(),
    periodEnd: z.string().nullish(),
    answers: z.record(z.string(), z.string()).optional(),
    status: z.enum(["Draft", "Submitted"]).optional(),
  })
  .refine(
    (data) => {
      if (data.periodStart && data.periodEnd) {
        return new Date(data.periodEnd) >= new Date(data.periodStart)
      }
      return true
    },
    {
      message: "Periode akhir asuransi tidak boleh sebelum periode mulai",
      path: ["periodEnd"],
    }
  )

export async function createSppaAction(
  input: SppaInput
): Promise<ActionResponse<SppaRecord>> {
  try {
    const user = await requireManage("/marketing")
    const parsed = sppaInputSchema.safeParse(input)
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      return {
        ok: false,
        error: firstIssue ? firstIssue.message : "Data SPPA tidak valid.",
      }
    }

    const created = await createSppa(parsed.data as SppaInput, user.id)

    revalidatePath("/marketing")
    revalidatePath("/underwriting/new")
    return { ok: true, data: created }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal membuat SPPA baru."
    return { ok: false, error: message }
  }
}

export async function updateSppaAction(
  id: string,
  input: SppaInput
): Promise<ActionResponse<SppaRecord>> {
  try {
    const user = await requireManage("/marketing")
    if (!id || !id.trim()) {
      return { ok: false, error: "ID SPPA tidak valid." }
    }

    const parsed = sppaInputSchema.safeParse(input)
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      return {
        ok: false,
        error: firstIssue ? firstIssue.message : "Data SPPA tidak valid.",
      }
    }

    const updated = await updateSppa(id.trim(), parsed.data as SppaInput, user.id)

    revalidatePath("/marketing")
    revalidatePath("/underwriting/new")
    return { ok: true, data: updated }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal memperbarui data SPPA."
    return { ok: false, error: message }
  }
}

export async function toggleSppaStatusAction(
  id: string,
  status: SppaStatus
): Promise<ActionResponse<void>> {
  try {
    const user = await requireManage("/marketing")
    if (!id || !id.trim()) {
      return { ok: false, error: "ID SPPA tidak valid." }
    }

    await toggleSppaStatus(id.trim(), status, user.id)

    revalidatePath("/marketing")
    revalidatePath("/underwriting/new")
    return { ok: true }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal memperbarui status SPPA."
    return { ok: false, error: message }
  }
}

export async function deleteSppaAction(
  id: string
): Promise<ActionResponse<void>> {
  try {
    const user = await requireManage("/marketing")
    if (!id || !id.trim()) {
      return { ok: false, error: "ID SPPA tidak valid." }
    }

    await deleteSppa(id.trim(), user.id)

    revalidatePath("/marketing")
    revalidatePath("/underwriting/new")
    return { ok: true }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal menghapus data SPPA."
    return { ok: false, error: message }
  }
}
