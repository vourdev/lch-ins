"use server"

import { revalidatePath } from "next/cache"
import { unstable_rethrow } from "next/navigation"
import { z } from "zod"

import { CLAIM_STAGES, CLAIM_STATUSES } from "@/lib/data/reference"
import type { ClaimStage, ClaimStatus } from "@/lib/data/types"
import {
  createClaim,
  deleteClaim,
  updateClaim,
  updateClaimStatus,
  listClaimDocuments,
  toggleClaimDocument,
  updateClaimDocument,
  addClaimDocument,
  deleteClaimDocument,
  listClaimFollowups,
  addClaimFollowup,
  deleteClaimFollowup,
  type ClaimInput,
  type ClaimRecord,
  type ClaimDocumentRecord,
  type ClaimFollowupRecord,
} from "@/lib/server/claims"
import { requireAccess, requireManage } from "@/lib/server/session"

export interface ActionResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: string
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD")
const isoDateNullable = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD")
  .nullable()
  .optional()

const claimInputSchema = z.object({
  claimNo: z.string().trim().optional(),
  policyId: z.string().min(1, "Polis wajib dipilih"),
  adjusterId: z.string().nullable().optional(),
  adjuster: z.string().optional(),
  lossDate: isoDate,
  reportedDate: isoDateNullable,
  documentCompleteDate: isoDateNullable,
  spkDate: isoDateNullable,
  location: z.string().optional().default(""),
  lossDescription: z.string().trim().min(1, "Deskripsi kerugian wajib diisi"),
  assetDescription: z.string().optional().default(""),
  currencyCode: z.string().trim().min(1, "Mata uang wajib diisi"),
  estimatedLoss: z.coerce.number().nonnegative("Estimasi kerugian tidak boleh negatif"),
  claimedAmount: z.coerce.number().nonnegative("Nilai klaim tidak boleh negatif"),
  paidAmount: z.coerce.number().nonnegative("Nilai dibayar tidak boleh negatif"),
  status: z.enum(CLAIM_STATUSES as [ClaimStatus, ...ClaimStatus[]]).optional(),
  stage: z.enum(CLAIM_STAGES as [ClaimStage, ...ClaimStage[]]).optional(),
  notes: z.string().optional().default(""),
})

export async function createClaimAction(
  rawInput: ClaimInput
): Promise<ActionResponse<ClaimRecord>> {
  try {
    const session = await requireManage("/claims")
    const parsed = claimInputSchema.safeParse(rawInput)

    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return { ok: false, error: issue?.message ?? "Data input klaim tidak valid" }
    }

    const record = await createClaim(parsed.data, session.id)
    revalidatePath("/claims")
    revalidatePath("/")
    return { ok: true, data: record }
  } catch (err) {
    unstable_rethrow(err)
    const message = err instanceof Error ? err.message : "Gagal menambahkan data klaim"
    return { ok: false, error: message }
  }
}

export async function updateClaimAction(
  id: string,
  rawInput: ClaimInput
): Promise<ActionResponse<ClaimRecord>> {
  try {
    const session = await requireManage("/claims")
    const parsed = claimInputSchema.safeParse(rawInput)

    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return { ok: false, error: issue?.message ?? "Data input klaim tidak valid" }
    }

    const record = await updateClaim(id, parsed.data, session.id)
    revalidatePath("/claims")
    revalidatePath("/")
    return { ok: true, data: record }
  } catch (err) {
    unstable_rethrow(err)
    const message = err instanceof Error ? err.message : "Gagal memperbarui data klaim"
    return { ok: false, error: message }
  }
}

export async function updateClaimStatusAction(
  id: string,
  status: ClaimStatus
): Promise<ActionResponse<ClaimRecord>> {
  try {
    const session = await requireManage("/claims")
    const record = await updateClaimStatus(id, status, session.id)
    revalidatePath("/claims")
    revalidatePath("/")
    return { ok: true, data: record }
  } catch (err) {
    unstable_rethrow(err)
    const message = err instanceof Error ? err.message : "Gagal mengubah status klaim"
    return { ok: false, error: message }
  }
}

export async function deleteClaimAction(id: string): Promise<ActionResponse<void>> {
  try {
    const session = await requireManage("/claims")
    await deleteClaim(id, session.id)
    revalidatePath("/claims")
    revalidatePath("/")
    return { ok: true }
  } catch (err) {
    unstable_rethrow(err)
    const message = err instanceof Error ? err.message : "Gagal menghapus klaim"
    return { ok: false, error: message }
  }
}

export async function listClaimDocumentsAction(
  claimId: string
): Promise<ActionResponse<ClaimDocumentRecord[]>> {
  try {
    await requireAccess("/claims")
    const docs = await listClaimDocuments(claimId)
    return { ok: true, data: docs }
  } catch (err) {
    unstable_rethrow(err)
    const message = err instanceof Error ? err.message : "Gagal memuat dokumen klaim"
    return { ok: false, error: message }
  }
}

export async function toggleClaimDocumentAction(
  documentId: string,
  isReceived: boolean,
  receivedDate?: string | null
): Promise<ActionResponse<ClaimDocumentRecord>> {
  try {
    const session = await requireManage("/claims")
    const doc = await toggleClaimDocument(documentId, isReceived, receivedDate, session.id)
    revalidatePath("/claims")
    revalidatePath("/")
    return { ok: true, data: doc }
  } catch (err) {
    unstable_rethrow(err)
    const message = err instanceof Error ? err.message : "Gagal mengubah status penerimaan berkas"
    return { ok: false, error: message }
  }
}

export async function updateClaimDocumentAction(
  documentId: string,
  input: {
    notes?: string | null
    filePath?: string | null
    receivedDate?: string | null
  }
): Promise<ActionResponse<ClaimDocumentRecord>> {
  try {
    const session = await requireManage("/claims")
    const doc = await updateClaimDocument(documentId, input, session.id)
    revalidatePath("/claims")
    return { ok: true, data: doc }
  } catch (err) {
    unstable_rethrow(err)
    const message = err instanceof Error ? err.message : "Gagal memperbarui informasi berkas klaim"
    return { ok: false, error: message }
  }
}

export async function addClaimDocumentAction(
  claimId: string,
  input: {
    name: string
    isRequired?: boolean
    notes?: string | null
  }
): Promise<ActionResponse<ClaimDocumentRecord>> {
  try {
    const session = await requireManage("/claims")
    if (!input.name || !input.name.trim()) {
      return { ok: false, error: "Nama dokumen wajib diisi" }
    }
    const doc = await addClaimDocument(claimId, input, session.id)
    revalidatePath("/claims")
    return { ok: true, data: doc }
  } catch (err) {
    unstable_rethrow(err)
    const message = err instanceof Error ? err.message : "Gagal menambahkan dokumen klaim"
    return { ok: false, error: message }
  }
}

export async function deleteClaimDocumentAction(
  documentId: string
): Promise<ActionResponse<void>> {
  try {
    const session = await requireManage("/claims")
    await deleteClaimDocument(documentId, session.id)
    revalidatePath("/claims")
    return { ok: true }
  } catch (err) {
    unstable_rethrow(err)
    const message = err instanceof Error ? err.message : "Gagal menghapus berkas klaim"
    return { ok: false, error: message }
  }
}

export async function listClaimFollowupsAction(
  claimId: string
): Promise<ActionResponse<ClaimFollowupRecord[]>> {
  try {
    await requireAccess("/claims")
    const list = await listClaimFollowups(claimId)
    return { ok: true, data: list }
  } catch (err) {
    unstable_rethrow(err)
    const message = err instanceof Error ? err.message : "Gagal memuat catatan follow-up klaim"
    return { ok: false, error: message }
  }
}

export async function addClaimFollowupAction(
  claimId: string,
  input: {
    followupDate: string
    note: string
  }
): Promise<ActionResponse<ClaimFollowupRecord>> {
  try {
    const session = await requireManage("/claims")
    if (!input.note || !input.note.trim()) {
      return { ok: false, error: "Catatan tindak lanjut wajib diisi" }
    }
    const item = await addClaimFollowup(claimId, input, session.id)
    revalidatePath("/claims")
    return { ok: true, data: item }
  } catch (err) {
    unstable_rethrow(err)
    const message = err instanceof Error ? err.message : "Gagal menyimpan catatan follow-up klaim"
    return { ok: false, error: message }
  }
}

export async function deleteClaimFollowupAction(
  followupId: string
): Promise<ActionResponse<void>> {
  try {
    const session = await requireManage("/claims")
    await deleteClaimFollowup(followupId, session.id)
    revalidatePath("/claims")
    return { ok: true }
  } catch (err) {
    unstable_rethrow(err)
    const message = err instanceof Error ? err.message : "Gagal menghapus tindak lanjut klaim"
    return { ok: false, error: message }
  }
}

