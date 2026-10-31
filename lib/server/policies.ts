import "server-only"

import { Prisma } from "@/lib/generated/prisma/client"
import { CLIENTS } from "@/lib/data/clients"
import { POLICIES as MOCK_POLICIES } from "@/lib/data/policies"
import { POLICY_TYPES } from "@/lib/data/reference"
import { SLIPS as MOCK_SLIPS } from "@/lib/data/slips"
import type { ClassOfBusiness, Policy, SecurityPanelRow } from "@/lib/data/types"
import { addDays } from "@/lib/date"
import { normalizeCob } from "@/lib/format"
import { prisma } from "@/lib/prisma"
import { MAX_RENEWAL_DAYS } from "@/lib/renewal"
import { seedInitialClientsIfEmpty } from "@/lib/server/clients"
import { recordAudit } from "@/server/services/audit"

export type PolicyRecord = Policy
export type PolicyInput = Omit<Policy, "id" | "files" | "endorsementSeq" | "placingSlipNo">

export interface PolicyFormOptions {
  insurers: string[]
  currencies: { code: string; name: string }[]
  placementLocations: { id: string; name: string; isActive: boolean }[]
  cobOjkClasses: { id: string; name: string; isActive: boolean }[]
}

type Tx = Prisma.TransactionClient

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const policyInclude = {
  cob: { select: { name: true } },
  policyType: { select: { name: true } },
  placingSlip: { select: { slipNo: true } },
  insurers: {
    include: {
      insurer: { select: { name: true } },
      position: { select: { code: true } },
    },
    orderBy: { sharePct: "desc" },
  },
  files: { orderBy: { version: "asc" } },
} satisfies Prisma.PolicyInclude

type PolicyRow = Prisma.PolicyGetPayload<{ include: typeof policyInclude }>

const isoDate = (d: Date) => d.toISOString().slice(0, 10)

function toPolicyRecord(row: PolicyRow): PolicyRecord {
  const insurers: SecurityPanelRow[] = row.insurers.map((i) => ({
    id: i.id,
    insurer: i.insurer.name,
    share: Number(i.sharePct),
    role: i.position.code === "leader" ? "As Leader" : "As Member",
  }))
  const leader = insurers.find((i) => i.role === "As Leader") ?? insurers[0]
  return {
    id: row.id,
    policyNo: row.policyNo,
    clientId: row.clientId,
    placingSlipId: row.placingSlipId,
    placingSlipNo: row.placingSlip?.slipNo ?? null,
    parentPolicyId: row.parentPolicyId,
    insuredName: row.insuredName,
    insurer: leader?.insurer ?? "",
    insurers,
    cob: normalizeCob(row.cob.name),
    typeOfCover: row.typeOfCover ?? undefined,
    inceptionDate: isoDate(row.inceptionDate),
    expiryDate: isoDate(row.expiryDate),
    currency: row.currencyCode,
    sumInsured: Number(row.sumInsured),
    premium: Number(row.premium),
    brokeragePct: Number(row.brokeragePct),
    type: POLICY_TYPES.find((t) => t === row.policyType.name) ?? "Baru",
    riskLocation: row.riskLocation ?? "",
    endorsementSeq: row.endorsementSeq,
    cobOjkClassId: row.cobOjkClassId,
    placementLocationId: row.placementLocationId,
    groupingInsured: row.groupingInsured ?? "",
    files: row.files.map((f) => ({
      id: f.id,
      version: f.version,
      fileName: f.fileName,
      uploadedAt: f.uploadedAt.toISOString(),
    })),
  }
}

function auditSnapshot(p: PolicyRecord) {
  return {
    policyNo: p.policyNo,
    insuredName: p.insuredName,
    type: p.type,
    insurer: p.insurer,
    inceptionDate: p.inceptionDate,
    expiryDate: p.expiryDate,
    sumInsured: p.sumInsured,
    premium: p.premium,
    brokeragePct: p.brokeragePct,
    endorsementSeq: p.endorsementSeq,
    cobOjkClassId: p.cobOjkClassId,
    placementLocationId: p.placementLocationId,
    groupingInsured: p.groupingInsured,
  }
}

/** App COB labels whose master-data row (SEOJK) carries a different name. */
const MASTER_COB_NAME: Partial<Record<ClassOfBusiness, string>> = {
  "Personal Accident": "GENERAL ACCIDENT",
}

async function resolveCobId(tx: Tx, cob: ClassOfBusiness): Promise<string> {
  const row = await tx.classOfBusiness.findFirst({
    where: { name: { equals: MASTER_COB_NAME[cob] ?? cob, mode: "insensitive" } },
    select: { id: true },
  })
  if (!row) throw new Error(`Class of business "${cob}" belum ada di master data.`)
  return row.id
}

async function resolvePolicyTypeId(tx: Tx, type: string): Promise<string> {
  const row = await tx.lookupValue.findFirst({
    where: { lookupType: "policy_type", name: type },
    select: { id: true },
  })
  if (!row) throw new Error(`Tipe polis "${type}" belum ada di master data.`)
  return row.id
}

async function findCoverTypeId(tx: Tx, cobId: string, label?: string) {
  if (!label?.trim()) return null
  const row = await tx.coverType.findFirst({
    where: { cobId, name: { equals: label.trim(), mode: "insensitive" } },
    select: { id: true },
  })
  return row?.id ?? null
}

// The session store still carries mock ids (c-001, s-005, p-002); map them by
// their natural key so records picked from mock rows link to the DB rows.
async function findClientId(tx: Tx, clientId: string | null) {
  if (!clientId) return null
  if (UUID_RE.test(clientId)) {
    const row = await tx.client.findUnique({ where: { id: clientId }, select: { id: true } })
    if (row) return row.id
  }
  const mock = CLIENTS.find((c) => c.id === clientId)
  if (!mock) return null
  const row = await tx.client.findFirst({
    where: { name: { equals: mock.name.trim(), mode: "insensitive" } },
    select: { id: true },
  })
  return row?.id ?? null
}

async function findSlipId(tx: Tx, slipId: string | null) {
  if (!slipId) return null
  if (UUID_RE.test(slipId)) {
    const row = await tx.placingSlip.findUnique({ where: { id: slipId }, select: { id: true } })
    if (row) return row.id
  }
  const slipNo = MOCK_SLIPS.find((s) => s.id === slipId)?.slipNo
  if (!slipNo) return null
  const row = await tx.placingSlip.findUnique({ where: { slipNo }, select: { id: true } })
  return row?.id ?? null
}

async function findPolicyId(tx: Tx, policyId: string | null) {
  if (!policyId) return null
  if (UUID_RE.test(policyId)) {
    const row = await tx.policy.findUnique({ where: { id: policyId }, select: { id: true } })
    if (row) return row.id
  }
  const policyNo = MOCK_POLICIES.find((p) => p.id === policyId)?.policyNo
  if (!policyNo) return null
  const row = await tx.policy.findUnique({ where: { policyNo }, select: { id: true } })
  return row?.id ?? null
}

async function resolveInsurerId(tx: Tx, name: string): Promise<string> {
  const existing = await tx.insurer.findFirst({
    where: { name: { equals: name.trim(), mode: "insensitive" } },
    select: { id: true },
  })
  if (existing) return existing.id
  const created = await tx.insurer.create({ data: { name: name.trim() }, select: { id: true } })
  return created.id
}

async function policyData(tx: Tx, input: PolicyInput) {
  const cobId = await resolveCobId(tx, input.cob)
  return {
    policyNo: input.policyNo.trim(),
    insuredName: input.insuredName.trim(),
    clientId: await findClientId(tx, input.clientId),
    placingSlipId: await findSlipId(tx, input.placingSlipId),
    parentPolicyId: await findPolicyId(tx, input.parentPolicyId),
    cobId,
    coverTypeId: await findCoverTypeId(tx, cobId, input.typeOfCover),
    typeOfCover: input.typeOfCover?.trim() || null,
    policyTypeId: await resolvePolicyTypeId(tx, input.type),
    inceptionDate: new Date(input.inceptionDate),
    expiryDate: new Date(input.expiryDate),
    currencyCode: input.currency,
    sumInsured: input.sumInsured,
    premium: input.premium,
    brokeragePct: input.brokeragePct,
    riskLocation: input.riskLocation.trim() || null,
    cobOjkClassId: await findCobOjkClassId(tx, input.cobOjkClassId),
    placementLocationId: await findPlacementLocationId(tx, input.placementLocationId),
    groupingInsured: input.groupingInsured?.trim() || null,
  } satisfies Prisma.PolicyUncheckedCreateInput
}

async function findCobOjkClassId(tx: Tx, id: string | null | undefined) {
  if (!id) return null
  const row = await tx.cobOjkClass.findUnique({ where: { id }, select: { id: true } })
  if (!row) throw new Error("Klasifikasi OJK tidak ditemukan di master data.")
  return row.id
}

async function findPlacementLocationId(tx: Tx, id: string | null | undefined) {
  if (!id) return null
  const row = await tx.lookupValue.findFirst({
    where: { id, lookupType: "placement_location" },
    select: { id: true },
  })
  if (!row) throw new Error("Lokasi penempatan tidak ditemukan di master data.")
  return row.id
}

async function endorsementSeqFor(
  tx: Tx,
  type: PolicyInput["type"],
  parentPolicyId: string | null,
  selfId?: string
): Promise<number | null> {
  if (type !== "Endorsement" || !parentPolicyId) return null
  if (selfId) {
    const self = await tx.policy.findUnique({
      where: { id: selfId },
      select: { parentPolicyId: true, endorsementSeq: true },
    })
    if (self?.endorsementSeq && self.parentPolicyId === parentPolicyId) return self.endorsementSeq
  }
  const { _max } = await tx.policy.aggregate({
    where: { parentPolicyId, id: selfId ? { not: selfId } : undefined },
    _max: { endorsementSeq: true },
  })
  return (_max.endorsementSeq ?? 0) + 1
}

/** Data dari form: klien dan polis induk yang dipilih harus sudah ada di database. */
async function checkedPolicyData(tx: Tx, input: PolicyInput, selfId?: string) {
  const data = await policyData(tx, input)
  if (input.clientId && !data.clientId) {
    throw new Error("Klien yang dipilih belum tersimpan di database.")
  }
  if (input.parentPolicyId && !data.parentPolicyId) {
    throw new Error("Polis induk tidak ditemukan di database.")
  }
  if (selfId && data.parentPolicyId === selfId) {
    throw new Error("Polis tidak bisa menjadi induk dirinya sendiri.")
  }
  const duplicate = await tx.policy.findUnique({
    where: { policyNo: data.policyNo },
    select: { id: true },
  })
  if (duplicate && duplicate.id !== selfId) {
    throw new Error(`No. polis ${data.policyNo} sudah terdaftar.`)
  }
  return {
    ...data,
    endorsementSeq: await endorsementSeqFor(tx, input.type, data.parentPolicyId, selfId),
  }
}

async function writeInsurers(tx: Tx, policyId: string, input: PolicyInput) {
  const rows: SecurityPanelRow[] = input.insurers.length
    ? input.insurers
    : [{ id: "", insurer: input.insurer, share: 100, role: "As Leader" }]
  const roles = await tx.lookupValue.findMany({
    where: { lookupType: "security_role" },
    select: { id: true, code: true },
  })
  const roleIds = new Map(roles.map((r) => [r.code, r.id]))

  await tx.policyInsurer.deleteMany({ where: { policyId } })
  for (const row of rows) {
    const positionId = roleIds.get(row.role === "As Leader" ? "leader" : "member")
    if (!positionId) throw new Error("Lookup security_role belum di-seed.")
    await tx.policyInsurer.create({
      data: {
        policyId,
        insurerId: await resolveInsurerId(tx, row.insurer),
        sharePct: row.share,
        positionId,
      },
    })
  }
}

async function readPolicy(tx: Tx, id: string) {
  return toPolicyRecord(
    await tx.policy.findUniqueOrThrow({ where: { id }, include: policyInclude })
  )
}

/** Semua polis, atau hanya milik satu klien bila `clientId` (UUID) diisi. */
export async function listPolicies(
  params: { clientId?: string } = {}
): Promise<PolicyRecord[]> {
  await seedInitialPoliciesIfEmpty()
  const rows = await prisma.policy.findMany({
    where: params.clientId ? { clientId: params.clientId } : undefined,
    include: policyInclude,
    orderBy: { expiryDate: "desc" },
  })
  return rows.map(toPolicyRecord)
}

/** Polis yang berakhir dalam periode renewal terpanjang, supaya Marketing tidak memuat seluruh tabel. */
export async function listRenewalPolicies(today: string): Promise<PolicyRecord[]> {
  await seedInitialPoliciesIfEmpty()
  const rows = await prisma.policy.findMany({
    where: {
      expiryDate: {
        gte: new Date(today),
        lte: new Date(addDays(today, MAX_RENEWAL_DAYS)),
      },
    },
    include: policyInclude,
    orderBy: { expiryDate: "asc" },
  })
  return rows.map(toPolicyRecord)
}

export async function listPolicyFormOptions(): Promise<PolicyFormOptions> {
  const [insurers, currencies, placementLocations, cobOjkClasses] = await Promise.all([
    prisma.insurer.findMany({
      where: { isActive: true },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
    prisma.currency.findMany({
      where: { isActive: true },
      select: { code: true, name: true },
      orderBy: { code: "asc" },
    }),
    // Inactive values still used by a policy are kept so the form can show their name.
    prisma.lookupValue.findMany({
      where: {
        lookupType: "placement_location",
        OR: [{ isActive: true }, { policyPlacements: { some: {} } }],
      },
      select: { id: true, name: true, isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.cobOjkClass.findMany({
      where: { OR: [{ isActive: true }, { policies: { some: {} } }] },
      select: { id: true, name: true, isActive: true },
      orderBy: { name: "asc" },
    }),
  ])
  return {
    insurers: insurers.map((i) => i.name),
    currencies,
    placementLocations,
    cobOjkClasses,
  }
}

export async function getPolicyById(id: string): Promise<PolicyRecord | null> {
  if (!UUID_RE.test(id)) return null
  const row = await prisma.policy.findUnique({ where: { id }, include: policyInclude })
  return row ? toPolicyRecord(row) : null
}

export async function createPolicy(input: PolicyInput, userId: string): Promise<PolicyRecord> {
  return prisma.$transaction(async (tx) => {
    const { id } = await tx.policy.create({
      data: await checkedPolicyData(tx, input),
      select: { id: true },
    })
    await writeInsurers(tx, id, input)
    const record = await readPolicy(tx, id)
    await recordAudit(tx, {
      userId,
      entity: "policies",
      entityId: id,
      action: "Create",
      before: null,
      after: auditSnapshot(record),
    })
    return record
  })
}

export async function updatePolicy(
  id: string,
  input: PolicyInput,
  userId: string
): Promise<PolicyRecord> {
  return prisma.$transaction(async (tx) => {
    const before = await readPolicy(tx, id)
    await tx.policy.update({ where: { id }, data: await checkedPolicyData(tx, input, id) })
    await writeInsurers(tx, id, input)
    const record = await readPolicy(tx, id)
    await recordAudit(tx, {
      userId,
      entity: "policies",
      entityId: id,
      action: "Update",
      before: auditSnapshot(before),
      after: auditSnapshot(record),
    })
    return record
  })
}

export async function deletePolicy(id: string, userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.policy.findUnique({
      where: { id },
      include: {
        ...policyInclude,
        _count: { select: { claims: true, debitNotes: true, childPolicies: true } },
      },
    })
    if (!existing) throw new Error("Polis tidak ditemukan.")
    const { claims, debitNotes, childPolicies } = existing._count
    if (claims > 0) throw new Error("Polis sudah memiliki klaim dan tidak dapat dihapus.")
    if (debitNotes > 0) throw new Error("Polis sudah memiliki debit note dan tidak dapat dihapus.")
    if (childPolicies > 0) {
      throw new Error("Polis masih menjadi induk renewal, endorsement, atau pembatalan.")
    }

    await tx.policy.delete({ where: { id } })
    await recordAudit(tx, {
      userId,
      entity: "policies",
      entityId: id,
      action: "Delete",
      before: auditSnapshot(toPolicyRecord(existing)),
      after: null,
    })
  })
}

export async function seedInitialPoliciesIfEmpty(): Promise<number> {
  if ((await prisma.policy.count()) > 0) return 0
  await seedInitialClientsIfEmpty()
  const uploader = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  })

  // Parents first so endorsements can resolve parentPolicyId.
  const ordered = [...MOCK_POLICIES].sort(
    (a, b) => Number(a.parentPolicyId != null) - Number(b.parentPolicyId != null)
  )
  let created = 0
  for (const mock of ordered) {
    try {
      await prisma.$transaction(async (tx) => {
        const data = await policyData(tx, mock)
        const { id } = await tx.policy.create({
          data: {
            ...data,
            endorsementSeq: await endorsementSeqFor(tx, mock.type, data.parentPolicyId),
          },
          select: { id: true },
        })
        await writeInsurers(tx, id, mock)
        if (uploader) {
          for (const file of mock.files) {
            await tx.policyFile.create({
              data: {
                policyId: id,
                version: file.version,
                fileName: file.fileName,
                // Seed rows have no stored object; the path mirrors the file name.
                filePath: file.fileName,
                uploadedBy: uploader.id,
                uploadedAt: new Date(file.uploadedAt),
              },
            })
          }
        }
      })
      created++
    } catch (err) {
      console.error(`[seedInitialPoliciesIfEmpty] Failed seeding ${mock.policyNo}`, err)
    }
  }
  return created
}
