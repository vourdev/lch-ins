"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import type { SlipStatus } from "@/lib/generated/prisma/client"
import type { PlacingSlip } from "@/lib/data/types"
import {
  createPlacingSlip,
  deletePlacingSlip,
  getPlacingSlipById,
  releasePlacingSlip,
  togglePlacingSlipStatus,
  updatePlacingSlip,
  type PlacingSlipInput,
  type PlacingSlipRecord,
} from "@/lib/server/placing-slips"
import { releaseIssues } from "@/components/underwriting/slip-model"
import { prisma } from "@/lib/prisma"
import { requireManage } from "@/lib/server/session"

export interface ActionResponse<T = void> {
  ok: boolean
  data?: T
  error?: string
}

export interface ClausePickerItem {
  id: string
  title: string
  wording: string
  sourceGroup: string
  cobName: string | null
  coverTypeName: string | null
}

const lineItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  amount: z.coerce.number().optional(),
  vehicleBrandId: z.uuid("Merek kendaraan tidak valid").nullish(),
  vehicleTypeId: z.uuid("Tipe kendaraan tidak valid").nullish(),
})

const rateLineSchema = z.object({
  id: z.string(),
  label: z.string(),
  rate: z.coerce.number().nullable().optional(),
  premium: z.coerce.number(),
  basis: z.string().optional(),
  min: z.coerce.number().nullable().optional(),
  max: z.coerce.number().nullable().optional(),
})

const securityPanelRowSchema = z.object({
  id: z.string(),
  insurer: z.string(),
  share: z.coerce.number(),
  role: z.enum(["As Leader", "As Member"]),
})

const placingSlipSchema = z.object({
  clientId: z.string().trim().min(1, "Klien wajib dipilih."),
  sppaId: z.string().nullish(),
  cob: z.string().trim().min(1, "Class of Business wajib dipilih."),
  typeOfCover: z.string().nullish(),
  coverCode: z.string().nullish(),
  insuredName: z.string().trim().min(1, "Nama tertanggung wajib diisi."),
  correspondenceAddress: z.string().nullish(),
  currency: z.string().default("IDR"),
  status: z.enum(["Draft", "Released", "Quoted", "Closed", "Cancelled"]).optional(),
  periodTba: z.boolean().optional(),
  inceptionDate: z.string().nullish(),
  expiryDate: z.string().nullish(),
  occupation: z.string().nullish(),
  occupationId: z.string().nullish(),
  riskLocation: z.string().nullish(),
  coverage: z.string().nullish(),
  constructionClass: z.string().nullish(),
  indemnityPeriod: z.string().nullish(),
  interestSection1: z.string().nullish(),
  interestSection2: z.string().nullish(),
  specialConditions: z.string().nullish(),
  interestItems: z.array(lineItemSchema).optional(),
  sumInsuredSection1: z.array(lineItemSchema).optional(),
  sumInsuredSection2: z.array(lineItemSchema).optional(),
  deductiblesSection1: z.array(z.string()).optional(),
  deductiblesSection2: z.array(z.string()).optional(),
  clauseIds: z.array(z.string()).optional(),
  clauseOverrides: z
    .record(
      z.string(),
      z.object({
        title: z.string(),
        wording: z.string(),
      })
    )
    .optional(),
  wordingForms: z.array(z.string()).optional(),
  rateLines: z.array(rateLineSchema).optional(),
  tplLines: z.array(rateLineSchema).optional(),
  paLines: z.array(rateLineSchema).optional(),
  rateExceptions: z
    .record(
      z.string(),
      z.object({
        reason: z.string(),
        note: z.string(),
      })
    )
    .optional(),
  securityPanel: z.array(securityPanelRowSchema).optional(),
  discountPct: z.coerce.number().optional(),
  adminCost: z.coerce.number().optional(),
  stampDuty: z.coerce.number().optional(),
  brokeragePct: z.coerce.number().optional(),
  includeVat: z.boolean().optional(),
  subjectivity: z.string().nullish(),
  closingInstruction: z.string().nullish(),
  coverNoteRemarks: z.string().nullish(),
})

function revalidateUnderwritingPaths(id?: string) {
  revalidatePath("/underwriting")
  revalidatePath("/underwriting/new")
  if (id) {
    revalidatePath(`/underwriting/edit/${id}`)
    revalidatePath(`/underwriting/quotation/edit/${id}`)
    revalidatePath(`/underwriting/slip/${id}`)
  }
}

/**
 * Menyimpan Placing Slip (membuat baru atau memperbarui draft yang ada).
 */
export async function savePlacingSlipAction(
  slip: PlacingSlip,
  mode: "new" | "edit"
): Promise<ActionResponse<PlacingSlipRecord>> {
  try {
    const user = await requireManage("/underwriting")

    const parsed = placingSlipSchema.safeParse(slip)
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      return {
        ok: false,
        error: firstIssue ? firstIssue.message : "Data Placing Slip tidak valid.",
      }
    }

    const input = parsed.data as PlacingSlipInput

    let result: PlacingSlipRecord

    const isNew =
      mode === "new" ||
      !slip.id ||
      slip.id === "new" ||
      slip.id.startsWith("s-")

    if (isNew) {
      // Periksa apakah slip dengan ID mock ini sudah pernah di-seed/dibuat di database
      const existing = slip.id ? await getPlacingSlipById(slip.id) : null
      if (existing) {
        result = await updatePlacingSlip(existing.dbId, input, user.id)
      } else {
        result = await createPlacingSlip(input, user.id)
      }
    } else {
      result = await updatePlacingSlip(slip.id, input, user.id)
    }

    revalidateUnderwritingPaths(result.id)
    return { ok: true, data: result }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal menyimpan Placing Slip."
    return { ok: false, error: message }
  }
}

/**
 * Merilis Placing Slip dan menerbitkan nomor resmi dokumen (PS/COB/YYYY/MM/XXXX).
 */
export async function releasePlacingSlipAction(
  id: string
): Promise<ActionResponse<PlacingSlipRecord>> {
  try {
    const user = await requireManage("/underwriting")
    if (!id || !id.trim()) {
      return { ok: false, error: "ID Placing Slip tidak valid." }
    }

    const target = await getPlacingSlipById(id.trim())
    if (!target) {
      return { ok: false, error: "Placing Slip tidak ditemukan." }
    }

    // Same check the form runs, repeated here so a crafted request cannot skip it.
    const issues = releaseIssues(target)
    if (issues.length > 0) {
      return { ok: false, error: issues.join(" ") }
    }

    const released = await releasePlacingSlip(target.dbId, user.id)
    revalidateUnderwritingPaths(released.id)
    return { ok: true, data: released }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal merilis Placing Slip."
    return { ok: false, error: message }
  }
}

/**
 * Mengubah status Placing Slip (misal: "Draft", "Quoted", "Cancelled").
 */
export async function togglePlacingSlipStatusAction(
  id: string,
  status: SlipStatus
): Promise<ActionResponse<PlacingSlipRecord>> {
  try {
    const user = await requireManage("/underwriting")
    if (!id || !id.trim()) {
      return { ok: false, error: "ID Placing Slip tidak valid." }
    }

    const target = await getPlacingSlipById(id.trim())
    if (!target) {
      return { ok: false, error: "Placing Slip tidak ditemukan." }
    }

    const updated = await togglePlacingSlipStatus(target.dbId, status, user.id)
    revalidateUnderwritingPaths(updated.id)
    return { ok: true, data: updated }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal mengubah status Placing Slip."
    return { ok: false, error: message }
  }
}

/**
 * Menghapus Placing Slip berstatus Draft.
 */
export async function deletePlacingSlipAction(
  id: string
): Promise<ActionResponse<void>> {
  try {
    const user = await requireManage("/underwriting")
    if (!id || !id.trim()) {
      return { ok: false, error: "ID Placing Slip tidak valid." }
    }

    const target = await getPlacingSlipById(id.trim())
    if (!target) {
      return { ok: false, error: "Placing Slip tidak ditemukan." }
    }

    await deletePlacingSlip(target.dbId, user.id)
    revalidateUnderwritingPaths(target.dbId)
    return { ok: true }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal menghapus Placing Slip."
    return { ok: false, error: message }
  }
}

/**
 * Menduplikasi Placing Slip yang ada menjadi Draft baru tanpa nomor dokumen.
 */
export async function duplicatePlacingSlipAction(
  id: string
): Promise<ActionResponse<PlacingSlipRecord>> {
  try {
    const user = await requireManage("/underwriting")
    const source = await getPlacingSlipById(id)
    if (!source) {
      return { ok: false, error: "Placing Slip sumber tidak ditemukan." }
    }

    const duplicateInput: PlacingSlipInput = {
      clientId: source.clientId || "",
      cob: source.cob,
      typeOfCover: source.typeOfCover,
      coverCode: source.coverCode,
      insuredName: source.insuredName,
      correspondenceAddress: source.correspondenceAddress,
      currency: source.currency,
      status: "Draft",
      periodTba: source.periodTba,
      inceptionDate: source.inceptionDate,
      expiryDate: source.expiryDate,
      occupation: source.occupation,
      riskLocation: source.riskLocation,
      coverage: source.coverage,
      constructionClass: source.constructionClass,
      indemnityPeriod: source.indemnityPeriod,
      interestSection1: source.interestSection1,
      interestSection2: source.interestSection2,
      specialConditions: source.specialConditions,
      interestItems: source.interestItems,
      sumInsuredSection1: source.sumInsuredSection1,
      sumInsuredSection2: source.sumInsuredSection2,
      deductiblesSection1: source.deductiblesSection1,
      deductiblesSection2: source.deductiblesSection2,
      clauseIds: source.clauseIds,
      clauseOverrides: source.clauseOverrides,
      wordingForms: source.wordingForms,
      rateLines: source.rateLines,
      tplLines: source.tplLines,
      paLines: source.paLines,
      rateExceptions: source.rateExceptions,
      securityPanel: source.securityPanel,
      discountPct: source.discountPct,
      adminCost: source.adminCost,
      stampDuty: source.stampDuty,
      brokeragePct: source.brokeragePct,
      includeVat: source.includeVat,
    }

    const created = await createPlacingSlip(duplicateInput, user.id)
    revalidateUnderwritingPaths(created.id)
    return { ok: true, data: created }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal menduplikasi Placing Slip."
    return { ok: false, error: message }
  }
}

/**
 * Mengambil daftar klausula master dari database PostgreSQL untuk ClausePicker.
 */
export async function getClausesForPickerAction(): Promise<ActionResponse<ClausePickerItem[]>> {
  try {
    const rows = await prisma.clause.findMany({
      where: { isActive: true },
      select: {
        id: true,
        title: true,
        wordingHtml: true,
        sourceGroup: true,
        cob: { select: { name: true } },
        coverType: { select: { name: true } },
      },
      orderBy: [{ title: "asc" }],
    })

    const items: ClausePickerItem[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      wording: r.wordingHtml,
      sourceGroup: r.sourceGroup,
      cobName: r.cob?.name ?? null,
      coverTypeName: r.coverType?.name ?? null,
    }))

    return { ok: true, data: items }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal memuat klausula dari database."
    return { ok: false, error: message }
  }
}
