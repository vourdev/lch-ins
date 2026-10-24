import "server-only"

import { coverCodeFor } from "@/components/underwriting/slip-model"
import type { Claim, ClaimStage, ClaimStatus } from "@/lib/data/types"
import { normalizeCob } from "@/lib/format"
import { Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { recordAudit } from "@/server/services/audit"
import { nextDocumentNumber } from "@/server/services/number-generator"

export interface ClaimRecord extends Claim {
  dbId: string
  clientName?: string
}

export interface ClaimDocumentRecord {
  id: string
  claimId: string
  documentTypeId: string | null
  documentTypeName: string
  isRequired: boolean
  isReceived: boolean
  receivedDate: string | null
  filePath: string | null
  notes: string | null
  sortOrder: number
}

export interface ClaimFollowupRecord {
  id: string
  claimId: string
  followupDate: string
  note: string
  createdById: string | null
  createdByName: string | null
  createdAt: string
}

export interface ClaimInput {
  policyId: string
  claimNo?: string
  adjusterId?: string | null
  adjuster?: string
  lossDate: string
  reportedDate?: string | null
  documentCompleteDate?: string | null
  spkDate?: string | null
  location?: string | null
  lossDescription?: string | null
  assetDescription?: string | null
  currencyCode: string
  estimatedLoss: number
  claimedAmount: number
  paidAmount: number
  statusId?: string
  stageId?: string
  status?: ClaimStatus
  stage?: ClaimStage
  notes?: string | null
}

export interface ClaimFormOptions {
  policies: Array<{
    id: string
    policyNo: string
    insuredName: string
    insurer: string
    cob: Claim["cob"]
    currency: string
  }>
  adjusters: Array<{
    id: string
    name: string
  }>
}

const claimIncludeRelations = {
  policy: {
    select: {
      id: true,
      policyNo: true,
      insuredName: true,
      cob: { select: { name: true } },
      insurers: {
        include: {
          insurer: { select: { name: true } },
          position: { select: { code: true } },
        },
        orderBy: { sharePct: "desc" },
      },
    },
  },
  status: { select: { code: true, name: true } },
  stage: { select: { code: true, name: true } },
  adjuster: { select: { id: true, name: true } },
} satisfies Prisma.ClaimInclude

type PrismaClaimWithRelations = Prisma.ClaimGetPayload<{
  include: typeof claimIncludeRelations
}>

const statusCache = new Map<string, string>()
const stageCache = new Map<string, string>()

async function resolveStatusId(status: ClaimStatus): Promise<string> {
  const cached = statusCache.get(status)
  if (cached) return cached

  const searchNames = status === "Closed" ? ["Closed", "Close"] : [status]
  const record = await prisma.lookupValue.findFirst({
    where: {
      lookupType: "claim_status",
      OR: [
        { name: { in: searchNames, mode: "insensitive" } },
        { code: { in: [status.toLowerCase(), ...searchNames.map((s) => s.toLowerCase())], mode: "insensitive" } },
      ],
    },
  })

  if (record) {
    statusCache.set(status, record.id)
    return record.id
  }

  throw new Error(`Status klaim "${status}" tidak ditemukan di database.`)
}

async function resolveStageId(stage: ClaimStage): Promise<string> {
  const cached = stageCache.get(stage)
  if (cached) return cached

  const record = await prisma.lookupValue.findFirst({
    where: {
      lookupType: "claim_stage",
      OR: [
        { name: { equals: stage, mode: "insensitive" } },
        { code: { equals: stage.toLowerCase(), mode: "insensitive" } },
      ],
    },
  })

  if (record) {
    stageCache.set(stage, record.id)
    return record.id
  }

  throw new Error(`Tahapan klaim "${stage}" tidak ditemukan di database.`)
}

async function resolveAdjusterId(adjusterIdOrName?: string | null): Promise<string | null> {
  if (!adjusterIdOrName?.trim()) return null
  const trimmed = adjusterIdOrName.trim()

  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    const existing = await prisma.adjuster.findUnique({ where: { id: trimmed } })
    if (existing) return existing.id
  }

  const existingByName = await prisma.adjuster.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" } },
  })
  if (existingByName) return existingByName.id

  const created = await prisma.adjuster.create({
    data: { name: trimmed },
  })
  return created.id
}

function toClaimRecord(record: PrismaClaimWithRelations): ClaimRecord {
  const leaderInsurer = record.policy?.insurers?.find((i) => i.position.code === "leader")?.insurer?.name
  const firstInsurer = record.policy?.insurers?.[0]?.insurer?.name || ""
  const primaryInsurer = leaderInsurer || firstInsurer

  const rawStatus = record.status?.name || record.status?.code || "Outstanding"
  const status: ClaimStatus =
    rawStatus.toLowerCase() === "close" || rawStatus.toLowerCase() === "closed"
      ? "Closed"
      : (rawStatus as ClaimStatus)

  const rawStage = (record.stage?.name || record.stage?.code || "Tunggu Dokumen") as ClaimStage

  return {
    dbId: record.id,
    id: record.id,
    claimNo: record.claimNo,
    policyId: record.policyId,
    policyNo: record.policy?.policyNo || "",
    insuredName: record.policy?.insuredName || "",
    insurer: primaryInsurer,
    cob: normalizeCob(record.policy?.cob?.name),
    currency: record.currencyCode as Claim["currency"],
    lossDate: record.lossDate.toISOString().slice(0, 10),
    reportedDate: record.reportedDate ? record.reportedDate.toISOString().slice(0, 10) : null,
    documentCompleteDate: record.documentCompleteDate ? record.documentCompleteDate.toISOString().slice(0, 10) : null,
    spkDate: record.spkDate ? record.spkDate.toISOString().slice(0, 10) : null,
    location: record.location || "",
    lossDescription: record.lossDescription || "",
    assetDescription: record.assetDescription || "",
    estimatedLoss: Number(record.estimatedLoss),
    claimedAmount: Number(record.claimedAmount),
    paidAmount: Number(record.paidAmount),
    adjuster: record.adjuster?.name || "",
    status,
    stage: rawStage,
    notes: record.notes || "",
  }
}

export async function listClaims(): Promise<ClaimRecord[]> {
  const records = await prisma.claim.findMany({
    include: claimIncludeRelations,
    orderBy: { lossDate: "desc" },
  })

  return records.map(toClaimRecord)
}

export async function getClaimById(id: string): Promise<ClaimRecord | null> {
  const record = await prisma.claim.findUnique({
    where: { id },
    include: claimIncludeRelations,
  })

  return record ? toClaimRecord(record) : null
}

export async function getClaimByNo(claimNo: string): Promise<ClaimRecord | null> {
  const record = await prisma.claim.findUnique({
    where: { claimNo },
    include: claimIncludeRelations,
  })

  return record ? toClaimRecord(record) : null
}

export async function listClaimFormOptions(): Promise<ClaimFormOptions> {
  const [policies, adjusters] = await Promise.all([
    prisma.policy.findMany({
      include: {
        cob: { select: { name: true } },
        insurers: {
          include: {
            insurer: { select: { name: true } },
            position: { select: { code: true } },
          },
          orderBy: { sharePct: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.adjuster.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  return {
    policies: policies.map((p) => {
      const leader = p.insurers.find((i) => i.position.code === "leader")?.insurer.name
      const first = p.insurers[0]?.insurer.name || ""
      return {
        id: p.id,
        policyNo: p.policyNo,
        insuredName: p.insuredName,
        insurer: leader || first,
        cob: normalizeCob(p.cob.name),
        currency: p.currencyCode,
      }
    }),
    adjusters,
  }
}

/**
 * Singkatan {COVER} untuk nomor klaim. Polis lama belum punya cover type,
 * jadi label type of cover di form polis dipakai sebagai cadangan.
 */
async function policyCoverCode(tx: Prisma.TransactionClient, policyId: string) {
  const policy = await tx.policy.findUnique({
    where: { id: policyId },
    select: {
      typeOfCover: true,
      cob: { select: { name: true } },
      coverType: { select: { abbreviation: true } },
    },
  })
  if (!policy) throw new Error("Polis tidak ditemukan.")
  return (
    policy.coverType?.abbreviation ??
    coverCodeFor(normalizeCob(policy.cob.name), policy.typeOfCover ?? "")
  )
}

export async function createClaim(
  input: ClaimInput,
  userId: string
): Promise<ClaimRecord> {
  return prisma.$transaction(async (tx) => {
    let claimNo = input.claimNo?.trim()
    if (!claimNo) {
      claimNo = await nextDocumentNumber(tx, {
        code: "CLM",
        coverCode: await policyCoverCode(tx, input.policyId),
      })
    }

    const [statusId, stageId, adjusterId] = await Promise.all([
      input.status ? resolveStatusId(input.status) : (input.statusId ? Promise.resolve(input.statusId) : resolveStatusId("Outstanding")),
      input.stage ? resolveStageId(input.stage) : (input.stageId ? Promise.resolve(input.stageId) : resolveStageId("Tunggu Dokumen")),
      resolveAdjusterId(input.adjusterId || input.adjuster),
    ])

    const record = await tx.claim.create({
      data: {
        claimNo,
        policyId: input.policyId,
        adjusterId,
        lossDate: new Date(input.lossDate),
        reportedDate: input.reportedDate ? new Date(input.reportedDate) : null,
        documentCompleteDate: input.documentCompleteDate ? new Date(input.documentCompleteDate) : null,
        spkDate: input.spkDate ? new Date(input.spkDate) : null,
        location: input.location?.trim() || null,
        lossDescription: input.lossDescription?.trim() || null,
        assetDescription: input.assetDescription?.trim() || null,
        currencyCode: input.currencyCode,
        estimatedLoss: input.estimatedLoss,
        claimedAmount: input.claimedAmount,
        paidAmount: input.paidAmount,
        statusId,
        stageId,
        notes: input.notes?.trim() || null,
      },
      include: claimIncludeRelations,
    })

    await recordAudit(tx, {
      userId,
      entity: "claims",
      entityId: record.id,
      action: "Create",
      before: null,
      after: {
        claimNo: record.claimNo,
        policyId: record.policyId,
        statusId: record.statusId,
        stageId: record.stageId,
      },
    })

    return toClaimRecord(record)
  })
}

export async function updateClaim(
  id: string,
  input: ClaimInput,
  userId: string
): Promise<ClaimRecord> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.claim.findUnique({
      where: { id },
      include: claimIncludeRelations,
    })
    if (!existing) {
      throw new Error("Klaim tidak ditemukan.")
    }

    const [statusId, stageId, adjusterId] = await Promise.all([
      input.status ? resolveStatusId(input.status) : (input.statusId ? Promise.resolve(input.statusId) : Promise.resolve(existing.statusId)),
      input.stage ? resolveStageId(input.stage) : (input.stageId ? Promise.resolve(input.stageId) : Promise.resolve(existing.stageId)),
      resolveAdjusterId(input.adjusterId || input.adjuster),
    ])

    const record = await tx.claim.update({
      where: { id },
      data: {
        claimNo: input.claimNo?.trim() || existing.claimNo,
        policyId: input.policyId,
        adjusterId,
        lossDate: new Date(input.lossDate),
        reportedDate: input.reportedDate ? new Date(input.reportedDate) : null,
        documentCompleteDate: input.documentCompleteDate ? new Date(input.documentCompleteDate) : null,
        spkDate: input.spkDate ? new Date(input.spkDate) : null,
        location: input.location?.trim() || null,
        lossDescription: input.lossDescription?.trim() || null,
        assetDescription: input.assetDescription?.trim() || null,
        currencyCode: input.currencyCode,
        estimatedLoss: input.estimatedLoss,
        claimedAmount: input.claimedAmount,
        paidAmount: input.paidAmount,
        statusId,
        stageId,
        notes: input.notes !== undefined ? (input.notes?.trim() || null) : existing.notes,
      },
      include: claimIncludeRelations,
    })

    await recordAudit(tx, {
      userId,
      entity: "claims",
      entityId: id,
      action: "Update",
      before: {
        claimNo: existing.claimNo,
        policyId: existing.policyId,
        statusId: existing.statusId,
        stageId: existing.stageId,
        estimatedLoss: Number(existing.estimatedLoss),
        claimedAmount: Number(existing.claimedAmount),
        paidAmount: Number(existing.paidAmount),
      },
      after: {
        claimNo: record.claimNo,
        policyId: record.policyId,
        statusId: record.statusId,
        stageId: record.stageId,
        estimatedLoss: Number(record.estimatedLoss),
        claimedAmount: Number(record.claimedAmount),
        paidAmount: Number(record.paidAmount),
      },
    })

    return toClaimRecord(record)
  })
}

export async function updateClaimStatus(
  id: string,
  status: ClaimStatus,
  userId: string
): Promise<ClaimRecord> {
  const existing = await prisma.claim.findUnique({ where: { id } })
  if (!existing) {
    throw new Error("Klaim tidak ditemukan.")
  }

  const statusId = await resolveStatusId(status)

  const record = await prisma.claim.update({
    where: { id },
    data: {
      statusId,
    },
    include: claimIncludeRelations,
  })

  await recordAudit(prisma, {
    userId,
    entity: "claims",
    entityId: id,
    action: "Update",
    before: { statusId: existing.statusId },
    after: { statusId: record.statusId },
  })

  return toClaimRecord(record)
}

export async function deleteClaim(id: string, userId: string): Promise<void> {
  const existing = await prisma.claim.findUnique({ where: { id } })
  if (!existing) {
    throw new Error("Klaim tidak ditemukan.")
  }

  const paymentCount = await prisma.payment.count({ where: { claimId: id } })
  if (paymentCount > 0) {
    throw new Error("Klaim sudah memiliki catatan pembayaran dan tidak dapat dihapus.")
  }

  await prisma.claim.delete({ where: { id } })

  await recordAudit(prisma, {
    userId,
    entity: "claims",
    entityId: id,
    action: "Delete",
    before: {
      claimNo: existing.claimNo,
    },
    after: null,
  })
}

export async function seedInitialClaimsIfEmpty(): Promise<number> {
  const count = await prisma.claim.count()
  if (count > 0) return 0

  const standardAdjusters = [
    "Internal LCH",
    "PT Radita Hutama Internusa",
    "PT Cunningham Lindsey Indonesia",
    "PT McLarens Indonesia",
    "PT Crawford & Company Indonesia",
  ]
  for (const name of standardAdjusters) {
    const existing = await prisma.adjuster.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    })
    if (!existing) {
      await prisma.adjuster.create({ data: { name } })
    }
  }

  const adjusters = await prisma.adjuster.findMany()
  const adjusterMap = new Map(adjusters.map((a) => [a.name.toLowerCase(), a.id]))

  const policies = await prisma.policy.findMany({
    select: { id: true, policyNo: true, currencyCode: true },
  })
  if (policies.length === 0) return 0

  const policyMap = new Map(policies.map((p) => [p.policyNo, p]))
  const fallbackPolicy = policies[0]

  const seedItems = [
    {
      claimNo: "CLM/2026/08/0031",
      policyNo: "PAR/2025/JKT/0871",
      lossDate: "2026-08-04",
      reportedDate: "2026-08-05",
      documentCompleteDate: "2026-08-12",
      spkDate: null,
      location: "Grand Sentosa Mall — Lantai B1, area food court",
      lossDescription:
        "Kebocoran pipa sprinkler pada plafon area food court menyebabkan kerusakan pada plafon, lantai vinyl, dan peralatan tenant.",
      assetDescription:
        "Plafon gypsum 340 m², lantai vinyl 210 m², 4 unit chiller display tenant",
      estimatedLoss: 620_000_000,
      claimedAmount: 585_000_000,
      paidAmount: 0,
      adjuster: "PT Radita Hutama Internusa",
      status: "Outstanding" as ClaimStatus,
      stage: "Proses Adjuster" as ClaimStage,
      notes: "Adjuster sudah survei 08/08. Menunggu laporan preliminary.",
    },
    {
      claimNo: "CLM/2026/07/0028",
      policyNo: "MV/FLT/2026/0088",
      lossDate: "2026-07-19",
      reportedDate: "2026-07-19",
      documentCompleteDate: "2026-07-24",
      spkDate: "2026-07-29",
      location: "Jl. Tol Jakarta–Cikampek Km 37, Bekasi",
      lossDescription:
        "Tabrakan beruntun melibatkan 2 unit Colt Diesel. Kerusakan pada bagian depan kendaraan dan kabin.",
      assetDescription:
        "Mitsubishi Colt Diesel FE 74 HD — B 9214 TYU dan B 9377 TYU",
      estimatedLoss: 285_000_000,
      claimedAmount: 271_400_000,
      paidAmount: 264_900_000,
      adjuster: "Internal LCH",
      status: "Settled" as ClaimStatus,
      stage: "SPK / SPGR terbit" as ClaimStage,
      notes:
        "Dibayar 12/08/2026 setelah dikurangi own risk 2 × IDR 500.000 dan penyesuaian harga part.",
    },
    {
      claimNo: "CLM/2026/08/0033",
      policyNo: "IAR/2025/SBY/0233",
      lossDate: "2026-08-11",
      reportedDate: "2026-08-12",
      documentCompleteDate: null,
      spkDate: null,
      location:
        "Kawasan Industri Rungkut Blok F-12, Surabaya — ruang panel produksi line 2",
      lossDescription:
        "Korsleting pada panel distribusi utama line 2 menyebabkan kebakaran terbatas dan kerusakan pada motor listrik serta conveyor.",
      assetDescription:
        "Panel distribusi 400A, 6 unit motor listrik, conveyor belt 24 m",
      estimatedLoss: 480_000_000,
      claimedAmount: 0,
      paidAmount: 0,
      adjuster: "PT Cunningham Lindsey Indonesia",
      status: "Outstanding" as ClaimStatus,
      stage: "Dokumen Belum Lengkap" as ClaimStage,
      notes:
        "Menunggu kelengkapan dokumen: berita acara, foto kerusakan, dan estimasi perbaikan dari vendor.",
    },
    {
      claimNo: "CLM/2026/06/0022",
      policyNo: "MC/OC/2025/0142",
      lossDate: "2026-06-08",
      reportedDate: "2026-06-10",
      documentCompleteDate: "2026-06-21",
      spkDate: "2026-06-27",
      location: "Pelabuhan Tanjung Priok — container yard blok C",
      lossDescription:
        "Container terjatuh saat proses bongkar. 3 pallet komponen elektronik mengalami kerusakan fisik total.",
      assetDescription:
        "3 pallet komponen elektronik — invoice INV/MLN/2026/0431",
      estimatedLoss: 38_500,
      claimedAmount: 38_500,
      paidAmount: 36_200,
      adjuster: "PT McLarens Indonesia",
      status: "Settled" as ClaimStatus,
      stage: "SPK / SPGR terbit" as ClaimStage,
      notes:
        "Pembayaran final disetujui setelah dipotong deductible USD 2.300. Settlement letter sudah dikirim ke klien.",
    },
    {
      claimNo: "CLM/2026/07/0030",
      policyNo: "CAR/2026/JTG/0019",
      lossDate: "2026-07-28",
      reportedDate: "2026-07-30",
      documentCompleteDate: "2026-08-08",
      spkDate: null,
      location:
        "Proyek Tol Semarang–Demak Seksi 2, Sta 14+200 — area pekerjaan abutment jembatan",
      lossDescription:
        "Hujan deras berkepanjangan memicu longsor lereng galian abutment jembatan. Scaffolding dan bekisting roboh tertimbun tanah.",
      assetDescription:
        "Pekerjaan tanah galian, perancah scaffolding 120 set, bekisting beton pier head",
      estimatedLoss: 350_000_000,
      claimedAmount: 312_000_000,
      paidAmount: 0,
      adjuster: "PT Radita Hutama Internusa",
      status: "Outstanding" as ClaimStatus,
      stage: "Proses Adjuster" as ClaimStage,
      notes:
        "Interim report adjuster diterima 10/08. Menunggu verifikasi kuantitas material dari konsultan pengawas proyek.",
    },
  ]

  let createdCount = 0
  for (const item of seedItems) {
    const matchedPolicy = policyMap.get(item.policyNo) || fallbackPolicy
    const [statusId, stageId] = await Promise.all([
      resolveStatusId(item.status),
      resolveStageId(item.stage),
    ])
    const adjusterId = adjusterMap.get(item.adjuster.toLowerCase()) || null

    await prisma.claim.create({
      data: {
        claimNo: item.claimNo,
        policyId: matchedPolicy.id,
        adjusterId,
        lossDate: new Date(item.lossDate),
        reportedDate: item.reportedDate ? new Date(item.reportedDate) : null,
        documentCompleteDate: item.documentCompleteDate ? new Date(item.documentCompleteDate) : null,
        spkDate: item.spkDate ? new Date(item.spkDate) : null,
        location: item.location,
        lossDescription: item.lossDescription,
        assetDescription: item.assetDescription,
        currencyCode: matchedPolicy.currencyCode || "IDR",
        estimatedLoss: item.estimatedLoss,
        claimedAmount: item.claimedAmount,
        paidAmount: item.paidAmount,
        statusId,
        stageId,
        notes: item.notes,
      },
    })
    createdCount++
  }

  return createdCount
}

export async function resolveClaimId(idOrNo: string): Promise<string | null> {
  if (!idOrNo || !idOrNo.trim()) return null
  const trimmed = idOrNo.trim()
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    const exists = await prisma.claim.findUnique({
      where: { id: trimmed },
      select: { id: true },
    })
    if (exists) return exists.id
  }

  const byNo = await prisma.claim.findUnique({
    where: { claimNo: trimmed },
    select: { id: true },
  })
  if (byNo) return byNo.id

  const fallback = await prisma.claim.findFirst({
    select: { id: true },
  })
  return fallback?.id ?? null
}

function toClaimDocumentRecord(doc: {
  id: string
  claimId: string
  documentTypeId: string | null
  isReceived: boolean
  receivedDate: Date | null
  filePath: string | null
  notes: string | null
  documentType?: {
    name: string
    isRequired: boolean
    sortOrder: number
  } | null
}): ClaimDocumentRecord {
  return {
    id: doc.id,
    claimId: doc.claimId,
    documentTypeId: doc.documentTypeId,
    documentTypeName: doc.documentType?.name ?? doc.notes ?? "Dokumen Klaim",
    isRequired: doc.documentType?.isRequired ?? false,
    isReceived: doc.isReceived,
    receivedDate: doc.receivedDate ? doc.receivedDate.toISOString().slice(0, 10) : null,
    filePath: doc.filePath,
    notes: doc.notes,
    sortOrder: doc.documentType?.sortOrder ?? 0,
  }
}

function toClaimFollowupRecord(f: {
  id: string
  claimId: string
  followupDate: Date
  note: string
  createdById: string | null
  createdAt: Date
  createdBy?: { id: string; name: string } | null
}): ClaimFollowupRecord {
  return {
    id: f.id,
    claimId: f.claimId,
    followupDate: f.followupDate.toISOString().slice(0, 10),
    note: f.note,
    createdById: f.createdById,
    createdByName: f.createdBy?.name ?? null,
    createdAt: f.createdAt.toISOString(),
  }
}

export async function listClaimDocuments(claimId: string): Promise<ClaimDocumentRecord[]> {
  const realClaimId = await resolveClaimId(claimId)
  if (!realClaimId) return []

  try {
    const existingDocs = await prisma.claimDocument.findMany({
      where: { claimId: realClaimId },
      include: { documentType: true },
      orderBy: [
        { documentType: { sortOrder: "asc" } },
        { createdAt: "asc" },
      ],
    })

    if (existingDocs.length > 0) {
      return existingDocs.map(toClaimDocumentRecord)
    }

    const claim = await prisma.claim.findUnique({
      where: { id: realClaimId },
      include: { policy: { select: { cobId: true } } },
    })
    if (!claim) return []

    let docTypes = await prisma.claimDocumentType.findMany({
      where: {
        cobId: claim.policy.cobId,
        isActive: true,
      },
      orderBy: { sortOrder: "asc" },
    })

    if (docTypes.length === 0) {
      docTypes = await prisma.claimDocumentType.findMany({
        where: {
          cobId: null,
          isActive: true,
        },
        orderBy: { sortOrder: "asc" },
      })
    }

    if (docTypes.length > 0) {
      await prisma.claimDocument.createMany({
        data: docTypes.map((dt) => ({
          claimId: realClaimId,
          documentTypeId: dt.id,
          isReceived: false,
        })),
      })

      const initializedDocs = await prisma.claimDocument.findMany({
        where: { claimId: realClaimId },
        include: { documentType: true },
        orderBy: [
          { documentType: { sortOrder: "asc" } },
          { createdAt: "asc" },
        ],
      })

      return initializedDocs.map(toClaimDocumentRecord)
    }

    return []
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2021") {
      return []
    }
    throw err
  }
}

export async function toggleClaimDocument(
  documentId: string,
  isReceived: boolean,
  receivedDate?: string | null
): Promise<ClaimDocumentRecord> {
  const dateVal = isReceived
    ? (receivedDate ? new Date(receivedDate) : new Date())
    : null

  const updated = await prisma.claimDocument.update({
    where: { id: documentId },
    data: {
      isReceived,
      receivedDate: dateVal,
    },
    include: {
      documentType: true,
    },
  })

  const allDocs = await prisma.claimDocument.findMany({
    where: { claimId: updated.claimId },
    include: { documentType: true },
  })

  const requiredDocs = allDocs.filter((d) => d.documentType?.isRequired)
  const allRequiredReceived = requiredDocs.length > 0 && requiredDocs.every((d) => d.isReceived)

  const claim = await prisma.claim.findUnique({
    where: { id: updated.claimId },
    select: { documentCompleteDate: true },
  })

  if (allRequiredReceived && !claim?.documentCompleteDate) {
    await prisma.claim.update({
      where: { id: updated.claimId },
      data: {
        documentCompleteDate: dateVal || new Date(),
      },
    })
  } else if (!allRequiredReceived && claim?.documentCompleteDate && !isReceived) {
    const unreceivedRequired = requiredDocs.some((d) => !d.isReceived)
    if (unreceivedRequired) {
      await prisma.claim.update({
        where: { id: updated.claimId },
        data: {
          documentCompleteDate: null,
        },
      })
    }
  }

  return toClaimDocumentRecord(updated)
}

export async function updateClaimDocument(
  documentId: string,
  input: {
    notes?: string | null
    filePath?: string | null
    receivedDate?: string | null
  }
): Promise<ClaimDocumentRecord> {
  const data: { notes?: string | null; filePath?: string | null; receivedDate?: Date | null } = {}
  if (input.notes !== undefined) data.notes = input.notes
  if (input.filePath !== undefined) data.filePath = input.filePath
  if (input.receivedDate !== undefined) {
    data.receivedDate = input.receivedDate ? new Date(input.receivedDate) : null
  }

  const updated = await prisma.claimDocument.update({
    where: { id: documentId },
    data,
    include: {
      documentType: true,
    },
  })

  return toClaimDocumentRecord(updated)
}

export async function addClaimDocument(
  claimId: string,
  input: {
    name: string
    isRequired?: boolean
    notes?: string | null
  }
): Promise<ClaimDocumentRecord> {
  const realClaimId = await resolveClaimId(claimId)
  if (!realClaimId) throw new Error("Klaim tidak ditemukan.")

  const claim = await prisma.claim.findUnique({
    where: { id: realClaimId },
    include: { policy: { select: { cobId: true } } },
  })
  if (!claim) throw new Error("Klaim tidak ditemukan.")

  let docType = await prisma.claimDocumentType.findFirst({
    where: {
      name: input.name.trim(),
      cobId: claim.policy.cobId,
    },
  })

  if (!docType) {
    docType = await prisma.claimDocumentType.create({
      data: {
        name: input.name.trim(),
        cobId: claim.policy.cobId,
        isRequired: input.isRequired ?? false,
        sortOrder: 99,
        isActive: true,
      },
    })
  }

  const doc = await prisma.claimDocument.create({
    data: {
      claimId: realClaimId,
      documentTypeId: docType.id,
      isReceived: false,
      notes: input.notes ?? null,
    },
    include: {
      documentType: true,
    },
  })

  return toClaimDocumentRecord(doc)
}

export async function deleteClaimDocument(documentId: string): Promise<void> {
  await prisma.claimDocument.delete({
    where: { id: documentId },
  })
}

export async function listClaimFollowups(claimId: string): Promise<ClaimFollowupRecord[]> {
  const realClaimId = await resolveClaimId(claimId)
  if (!realClaimId) return []

  try {
    const followups = await prisma.claimFollowup.findMany({
      where: { claimId: realClaimId },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: [
        { followupDate: "desc" },
        { createdAt: "desc" },
      ],
    })

    return followups.map(toClaimFollowupRecord)
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2021") {
      return []
    }
    throw err
  }
}

export async function addClaimFollowup(
  claimId: string,
  input: {
    followupDate: string
    note: string
  },
  userId?: string
): Promise<ClaimFollowupRecord> {
  const realClaimId = await resolveClaimId(claimId)
  if (!realClaimId) throw new Error("Klaim tidak ditemukan.")

  let validUserId: string | null = null
  if (userId) {
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })
    if (userExists) validUserId = userExists.id
  }

  if (!validUserId) {
    const fallbackUser = await prisma.user.findFirst({ select: { id: true } })
    validUserId = fallbackUser?.id ?? null
  }

  const created = await prisma.claimFollowup.create({
    data: {
      claimId: realClaimId,
      followupDate: new Date(input.followupDate),
      note: input.note.trim(),
      createdById: validUserId,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  })

  return toClaimFollowupRecord(created)
}

export async function deleteClaimFollowup(followupId: string, _userId?: string): Promise<void> {
  await prisma.claimFollowup.delete({
    where: { id: followupId },
  })
}

