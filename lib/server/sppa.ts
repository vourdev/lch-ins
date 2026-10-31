import "server-only"

import { cache } from "react"

import { Prisma, type SppaStatus as PrismaSppaStatus } from "@/lib/generated/prisma/client"

import type {
  ClassOfBusiness as CobType,
  Sppa,
  SppaStatus,
} from "@/lib/data/types"
import { SPPA as MOCK_SPPA } from "@/lib/data/sppa"
import { CLIENTS } from "@/lib/data/clients"
import { normalizeCob } from "@/lib/format"
import { prisma } from "@/lib/prisma"
import { cobLookupKeys } from "@/lib/server/cob"
import { checkVehiclePair } from "@/lib/server/vehicles"
import { recordAudit } from "@/server/services/audit"

export interface SppaRecord extends Sppa {
  dbId: string
  coverTypeId?: string | null
  occupationId?: string | null
  createdBy?: string
  clientName?: string
  isUsedInSlips?: boolean
  slipCount?: number
  linkedSlip?: {
    id: string
    slipNo: string | null
    status: string
  } | null
}

export interface SppaInput {
  clientId: string
  cob: CobType | string
  typeOfCover: string
  insuredName: string
  riskLocation?: string | null
  occupation?: string | null
  occupationId?: string | null
  coverTypeId?: string | null
  vehicleBrandId?: string | null
  vehicleTypeId?: string | null
  currency?: string
  sumInsured: number
  periodStart?: string | null
  periodEnd?: string | null
  answers?: Record<string, string>
  status?: SppaStatus
}

export interface ListSppaParams {
  search?: string
  clientId?: string
  cob?: string
  status?: SppaStatus | string
}

let hasCheckedSeed = false

/**
 * Peta master data untuk menyimpan SPPA, berlaku satu request saja supaya
 * isian master yang baru ditambah langsung dikenali.
 */
const getSppaLookupsCache = cache(async () => {
  const [cobRows, coverTypeRows, occRows, currRows] = await Promise.all([
    prisma.classOfBusiness.findMany({
      select: { id: true, code: true, name: true },
    }),
    prisma.coverType.findMany({
      select: { id: true, cobId: true, code: true, name: true },
    }),
    prisma.occupation.findMany({
      select: { id: true, code: true, name: true },
    }),
    prisma.currency.findMany({
      select: { code: true },
    }),
  ])

  const cobsByName = new Map<string, { id: string; code: string; name: string }>()
  const cobsByCode = new Map<string, { id: string; code: string; name: string }>()
  for (const c of cobRows) {
    cobsByName.set(c.name.trim().toLowerCase(), c)
    cobsByCode.set(c.code.trim().toLowerCase(), c)
  }

  const coverTypesByName = new Map<string, string>()
  for (const ct of coverTypeRows) {
    coverTypesByName.set(`${ct.cobId}:${ct.name.trim().toLowerCase()}`, ct.id)
    coverTypesByName.set(`${ct.cobId}:${ct.code.trim().toLowerCase()}`, ct.id)
  }

  const occupationsByCode = new Map<string, { id: string; name: string }>()
  for (const o of occRows) {
    occupationsByCode.set(o.code.trim().toLowerCase(), { id: o.id, name: o.name })
  }

  const currencies = new Set<string>(currRows.map((c) => c.code.toUpperCase()))

  return {
    cobsByName,
    cobsByCode,
    coverTypesByName,
    occupationsByCode,
    currencies,
  }
})

type SppaLookups = Awaited<ReturnType<typeof getSppaLookupsCache>>

async function resolveClientId(clientId: string): Promise<string> {
  const trimmed = clientId.trim()
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    const existing = await prisma.client.findUnique({
      where: { id: trimmed },
      select: { id: true },
    })
    if (existing) return existing.id
  }

  const mock = CLIENTS.find((c) => c.id === trimmed)
  if (mock) {
    const matched = await prisma.client.findFirst({
      where: { name: { equals: mock.name.trim(), mode: "insensitive" } },
      select: { id: true },
    })
    if (matched) return matched.id
  }

  const byName = await prisma.client.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" } },
    select: { id: true },
  })
  if (byName) return byName.id

  const fallback = await prisma.client.findFirst({ select: { id: true } })
  if (!fallback) {
    throw new Error("Belum ada data klien terdaftar di database.")
  }
  return fallback.id
}

function resolveCobId(
  cache: SppaLookups,
  cobStr: string
): { id: string; name: string } {
  for (const key of cobLookupKeys(cobStr)) {
    const found = cache.cobsByName.get(key) ?? cache.cobsByCode.get(key)
    if (found) return found
  }
  // Dulu jatuh ke COB pertama; SPPA dengan COB yang tidak dikenal lebih baik
  // ditolak daripada tersimpan dengan COB yang salah.
  throw new Error(`Class of business "${cobStr}" tidak ada di master data.`)
}

function resolveCoverTypeId(
  cache: SppaLookups,
  cobId: string,
  typeOfCover: string
): string | null {
  if (!typeOfCover || !typeOfCover.trim()) return null
  const norm = typeOfCover.trim().toLowerCase()
  // Hanya cover type milik COB yang sama; label lama tanpa padanan tetap teks.
  return cache.coverTypesByName.get(`${cobId}:${norm}`) ?? null
}

function resolveOccupationId(
  cache: SppaLookups,
  occupationStr?: string | null
): string | null {
  if (!occupationStr || !occupationStr.trim()) return null
  const match = occupationStr.trim().match(/^(\d+)/)
  if (!match) return null
  const code = match[1].toLowerCase()
  return cache.occupationsByCode.get(code)?.id ?? null
}

const sppaInclude = {
  client: { select: { id: true, name: true, clientType: { select: { name: true } } } },
  cob: { select: { id: true, code: true, name: true } },
  coverType: { select: { id: true, code: true, name: true } },
  occupation: { select: { id: true, code: true, name: true } },
  vehicleBrand: { select: { name: true } },
  vehicleType: { select: { name: true } },
  placingSlips: {
    select: { id: true, slipNo: true, status: true },
    take: 1,
  },
  _count: {
    select: { placingSlips: true },
  },
} satisfies Prisma.SppaInclude

type PrismaSppaWithRelations = Prisma.SppaGetPayload<{ include: typeof sppaInclude }>

function mapPrismaSppaToRecord(raw: PrismaSppaWithRelations): SppaRecord {
  const sumInsuredNum = raw.sumInsured ? Number(raw.sumInsured.toString()) : 0
  const periodStart = raw.periodStart
    ? new Date(raw.periodStart).toISOString().slice(0, 10)
    : null
  const periodEnd = raw.periodEnd
    ? new Date(raw.periodEnd).toISOString().slice(0, 10)
    : null
  const createdAt = raw.createdAt
    ? new Date(raw.createdAt).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10)
  const updatedAt = raw.updatedAt
    ? new Date(raw.updatedAt).toISOString().slice(0, 10)
    : createdAt

  const answersObj =
    raw.answers && typeof raw.answers === "object" && !Array.isArray(raw.answers)
      ? (raw.answers as Record<string, string>)
      : {}

  const typeOfCover =
    raw.coverType?.name ||
    answersObj._typeOfCover ||
    raw.cob?.name ||
    "Property All Risks (PAR)"

  const occupationLabel = raw.occupation
    ? `${raw.occupation.code} - ${raw.occupation.name}`
    : answersObj._occupationText || undefined

  const slipCount = raw._count?.placingSlips ?? raw.placingSlips?.length ?? 0
  const firstSlip = raw.placingSlips?.[0]
    ? {
        id: raw.placingSlips[0].id,
        slipNo: raw.placingSlips[0].slipNo ?? null,
        status: raw.placingSlips[0].status,
      }
    : null

  return {
    id: raw.id,
    dbId: raw.id,
    clientId: raw.clientId,
    clientName: raw.client?.name ?? undefined,
    cob: normalizeCob(raw.cob?.name),
    typeOfCover,
    insuredName: raw.insuredName,
    riskLocation: raw.riskLocation ?? "",
    occupation: occupationLabel,
    currency: raw.currencyCode ?? "IDR",
    sumInsured: sumInsuredNum,
    periodStart,
    periodEnd,
    answers: answersObj,
    status: (raw.status as SppaStatus) ?? "Draft",
    createdAt,
    updatedAt,
    vehicleBrandId: raw.vehicleBrandId,
    vehicleTypeId: raw.vehicleTypeId,
    vehicleBrandName: raw.vehicleBrand?.name ?? null,
    vehicleTypeName: raw.vehicleType?.name ?? null,
    coverTypeId: raw.coverTypeId ?? null,
    occupationId: raw.occupationId ?? null,
    createdBy: raw.createdBy,
    isUsedInSlips: slipCount > 0,
    slipCount,
    linkedSlip: firstSlip,
  }
}

/**
 * Auto-seed initial 3 mock SPPA records into PostgreSQL if table is empty.
 */
export async function seedInitialSppaIfEmpty(): Promise<number> {
  if (hasCheckedSeed) return 0

  const count = await prisma.sppa.count()
  if (count > 0) {
    hasCheckedSeed = true
    return 0
  }

  const cache = await getSppaLookupsCache()
  const defaultUser = await prisma.user.findFirst({ select: { id: true } })
  if (!defaultUser) return 0

  let seeded = 0

  for (const item of MOCK_SPPA) {
    try {
      const clientId = await resolveClientId(item.clientId)
      const cob = resolveCobId(cache, item.cob)
      const coverTypeId = resolveCoverTypeId(cache, cob.id, item.typeOfCover)
      const occupationId = resolveOccupationId(cache, item.occupation)
      const currencyCode = cache.currencies.has(item.currency.toUpperCase())
        ? item.currency.toUpperCase()
        : "IDR"

      const answers = {
        ...(item.answers ?? {}),
        _typeOfCover: item.typeOfCover,
        ...(item.occupation ? { _occupationText: item.occupation } : {}),
      }

      await prisma.sppa.create({
        data: {
          clientId,
          cobId: cob.id,
          coverTypeId,
          insuredName: item.insuredName.trim(),
          riskLocation: item.riskLocation || null,
          occupationId,
          currencyCode,
          sumInsured: new Prisma.Decimal(item.sumInsured || 0),
          periodStart: item.periodStart ? new Date(item.periodStart) : null,
          periodEnd: item.periodEnd ? new Date(item.periodEnd) : null,
          answers,
          status: item.status,
          createdBy: defaultUser.id,
          createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
          updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
        },
      })
      seeded++
    } catch (err) {
      console.error(`[seedInitialSppaIfEmpty] Failed seeding mock SPPA: ${item.id}`, err)
    }
  }

  hasCheckedSeed = true
  return seeded
}

/**
 * Retrieve list of SPPA records with relational filters.
 */
export async function listSppa(params: ListSppaParams = {}): Promise<SppaRecord[]> {
  await seedInitialSppaIfEmpty()

  const where: Prisma.SppaWhereInput = {}

  if (params.clientId && params.clientId !== "all") {
    const resolvedId = await resolveClientId(params.clientId)
    where.clientId = resolvedId
  }

  if (params.cob && params.cob !== "all") {
    where.cob = {
      name: { equals: params.cob.trim(), mode: "insensitive" },
    }
  }

  if (params.status && params.status !== "all") {
    where.status = params.status as PrismaSppaStatus
  }

  if (params.search && params.search.trim()) {
    const q = params.search.trim()
    where.OR = [
      { insuredName: { contains: q, mode: "insensitive" } },
      { riskLocation: { contains: q, mode: "insensitive" } },
      { client: { name: { contains: q, mode: "insensitive" } } },
      { cob: { name: { contains: q, mode: "insensitive" } } },
      { coverType: { name: { contains: q, mode: "insensitive" } } },
    ]
  }

  const rows = await prisma.sppa.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: sppaInclude,
  })

  return rows.map(mapPrismaSppaToRecord)
}

/**
 * Retrieve single SPPA record by database UUID or legacy ID.
 */
export async function getSppaById(id: string): Promise<SppaRecord | null> {
  await seedInitialSppaIfEmpty()

  if (!id || !id.trim()) return null
  const trimmed = id.trim()

  const include = sppaInclude

  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    const found = await prisma.sppa.findUnique({
      where: { id: trimmed },
      include,
    })
    if (found) return mapPrismaSppaToRecord(found)
  }

  const mock = MOCK_SPPA.find((s) => s.id === trimmed)
  if (mock) {
    const byInsured = await prisma.sppa.findFirst({
      where: { insuredName: { equals: mock.insuredName.trim(), mode: "insensitive" } },
      include,
    })
    if (byInsured) return mapPrismaSppaToRecord(byInsured)
  }

  return null
}

/** Merek dan tipe wajib untuk Motor Vehicle, dan dikosongkan untuk COB lain. */
async function vehicleFieldsFor(cobName: string, input: SppaInput) {
  if (normalizeCob(cobName) !== "Motor Vehicle") {
    return { vehicleBrandId: null, vehicleTypeId: null }
  }
  if (!input.vehicleBrandId) throw new Error("Merek kendaraan wajib dipilih.")
  return checkVehiclePair(prisma, input.vehicleBrandId, input.vehicleTypeId)
}

/**
 * Create a new SPPA record in PostgreSQL.
 */
export async function createSppa(input: SppaInput, userId: string): Promise<SppaRecord> {
  const cache = await getSppaLookupsCache()
  const clientId = await resolveClientId(input.clientId)
  const cob = resolveCobId(cache, input.cob)
  const coverTypeId = resolveCoverTypeId(cache, cob.id, input.typeOfCover)
  const occupationId = resolveOccupationId(cache, input.occupation)
  const currencyCode =
    input.currency && cache.currencies.has(input.currency.toUpperCase())
      ? input.currency.toUpperCase()
      : "IDR"

  const answers = {
    ...(input.answers ?? {}),
    _typeOfCover: input.typeOfCover,
    ...(input.occupation ? { _occupationText: input.occupation } : {}),
  }

  const created = await prisma.sppa.create({
    data: {
      clientId,
      cobId: cob.id,
      coverTypeId,
      insuredName: input.insuredName.trim(),
      riskLocation: input.riskLocation?.trim() || null,
      occupationId,
      currencyCode,
      sumInsured: new Prisma.Decimal(input.sumInsured || 0),
      periodStart: input.periodStart ? new Date(input.periodStart) : null,
      periodEnd: input.periodEnd ? new Date(input.periodEnd) : null,
      answers,
      status: input.status ?? "Draft",
      ...(await vehicleFieldsFor(cob.name, input)),
      createdBy: userId,
    },
    include: sppaInclude,
  })

  if (userId) {
    await recordAudit({
      userId,
      entity: "sppa",
      entityId: created.id,
      action: "Create",
      after: created,
    })
  }

  return mapPrismaSppaToRecord(created)
}

/**
 * Update an existing SPPA record in PostgreSQL.
 */
export async function updateSppa(
  id: string,
  input: SppaInput,
  userId?: string
): Promise<SppaRecord> {
  const existing = await getSppaById(id)
  if (!existing) {
    throw new Error("Data SPPA tidak ditemukan.")
  }

  const before = await prisma.sppa.findUnique({
    where: { id: existing.dbId },
  })

  const cache = await getSppaLookupsCache()
  const clientId = await resolveClientId(input.clientId)
  const cob = resolveCobId(cache, input.cob)
  const coverTypeId = resolveCoverTypeId(cache, cob.id, input.typeOfCover)
  const occupationId = resolveOccupationId(cache, input.occupation)
  const currencyCode =
    input.currency && cache.currencies.has(input.currency.toUpperCase())
      ? input.currency.toUpperCase()
      : existing.currency

  const answers = {
    ...(input.answers ?? {}),
    _typeOfCover: input.typeOfCover,
    ...(input.occupation ? { _occupationText: input.occupation } : {}),
  }

  const updated = await prisma.sppa.update({
    where: { id: existing.dbId },
    data: {
      clientId,
      cobId: cob.id,
      coverTypeId,
      insuredName: input.insuredName.trim(),
      riskLocation: input.riskLocation?.trim() || null,
      occupationId,
      currencyCode,
      sumInsured: new Prisma.Decimal(input.sumInsured || 0),
      periodStart: input.periodStart ? new Date(input.periodStart) : null,
      periodEnd: input.periodEnd ? new Date(input.periodEnd) : null,
      answers,
      status: input.status ?? existing.status,
      ...(await vehicleFieldsFor(cob.name, input)),
    },
    include: sppaInclude,
  })

  if (userId) {
    await recordAudit({
      userId,
      entity: "sppa",
      entityId: existing.dbId,
      action: "Update",
      before,
      after: updated,
    })
  }

  return mapPrismaSppaToRecord(updated)
}

/**
 * Update SPPA operational status (Draft <-> Submitted).
 */
export async function toggleSppaStatus(
  id: string,
  status: SppaStatus,
  userId?: string
): Promise<void> {
  const existing = await getSppaById(id)
  if (!existing) {
    throw new Error("Data SPPA tidak ditemukan.")
  }

  const before = await prisma.sppa.findUnique({
    where: { id: existing.dbId },
    select: { status: true },
  })

  await prisma.sppa.update({
    where: { id: existing.dbId },
    data: { status },
  })

  if (userId) {
    await recordAudit({
      userId,
      entity: "sppa",
      entityId: existing.dbId,
      action: "Update",
      before: { status: before?.status },
      after: { status },
    })
  }
}

/**
 * Delete SPPA record from PostgreSQL.
 * Rejects deletion if SPPA is referenced in any Placing Slip.
 */
export async function deleteSppa(id: string, userId?: string): Promise<void> {
  const existing = await getSppaById(id)
  if (!existing) {
    throw new Error("Data SPPA tidak ditemukan.")
  }

  const slipCount = await prisma.placingSlip.count({
    where: { sppaId: existing.dbId },
  })

  if (slipCount > 0) {
    throw new Error(
      "SPPA sudah digunakan dalam Placing Slip. Tidak dapat dihapus secara permanen."
    )
  }

  const before = await prisma.sppa.findUnique({
    where: { id: existing.dbId },
  })

  await prisma.sppa.delete({
    where: { id: existing.dbId },
  })

  if (userId) {
    await recordAudit({
      userId,
      entity: "sppa",
      entityId: existing.dbId,
      action: "Delete",
      before,
    })
  }
}
