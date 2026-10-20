"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import type { ClientStatus } from "@/lib/data/types"
import {
  createClient,
  deleteClient,
  toggleClientStatus,
  updateClient,
  type ClientInput,
  type ClientRecord,
} from "@/lib/server/clients"
import { requireAccess } from "@/lib/server/session"

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
    const user = await requireAccess("/marketing")
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
    const user = await requireAccess("/marketing")
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
    await requireAccess("/marketing")
    if (!id || !id.trim()) {
      return { ok: false, error: "ID klien tidak valid." }
    }

    await toggleClientStatus(id.trim(), status)

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
    await requireAccess("/marketing")
    if (!id || !id.trim()) {
      return { ok: false, error: "ID klien tidak valid." }
    }

    await deleteClient(id.trim())

    revalidatePath("/marketing")
    return { ok: true }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal menghapus data klien."
    return { ok: false, error: message }
  }
}
