"use server"

import { revalidatePath } from "next/cache"
import { unstable_rethrow } from "next/navigation"
import { z } from "zod"

import { POLICY_TYPES } from "@/lib/data/reference"
import { Prisma } from "@/lib/generated/prisma/client"
import {
  createPolicy,
  deletePolicy,
  updatePolicy,
  type PolicyInput,
  type PolicyRecord,
} from "@/lib/server/policies"
import { requireManage } from "@/lib/server/session"

export interface ActionResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: string
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD")

const policyInputSchema = z
  .object({
    policyNo: z.string().trim().min(1, "No. polis wajib diisi"),
    clientId: z.string().min(1).nullable(),
    placingSlipId: z.string().min(1).nullable(),
    parentPolicyId: z.string().min(1).nullable(),
    insuredName: z.string().trim().min(1, "Nama tertanggung wajib diisi"),
    insurer: z.string().trim().min(1, "Asuransi wajib diisi"),
    insurers: z.array(
      z.object({
        id: z.string(),
        insurer: z.string().trim().min(1, "Nama asuransi wajib diisi"),
        share: z.number().gt(0).max(100),
        role: z.enum(["As Leader", "As Member"]),
      })
    ),
    // Daftar COB ada di master data; server menolak nama yang tidak ada di sana.
    cob: z.string().trim().min(1, "Class of business wajib dipilih"),
    typeOfCover: z.string().optional(),
    inceptionDate: isoDate,
    expiryDate: isoDate,
    currency: z.string().trim().length(3, "Kode mata uang harus 3 huruf"),
    sumInsured: z.number().nonnegative("Sum insured tidak boleh negatif"),
    premium: z.number(),
    brokeragePct: z.number().min(0).max(100),
    type: z.enum(POLICY_TYPES),
    riskLocation: z.string(),
    cobOjkClassId: z.uuid("Klasifikasi OJK tidak valid").nullable().optional(),
    placementLocationId: z.uuid("Lokasi penempatan tidak valid").nullable().optional(),
    groupingInsured: z.string().trim().max(200, "Grouping insured maksimal 200 karakter").optional(),
  })
  .refine((d) => d.expiryDate > d.inceptionDate, {
    path: ["expiryDate"],
    message: "Tanggal berakhir harus setelah tanggal mulai",
  })
  .refine((d) => new Set(d.insurers.map((i) => i.insurer.toLowerCase())).size === d.insurers.length, {
    path: ["insurers"],
    message: "Asuransi yang sama tidak boleh muncul dua kali",
  })

function fail(err: unknown, fallback: string): ActionResponse<never> {
  // Let redirects from requireManage through; view-only access still returns a message.
  unstable_rethrow(err)
  // Two endorsements saved at once on the same parent collide on the endorsement_seq unique key.
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return { ok: false, error: "Polis bentrok dengan penyimpanan lain. Muat ulang halaman lalu simpan lagi." }
  }
  return { ok: false, error: err instanceof Error ? err.message : fallback }
}

const policyIdSchema = z.uuid("ID polis tidak valid")

function parseInput(input: PolicyInput) {
  const parsed = policyInputSchema.safeParse(input)
  return parsed.success
    ? { data: parsed.data }
    : { error: parsed.error.issues[0]?.message ?? "Data polis tidak valid" }
}

export async function createPolicyAction(
  input: PolicyInput
): Promise<ActionResponse<PolicyRecord>> {
  try {
    const user = await requireManage("/policies")
    const parsed = parseInput(input)
    if (!parsed.data) return { ok: false, error: parsed.error }
    const data = await createPolicy(parsed.data, user.id)
    revalidatePath("/policies")
    return { ok: true, data }
  } catch (err) {
    return fail(err, "Gagal menyimpan polis")
  }
}

export async function updatePolicyAction(
  id: string,
  input: PolicyInput
): Promise<ActionResponse<PolicyRecord>> {
  try {
    const user = await requireManage("/policies")
    const policyId = policyIdSchema.safeParse(id)
    if (!policyId.success) return { ok: false, error: "ID polis tidak valid" }
    const parsed = parseInput(input)
    if (!parsed.data) return { ok: false, error: parsed.error }
    const data = await updatePolicy(policyId.data, parsed.data, user.id)
    revalidatePath("/policies")
    return { ok: true, data }
  } catch (err) {
    return fail(err, "Gagal memperbarui polis")
  }
}

export async function deletePolicyAction(id: string): Promise<ActionResponse<void>> {
  try {
    const user = await requireManage("/policies")
    const policyId = policyIdSchema.safeParse(id)
    if (!policyId.success) return { ok: false, error: "ID polis tidak valid" }
    await deletePolicy(policyId.data, user.id)
    revalidatePath("/policies")
    return { ok: true }
  } catch (err) {
    return fail(err, "Gagal menghapus polis")
  }
}
