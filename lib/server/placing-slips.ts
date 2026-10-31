import "server-only"

import { cache } from "react"

import { Prisma, type SlipItemKind, type SlipStatus } from "@/lib/generated/prisma/client"

import type {
  ClassOfBusiness as CobType,
  ClauseOverride,
  LineItem,
  PlacingSlip,
  RateException,
  RateExceptionReason,
  RateLine,
  SecurityPanelRow,
} from "@/lib/data/types"
import { SLIPS as MOCK_SLIPS } from "@/lib/data/slips"
import { CLIENTS } from "@/lib/data/clients"
import { coverCodeFor } from "@/components/underwriting/slip-model"
import { normalizeCob } from "@/lib/format"
import { cobLookupKeys } from "@/lib/server/cob"
import { prisma } from "@/lib/prisma"
import { getSppaById } from "@/lib/server/sppa"
import { checkVehiclePair } from "@/lib/server/vehicles"
import {
  buildVehicleDescription,
  parseVehicleDescription,
} from "@/lib/data/ojk-motor"
import { nextDocumentNumber } from "@/server/services/number-generator"
import { recordAudit } from "@/server/services/audit"

const SLIP_ITEM_VEHICLE = {
  vehicleBrand: { select: { name: true } },
  vehicleType: { select: { name: true } },
} satisfies Prisma.SlipItemInclude

export interface PlacingSlipRecord extends PlacingSlip {
  dbId: string
  clientName?: string
  cobName?: string
  coverTypeName?: string | null
  createdByName?: string
  policyCount?: number
}

export interface PlacingSlipInput {
  clientId: string
  sppaId?: string | null
  cob: CobType | string
  typeOfCover?: string | null
  coverCode?: string | null
  insuredName: string
  correspondenceAddress?: string | null
  currency?: string
  status?: SlipStatus
  periodTba?: boolean
  inceptionDate?: string | null
  expiryDate?: string | null
  occupation?: string | null
  occupationId?: string | null
  riskLocation?: string | null
  coverage?: string | null
  constructionClass?: string | null
  indemnityPeriod?: string | null
  interestSection1?: string | null
  interestSection2?: string | null
  specialConditions?: string | null
  interestItems?: LineItem[]
  sumInsuredSection1?: LineItem[]
  sumInsuredSection2?: LineItem[]
  deductiblesSection1?: string[]
  deductiblesSection2?: string[]
  clauseIds?: string[]
  clauseOverrides?: Record<string, ClauseOverride>
  wordingForms?: string[]
  rateLines?: RateLine[]
  tplLines?: RateLine[]
  paLines?: RateLine[]
  rateExceptions?: Record<string, RateException>
  securityPanel?: SecurityPanelRow[]
  discountPct?: number
  adminCost?: number
  stampDuty?: number
  brokeragePct?: number
  includeVat?: boolean
  subjectivity?: string | null
  closingInstruction?: string | null
  coverNoteRemarks?: string | null
}

export interface ListPlacingSlipsParams {
  search?: string
  clientId?: string
  cob?: string
  status?: SlipStatus | string
}

let hasCheckedSeed = false

/**
 * Peta master data untuk menyimpan slip. Dibungkus `cache` supaya hanya
 * berlaku selama satu request: COB, cover, atau mata uang yang baru ditambah
 * di Master Data harus langsung dikenali, tanpa menunggu server restart.
 */
const getLookupsCache = cache(async () => {
  const [
    cobRows,
    coverTypeRows,
    occRows,
    currRows,
    rateKinds,
    secRoles,
    ccRows,
  ] = await Promise.all([
    prisma.classOfBusiness.findMany({
      select: { id: true, code: true, name: true },
    }),
    prisma.coverType.findMany({
      select: { id: true, cobId: true, code: true, name: true, abbreviation: true },
    }),
    prisma.occupation.findMany({
      select: { id: true, code: true, name: true },
    }),
    prisma.currency.findMany({
      select: { code: true },
    }),
    prisma.lookupValue.findMany({
      where: { lookupType: "rate_line_kind" },
      select: { id: true, code: true },
    }),
    prisma.lookupValue.findMany({
      where: { lookupType: "security_role" },
      select: { id: true, code: true },
    }),
    prisma.lookupValue.findMany({
      where: { lookupType: "construction_class" },
      select: { id: true, code: true },
    }),
  ])

  const cobsByName = new Map<string, { id: string; code: string; name: string }>()
  const cobsByCode = new Map<string, { id: string; code: string; name: string }>()
  for (const c of cobRows) {
    cobsByName.set(c.name.trim().toLowerCase(), c)
    cobsByCode.set(c.code.trim().toLowerCase(), c)
  }

  const coverTypesByName = new Map<
    string,
    { id: string; code: string; name: string; cobId: string; abbreviation: string | null }
  >()
  for (const ct of coverTypeRows) {
    coverTypesByName.set(`${ct.cobId}:${ct.name.trim().toLowerCase()}`, ct)
    coverTypesByName.set(`${ct.cobId}:${ct.code.trim().toLowerCase()}`, ct)
  }

  const occupationsByCode = new Map<string, { id: string; code: string; name: string }>()
  for (const o of occRows) {
    occupationsByCode.set(o.code.trim().toLowerCase(), o)
  }

  const rateLineKinds = new Map<string, string>()
  for (const rk of rateKinds) {
    rateLineKinds.set(rk.code.toLowerCase(), rk.id)
  }

  const securityRoles = new Map<string, string>()
  for (const sr of secRoles) {
    securityRoles.set(sr.code.toLowerCase(), sr.id)
  }

  const constructionClasses = new Map<string, string>()
  for (const cc of ccRows) {
    constructionClasses.set(cc.code.toUpperCase(), cc.id)
    constructionClasses.set(cc.code.toLowerCase(), cc.id)
  }

  const currencies = new Set<string>(currRows.map((c) => c.code))

  return {
    cobsByName,
    cobsByCode,
    coverTypesByName,
    occupationsByCode,
    constructionClasses,
    rateLineKinds,
    securityRoles,
    currencies,
  }
})

/**
 * Resolusi UUID klien berdasarkan UUID langsung atau fallback mapping ID mock / nama klien.
 */
async function resolveClientId(clientIdOrMock: string, fallbackInsuredName?: string): Promise<string> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    clientIdOrMock
  )
  if (isUuid) {
    const exists = await prisma.client.findUnique({
      where: { id: clientIdOrMock },
      select: { id: true },
    })
    if (exists) return exists.id
  }

  const mockMatch = CLIENTS.find((c) => c.id === clientIdOrMock)
  const targetName = mockMatch?.name || fallbackInsuredName

  if (targetName) {
    const foundByName = await prisma.client.findFirst({
      where: { name: { equals: targetName, mode: "insensitive" } },
      select: { id: true },
    })
    if (foundByName) return foundByName.id
  }

  const firstClient = await prisma.client.findFirst({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  })
  if (firstClient) return firstClient.id

  throw new Error("Klien tidak ditemukan di database.")
}

/**
 * Resolusi UUID COB.
 */
async function resolveCob(cobNameOrCode: string) {
  const cache = await getLookupsCache()
  for (const key of cobLookupKeys(cobNameOrCode)) {
    const hit = cache.cobsByName.get(key) ?? cache.cobsByCode.get(key)
    if (hit) return hit
  }
  // Dulu jatuh ke COB pertama, sehingga slip COB yang tidak dikenal diam-diam
  // tersimpan sebagai PROPERTY. Lebih baik ditolak dengan pesan yang jelas.
  throw new Error(
    `Class of business "${cobNameOrCode}" tidak ada di master data.`
  )
}

/**
 * Cover type master untuk type of cover slip, hanya di dalam COB yang sama.
 * Label lama yang tidak ada di master (misalnya "PAR + EQVET") tidak punya
 * padanan dan tetap disimpan sebagai teks saja.
 */
async function resolveCoverType(cobId: string, typeOfCover?: string | null) {
  if (!typeOfCover || !typeOfCover.trim()) return null
  const cache = await getLookupsCache()
  const key = `${cobId}:${typeOfCover.trim().toLowerCase()}`
  return cache.coverTypesByName.get(key) ?? null
}

/**
 * Ekstraksi angka bulan dari string indemnity period (misal "12 months" -> 12).
 */
function parseIndemnityMonths(val?: string | null): number | null {
  if (!val) return null
  const m = val.match(/\d+/)
  return m ? parseInt(m[0], 10) : null
}

/**
 * Resolusi UUID SPPA. Mendukung UUID database langsung maupun legacy mock ID (misal sp-001).
 */
async function resolveSppaId(sppaId?: string | null): Promise<string | null> {
  if (!sppaId || !sppaId.trim()) return null
  const trimmed = sppaId.trim()
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    const exists = await prisma.sppa.findUnique({
      where: { id: trimmed },
      select: { id: true },
    })
    if (exists) return exists.id
  }

  const sppa = await getSppaById(trimmed)
  return sppa?.dbId ?? null
}

type PrismaPlacingSlipWithRelations = Prisma.PlacingSlipGetPayload<{
  include: {
    client: { select: { id: true; name: true } }
    cob: { select: { id: true; code: true; name: true } }
    coverType: { select: { id: true; code: true; name: true; abbreviation: true } }
    occupation: { select: { id: true; code: true; name: true } }
    constructionClass: { select: { id: true; code: true; name: true } }
    currency: { select: { code: true } }
    creator: { select: { id: true; name: true } }
    items: {
      include: { vehicleBrand: { select: { name: true } }; vehicleType: { select: { name: true } } }
      orderBy: { sortOrder: "asc" }
    }
    rateLines: {
      include: { kind: { select: { id: true; code: true; name: true } } }
      orderBy: { sortOrder: "asc" }
    }
    securityPanel: {
      include: {
        insurer: { select: { id: true; name: true } }
        position: { select: { id: true; code: true; name: true } }
      }
      orderBy: { createdAt: "asc" }
    }
    clauses: {
      orderBy: { sortOrder: "asc" }
    }
    wordingForms: {
      include: { wordingForm: { select: { id: true; name: true } } }
    }
    _count: {
      select: { policies: true }
    }
  }
}>

/**
 * Transformasi record Prisma PlacingSlip ke interface PlacingSlipRecord.
 */
function toPlacingSlipRecord(raw: PrismaPlacingSlipWithRelations): PlacingSlipRecord {
  const normCob = normalizeCob(raw.cob.name as CobType)

  // Items grouping
  const interestItems: LineItem[] = []
  const sumInsuredSection1: LineItem[] = []
  const sumInsuredSection2: LineItem[] = []
  const deductiblesSection1: string[] = []
  const deductiblesSection2: string[] = []

  for (const it of raw.items) {
    if (it.kind === "Interest") {
      const parsed = parseVehicleDescription(it.description)
      interestItems.push({
        id: it.id,
        description: it.description,
        amount: it.amount ? Number(it.amount) : 0,
        vehicleBrandId: it.vehicleBrandId,
        vehicleTypeId: it.vehicleTypeId,
        vehicleBrandName: it.vehicleBrand?.name ?? null,
        vehicleTypeName: it.vehicleType?.name ?? null,
        licensePlate: parsed.licensePlate ?? null,
        chassisNumber: parsed.chassisNumber ?? null,
        engineNumber: parsed.engineNumber ?? null,
        year: parsed.year ?? null,
        color: parsed.color ?? null,
        vehicleModel: parsed.vehicleModel ?? null,
      })
    } else if (it.kind === "SumInsuredSection1") {
      sumInsuredSection1.push({
        id: it.id,
        description: it.description,
        amount: it.amount ? Number(it.amount) : 0,
      })
    } else if (it.kind === "SumInsuredSection2") {
      sumInsuredSection2.push({
        id: it.id,
        description: it.description,
        amount: it.amount ? Number(it.amount) : 0,
      })
    } else if (it.kind === "DeductibleSection1") {
      deductiblesSection1.push(it.description)
    } else if (it.kind === "DeductibleSection2") {
      deductiblesSection2.push(it.description)
    }
  }

  // Rate lines grouping
  const rateLines: RateLine[] = []
  const tplLines: RateLine[] = []
  const paLines: RateLine[] = []
  const rateExceptions: Record<string, RateException> = {}

  for (const rl of raw.rateLines) {
    const kindCode = rl.kind.code.toLowerCase()
    const lineItem: RateLine = {
      id: rl.id,
      label: rl.label,
      rate: rl.rate != null ? Number(rl.rate) : null,
      premium: Number(rl.premium),
      basis: rl.limitAmount != null ? String(Number(rl.limitAmount)) : undefined,
      min: rl.rateMin != null ? Number(rl.rateMin) : null,
      max: rl.rateMax != null ? Number(rl.rateMax) : null,
      deductible: rl.deductible ?? undefined,
    }

    if (kindCode === "tpl") {
      tplLines.push(lineItem)
    } else if (kindCode === "pa") {
      paLines.push(lineItem)
    } else {
      rateLines.push(lineItem)
    }

    if (rl.outOfBoundsReason) {
      let reason: RateExceptionReason = "Potongan sesuai nilai pertanggungan"
      let note = rl.outOfBoundsReason
      if (rl.outOfBoundsReason.startsWith("Perluasan jaminan:")) {
        reason = "Perluasan jaminan"
        note = rl.outOfBoundsReason.replace(/^Perluasan jaminan:\s*/, "")
      } else if (rl.outOfBoundsReason.startsWith("Potongan sesuai nilai pertanggungan:")) {
        reason = "Potongan sesuai nilai pertanggungan"
        note = rl.outOfBoundsReason.replace(/^Potongan sesuai nilai pertanggungan:\s*/, "")
      }
      rateExceptions[rl.id] = { reason, note }
    }
  }

  // Security Panel
  const securityPanel: SecurityPanelRow[] = raw.securityPanel.map((sp) => ({
    id: sp.id,
    insurer: sp.insurer.name,
    share: Number(sp.sharePct),
    role: sp.position.name === "As Leader" ? "As Leader" : "As Member",
  }))

  // Clauses & Overrides
  const clauseIds: string[] = []
  const clauseOverrides: Record<string, ClauseOverride> = {}
  for (const cl of raw.clauses) {
    clauseIds.push(cl.clauseId)
    if (cl.isEdited) {
      clauseOverrides[cl.clauseId] = {
        title: cl.title,
        wording: cl.wordingHtml,
      }
    }
  }

  // Wording forms
  const wordingForms = raw.wordingForms.map((wf) => wf.wordingForm.name)

  // Inception & Expiry formatting
  const inceptionDate = raw.inceptionDate
    ? raw.inceptionDate.toISOString().slice(0, 10)
    : null
  const expiryDate = raw.expiryDate
    ? raw.expiryDate.toISOString().slice(0, 10)
    : null

  // Sequence parsed from slipNo if available
  let seq = 0
  if (raw.slipNo) {
    const parts = raw.slipNo.split("/")
    if (parts.length > 0 && /^\d+$/.test(parts[0])) {
      seq = parseInt(parts[0], 10)
    }
  }

  return {
    id: raw.id,
    dbId: raw.id,
    slipNo: raw.slipNo,
    seq,
    cob: normCob,
    typeOfCover: raw.typeOfCover || raw.coverType?.name || "",
    // Singkatan cover dari master didahulukan; slip lama tanpa cover type
    // memakai kode bawaan dari label type of cover.
    coverCode:
      raw.coverType?.abbreviation ||
      coverCodeFor(normCob, raw.typeOfCover || raw.coverType?.name || ""),
    clientId: raw.clientId,
    sppaId: raw.sppaId,
    insuredName: raw.insuredName,
    correspondenceAddress: raw.correspondenceAddress || "",
    currency: raw.currencyCode,
    status: raw.status as SlipStatus,
    periodTba: raw.periodTba,
    inceptionDate,
    expiryDate,
    occupation: raw.occupation
      ? `${raw.occupation.code} - ${raw.occupation.name}`
      : undefined,
    riskLocation: raw.riskLocation || undefined,
    coverage: raw.coverage || undefined,
    constructionClass: raw.constructionClass?.code || undefined,
    indemnityPeriod: raw.indemnityMonths ? `${raw.indemnityMonths} bulan` : undefined,
    interestSection1: raw.interestSection1 || undefined,
    interestSection2: raw.interestSection2 || undefined,
    specialConditions: raw.specialConditions || undefined,
    interestItems,
    sumInsuredSection1,
    sumInsuredSection2,
    deductiblesSection1,
    deductiblesSection2,
    clauseIds,
    clauseOverrides: Object.keys(clauseOverrides).length > 0 ? clauseOverrides : undefined,
    wordingForms,
    rateLines,
    tplLines,
    paLines,
    rateExceptions: Object.keys(rateExceptions).length > 0 ? rateExceptions : undefined,
    securityPanel,
    discountPct: Number(raw.discountPct),
    adminCost: Number(raw.adminCost),
    stampDuty: Number(raw.stampDuty),
    brokeragePct: Number(raw.brokeragePct),
    includeVat: raw.includeVat,
    subjectivity: raw.subjectivity || undefined,
    closingInstruction: raw.closingInstruction || undefined,
    coverNoteRemarks: raw.coverNoteRemarks || undefined,
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
    clientName: raw.client.name,
    cobName: raw.cob.name,
    coverTypeName: raw.coverType?.name || null,
    createdByName: raw.creator.name,
    policyCount: raw._count.policies,
  }
}

/**
 * Mengambil daftar Placing Slip dari database PostgreSQL.
 */
export async function listPlacingSlips(
  params: ListPlacingSlipsParams = {}
): Promise<PlacingSlipRecord[]> {
  await seedInitialSlipsIfEmpty()

  const { search, clientId, cob, status } = params
  const whereAnd: Prisma.PlacingSlipWhereInput[] = []

  if (search && search.trim()) {
    const q = search.trim()
    whereAnd.push({
      OR: [
        { slipNo: { contains: q, mode: "insensitive" } },
        { insuredName: { contains: q, mode: "insensitive" } },
        { riskLocation: { contains: q, mode: "insensitive" } },
        { client: { name: { contains: q, mode: "insensitive" } } },
      ],
    })
  }

  if (clientId && clientId !== "all") {
    try {
      const resolvedClientId = await resolveClientId(clientId)
      whereAnd.push({ clientId: resolvedClientId })
    } catch {
      whereAnd.push({ clientId })
    }
  }

  if (cob && cob !== "all") {
    const norm = normalizeCob(cob as CobType).toLowerCase()
    whereAnd.push({
      cob: {
        OR: [
          { name: { equals: norm, mode: "insensitive" } },
          { code: { equals: norm, mode: "insensitive" } },
        ],
      },
    })
  }

  if (status && status !== "all") {
    whereAnd.push({ status: status as SlipStatus })
  }

  const records = await prisma.placingSlip.findMany({
    where: whereAnd.length > 0 ? { AND: whereAnd } : undefined,
    include: {
      client: { select: { id: true, name: true } },
      cob: { select: { id: true, code: true, name: true } },
      coverType: { select: { id: true, code: true, name: true, abbreviation: true } },
      occupation: { select: { id: true, code: true, name: true } },
      constructionClass: { select: { id: true, code: true, name: true } },
      currency: { select: { code: true } },
      creator: { select: { id: true, name: true } },
      items: { include: SLIP_ITEM_VEHICLE, orderBy: { sortOrder: "asc" } },
      rateLines: {
        include: { kind: { select: { id: true, code: true, name: true } } },
        orderBy: { sortOrder: "asc" },
      },
      securityPanel: {
        include: {
          insurer: { select: { id: true, name: true } },
          position: { select: { id: true, code: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      clauses: {
        orderBy: { sortOrder: "asc" },
      },
      wordingForms: {
        include: { wordingForm: { select: { id: true, name: true } } },
      },
      _count: {
        select: { policies: true },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  })

  return records.map(toPlacingSlipRecord)
}

/**
 * Mengambil detail satu Placing Slip berdasarkan UUID atau fallback legacy ID.
 */
export async function getPlacingSlipById(id: string): Promise<PlacingSlipRecord | null> {
  await seedInitialSlipsIfEmpty()

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id
  )

  const whereClause: Prisma.PlacingSlipWhereUniqueInput = isUuid
    ? { id }
    : { slipNo: id }

  let record = await prisma.placingSlip.findUnique({
    where: whereClause,
    include: {
      client: { select: { id: true, name: true } },
      cob: { select: { id: true, code: true, name: true } },
      coverType: { select: { id: true, code: true, name: true, abbreviation: true } },
      occupation: { select: { id: true, code: true, name: true } },
      constructionClass: { select: { id: true, code: true, name: true } },
      currency: { select: { code: true } },
      creator: { select: { id: true, name: true } },
      items: { include: SLIP_ITEM_VEHICLE, orderBy: { sortOrder: "asc" } },
      rateLines: {
        include: { kind: { select: { id: true, code: true, name: true } } },
        orderBy: { sortOrder: "asc" },
      },
      securityPanel: {
        include: {
          insurer: { select: { id: true, name: true } },
          position: { select: { id: true, code: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      clauses: {
        orderBy: { sortOrder: "asc" },
      },
      wordingForms: {
        include: { wordingForm: { select: { id: true, name: true } } },
      },
      _count: {
        select: { policies: true },
      },
    },
  })

  // Fallback pencocokan jika id yang dikirim adalah mock id seperti "s-001"
  if (!record && !isUuid) {
    const mock = MOCK_SLIPS.find((s) => s.id === id)
    if (mock?.slipNo) {
      record = await prisma.placingSlip.findUnique({
        where: { slipNo: mock.slipNo },
        include: {
          client: { select: { id: true, name: true } },
          cob: { select: { id: true, code: true, name: true } },
          coverType: { select: { id: true, code: true, name: true, abbreviation: true } },
          occupation: { select: { id: true, code: true, name: true } },
          constructionClass: { select: { id: true, code: true, name: true } },
          currency: { select: { code: true } },
          creator: { select: { id: true, name: true } },
          items: { include: SLIP_ITEM_VEHICLE, orderBy: { sortOrder: "asc" } },
          rateLines: {
            include: { kind: { select: { id: true, code: true, name: true } } },
            orderBy: { sortOrder: "asc" },
          },
          securityPanel: {
            include: {
              insurer: { select: { id: true, name: true } },
              position: { select: { id: true, code: true, name: true } },
            },
            orderBy: { createdAt: "asc" },
          },
          clauses: {
            orderBy: { sortOrder: "asc" },
          },
          wordingForms: {
            include: { wordingForm: { select: { id: true, name: true } } },
          },
          _count: {
            select: { policies: true },
          },
        },
      })
    }
  }

  if (!record) return null
  return toPlacingSlipRecord(record)
}

/**
 * Membuat Placing Slip baru di database PostgreSQL.
 */
export async function createPlacingSlip(
  input: PlacingSlipInput,
  userId: string
): Promise<PlacingSlipRecord> {
  const cache = await getLookupsCache()
  const resolvedClientId = await resolveClientId(input.clientId, input.insuredName)
  const resolvedCob = await resolveCob(input.cob)
  const resolvedCoverType = await resolveCoverType(resolvedCob.id, input.typeOfCover)

  // Resolusi occupation
  let occupationId: string | null = input.occupationId || null
  if (!occupationId && input.occupation) {
    const code = input.occupation.trim().split(/[^0-9A-Za-z]/)[0].toLowerCase()
    const foundOcc = cache.occupationsByCode.get(code)
    if (foundOcc) occupationId = foundOcc.id
  }

  // Resolusi currency
  const currencyCode = (input.currency || "IDR").toUpperCase()
  if (!cache.currencies.has(currencyCode)) {
    throw new Error(`Mata uang ${currencyCode} tidak didukung.`)
  }

  // Resolusi construction class
  let constructionClassId: string | null = null
  if (input.constructionClass) {
    constructionClassId = cache.constructionClasses.get(input.constructionClass) || null
  }

  // Parse indemnity months
  const indemnityMonths = parseIndemnityMonths(input.indemnityPeriod)

  // Inception & expiry dates
  const inceptionDate = input.inceptionDate ? new Date(input.inceptionDate) : null
  const expiryDate = input.expiryDate ? new Date(input.expiryDate) : null
  const resolvedSppaId = await resolveSppaId(input.sppaId)

  const record = await prisma.$transaction(async (tx) => {
    // 1. Buat master slip
    const slip = await tx.placingSlip.create({
      data: {
        clientId: resolvedClientId,
        sppaId: resolvedSppaId,
        cobId: resolvedCob.id,
        coverTypeId: resolvedCoverType?.id || null,
        typeOfCover: input.typeOfCover?.trim() || null,
        insuredName: input.insuredName.trim(),
        correspondenceAddress: input.correspondenceAddress?.trim() || null,
        currencyCode,
        status: (input.status as SlipStatus) || "Draft",
        periodTba: input.periodTba ?? false,
        inceptionDate,
        expiryDate,
        occupationId,
        riskLocation: input.riskLocation?.trim() || null,
        coverage: input.coverage?.trim() || null,
        constructionClassId,
        indemnityMonths,
        interestSection1: input.interestSection1?.trim() || null,
        interestSection2: input.interestSection2?.trim() || null,
        specialConditions: input.specialConditions?.trim() || null,
        discountPct: new Prisma.Decimal(input.discountPct ?? 0),
        adminCost: new Prisma.Decimal(input.adminCost ?? 0),
        stampDuty: new Prisma.Decimal(input.stampDuty ?? 0),
        brokeragePct: new Prisma.Decimal(input.brokeragePct ?? 0),
        includeVat: input.includeVat ?? false,
        subjectivity: input.subjectivity?.trim() || null,
        closingInstruction: input.closingInstruction?.trim() || null,
        coverNoteRemarks: input.coverNoteRemarks?.trim() || null,
        createdBy: userId,
      },
    })

    // 2. Insert items
    let sortIdx = 0
    const itemsToCreate: {
      slipId: string
      kind: SlipItemKind
      description: string
      amount: Prisma.Decimal | null
      sortOrder: number
      vehicleBrandId?: string | null
      vehicleTypeId?: string | null
    }[] = []

    if (input.interestItems) {
      const motor = normalizeCob(resolvedCob.name as CobType) === "Motor Vehicle"
      for (const it of input.interestItems) {
        const hasMotorData =
          motor &&
          Boolean(
            it.vehicleBrandId ||
            it.licensePlate ||
            it.chassisNumber ||
            it.vehicleModel
          )
        if (it.description?.trim() || hasMotorData) {
          const finalDesc = motor
            ? buildVehicleDescription(it) || it.description?.trim() || "Kendaraan Bermotor"
            : it.description.trim()
          itemsToCreate.push({
            slipId: slip.id,
            kind: "Interest",
            description: finalDesc,
            amount: new Prisma.Decimal(it.amount || 0),
            sortOrder: sortIdx++,
            ...(motor ? await checkVehiclePair(tx, it.vehicleBrandId, it.vehicleTypeId) : {}),
          })
        }
      }
    }

    if (input.sumInsuredSection1) {
      for (const it of input.sumInsuredSection1) {
        if (it.description.trim()) {
          itemsToCreate.push({
            slipId: slip.id,
            kind: "SumInsuredSection1",
            description: it.description.trim(),
            amount: new Prisma.Decimal(it.amount || 0),
            sortOrder: sortIdx++,
          })
        }
      }
    }

    if (input.sumInsuredSection2) {
      for (const it of input.sumInsuredSection2) {
        if (it.description.trim()) {
          itemsToCreate.push({
            slipId: slip.id,
            kind: "SumInsuredSection2",
            description: it.description.trim(),
            amount: new Prisma.Decimal(it.amount || 0),
            sortOrder: sortIdx++,
          })
        }
      }
    }

    if (input.deductiblesSection1) {
      for (const d of input.deductiblesSection1) {
        if (d.trim()) {
          itemsToCreate.push({
            slipId: slip.id,
            kind: "DeductibleSection1",
            description: d.trim(),
            amount: null,
            sortOrder: sortIdx++,
          })
        }
      }
    }

    if (input.deductiblesSection2) {
      for (const d of input.deductiblesSection2) {
        if (d.trim()) {
          itemsToCreate.push({
            slipId: slip.id,
            kind: "DeductibleSection2",
            description: d.trim(),
            amount: null,
            sortOrder: sortIdx++,
          })
        }
      }
    }

    if (itemsToCreate.length > 0) {
      await tx.slipItem.createMany({ data: itemsToCreate })
    }

    // 3. Insert rate lines
    let rateSortIdx = 0
    const rateKindId = cache.rateLineKinds.get("rate")!
    const tplKindId = cache.rateLineKinds.get("tpl")!
    const paKindId = cache.rateLineKinds.get("pa")!

    const rateLinesToCreate: {
      slipId: string
      kindId: string
      label: string
      limitAmount: Prisma.Decimal | null
      rate: Prisma.Decimal | null
      premium: Prisma.Decimal
      rateMin: Prisma.Decimal | null
      rateMax: Prisma.Decimal | null
      deductible: string | null
      outOfBoundsReason: string | null
      sortOrder: number
    }[] = []

    if (input.rateLines) {
      for (const rl of input.rateLines) {
        const exception = input.rateExceptions?.[rl.id]
        const reason = exception ? `${exception.reason}: ${exception.note}` : null
        rateLinesToCreate.push({
          slipId: slip.id,
          kindId: rateKindId,
          label: rl.label,
          limitAmount: null,
          rate: rl.rate != null ? new Prisma.Decimal(rl.rate) : null,
          premium: new Prisma.Decimal(rl.premium || 0),
          rateMin: rl.min != null ? new Prisma.Decimal(rl.min) : null,
          rateMax: rl.max != null ? new Prisma.Decimal(rl.max) : null,
          deductible: rl.deductible?.trim() || null,
          outOfBoundsReason: reason,
          sortOrder: rateSortIdx++,
        })
      }
    }

    if (input.tplLines) {
      for (const rl of input.tplLines) {
        const exception = input.rateExceptions?.[rl.id]
        const reason = exception ? `${exception.reason}: ${exception.note}` : null
        rateLinesToCreate.push({
          slipId: slip.id,
          kindId: tplKindId,
          label: rl.label,
          limitAmount: rl.basis ? new Prisma.Decimal(rl.basis) : null,
          rate: rl.rate != null ? new Prisma.Decimal(rl.rate) : null,
          premium: new Prisma.Decimal(rl.premium || 0),
          rateMin: rl.min != null ? new Prisma.Decimal(rl.min) : null,
          rateMax: rl.max != null ? new Prisma.Decimal(rl.max) : null,
          deductible: rl.deductible?.trim() || null,
          outOfBoundsReason: reason,
          sortOrder: rateSortIdx++,
        })
      }
    }

    if (input.paLines) {
      for (const rl of input.paLines) {
        const exception = input.rateExceptions?.[rl.id]
        const reason = exception ? `${exception.reason}: ${exception.note}` : null
        rateLinesToCreate.push({
          slipId: slip.id,
          kindId: paKindId,
          label: rl.label,
          limitAmount: rl.basis ? new Prisma.Decimal(rl.basis) : null,
          rate: rl.rate != null ? new Prisma.Decimal(rl.rate) : null,
          premium: new Prisma.Decimal(rl.premium || 0),
          rateMin: rl.min != null ? new Prisma.Decimal(rl.min) : null,
          rateMax: rl.max != null ? new Prisma.Decimal(rl.max) : null,
          deductible: rl.deductible?.trim() || null,
          outOfBoundsReason: reason,
          sortOrder: rateSortIdx++,
        })
      }
    }

    if (rateLinesToCreate.length > 0) {
      await tx.slipRateLine.createMany({ data: rateLinesToCreate })
    }

    // 4. Insert Security Panel
    if (input.securityPanel && input.securityPanel.length > 0) {
      const leaderRoleId = cache.securityRoles.get("leader")!
      const memberRoleId = cache.securityRoles.get("member")!

      for (const sp of input.securityPanel) {
        if (!sp.insurer.trim()) continue

        // Resolve or create insurer
        let insurer = await tx.insurer.findFirst({
          where: { name: { equals: sp.insurer.trim(), mode: "insensitive" } },
          select: { id: true },
        })
        if (!insurer) {
          insurer = await tx.insurer.create({
            data: { name: sp.insurer.trim() },
            select: { id: true },
          })
        }

        const positionId = sp.role === "As Leader" ? leaderRoleId : memberRoleId
        await tx.slipSecurityPanel.create({
          data: {
            slipId: slip.id,
            insurerId: insurer.id,
            sharePct: new Prisma.Decimal(sp.share || 0),
            positionId,
          },
        })
      }
    }

    // 5. Insert Clauses
    if (input.clauseIds && input.clauseIds.length > 0) {
      let clIdx = 0
      for (const clId of input.clauseIds) {
        // Resolve clause in database
        const clause = await tx.clause.findUnique({
          where: { id: clId },
          select: { id: true, title: true, wordingHtml: true },
        })

        if (clause) {
          const override = input.clauseOverrides?.[clId]
          await tx.slipClause.create({
            data: {
              slipId: slip.id,
              clauseId: clause.id,
              title: override?.title || clause.title,
              wordingHtml: override?.wording || clause.wordingHtml,
              isEdited: Boolean(override),
              sortOrder: clIdx++,
            },
          })
        }
      }
    }

    // 6. Insert Wording Forms
    if (input.wordingForms && input.wordingForms.length > 0) {
      for (const wf of input.wordingForms) {
        if (!wf.trim()) continue
        let form = await tx.wordingForm.findFirst({
          where: { name: { equals: wf.trim(), mode: "insensitive" } },
          select: { id: true },
        })
        if (!form) {
          form = await tx.wordingForm.create({
            data: { name: wf.trim() },
            select: { id: true },
          })
        }

        await tx.slipWordingForm.create({
          data: {
            slipId: slip.id,
            wordingFormId: form.id,
          },
        })
      }
    }

    // 7. Audit log
    await recordAudit(tx, {
      userId,
      entity: "placing_slips",
      entityId: slip.id,
      action: "Create",
      after: {
        insuredName: slip.insuredName,
        cob: resolvedCob.name,
        status: slip.status,
      },
    })

    return slip
  })

  const full = await getPlacingSlipById(record.id)
  if (!full) throw new Error("Gagal mengambil data placing slip setelah pembuatan.")
  return full
}

/**
 * Memperbarui Placing Slip di database PostgreSQL.
 */
export async function updatePlacingSlip(
  id: string,
  input: PlacingSlipInput,
  userId: string
): Promise<PlacingSlipRecord> {
  const cache = await getLookupsCache()
  const existing = await prisma.placingSlip.findUnique({
    where: { id },
    include: { cob: true },
  })

  if (!existing) {
    throw new Error("Placing slip tidak ditemukan.")
  }

  if (existing.status === "Cancelled" || existing.status === "Closed") {
    throw new Error(`Placing Slip berstatus ${existing.status} tidak dapat diubah.`)
  }

  const resolvedClientId = await resolveClientId(input.clientId, input.insuredName)
  const resolvedCob = await resolveCob(input.cob)
  const resolvedCoverType = await resolveCoverType(resolvedCob.id, input.typeOfCover)

  // Resolusi occupation
  let occupationId: string | null = input.occupationId || null
  if (!occupationId && input.occupation) {
    const code = input.occupation.trim().split(/[^0-9A-Za-z]/)[0].toLowerCase()
    const foundOcc = cache.occupationsByCode.get(code)
    if (foundOcc) occupationId = foundOcc.id
  }

  // Resolusi currency
  const currencyCode = (input.currency || "IDR").toUpperCase()
  if (!cache.currencies.has(currencyCode)) {
    throw new Error(`Mata uang ${currencyCode} tidak didukung.`)
  }

  // Resolusi construction class
  let constructionClassId: string | null = null
  if (input.constructionClass) {
    constructionClassId = cache.constructionClasses.get(input.constructionClass) || null
  }

  const indemnityMonths = parseIndemnityMonths(input.indemnityPeriod)
  const inceptionDate = input.inceptionDate ? new Date(input.inceptionDate) : null
  const expiryDate = input.expiryDate ? new Date(input.expiryDate) : null
  const resolvedSppaId =
    input.sppaId !== undefined ? await resolveSppaId(input.sppaId) : existing.sppaId

  await prisma.$transaction(async (tx) => {
    // 1. Update master slip
    await tx.placingSlip.update({
      where: { id },
      data: {
        clientId: resolvedClientId,
        sppaId: resolvedSppaId,
        cobId: resolvedCob.id,
        coverTypeId: resolvedCoverType?.id || null,
        typeOfCover: input.typeOfCover?.trim() || null,
        insuredName: input.insuredName.trim(),
        correspondenceAddress: input.correspondenceAddress?.trim() || null,
        currencyCode,
        status: (input.status as SlipStatus) || existing.status,
        periodTba: input.periodTba ?? existing.periodTba,
        inceptionDate,
        expiryDate,
        occupationId,
        riskLocation: input.riskLocation?.trim() || null,
        coverage: input.coverage?.trim() || null,
        constructionClassId,
        indemnityMonths,
        interestSection1: input.interestSection1?.trim() || null,
        interestSection2: input.interestSection2?.trim() || null,
        specialConditions: input.specialConditions?.trim() || null,
        discountPct: new Prisma.Decimal(input.discountPct ?? 0),
        adminCost: new Prisma.Decimal(input.adminCost ?? 0),
        stampDuty: new Prisma.Decimal(input.stampDuty ?? 0),
        brokeragePct: new Prisma.Decimal(input.brokeragePct ?? 0),
        includeVat: input.includeVat ?? false,
        subjectivity: input.subjectivity?.trim() || null,
        closingInstruction: input.closingInstruction?.trim() || null,
        coverNoteRemarks: input.coverNoteRemarks?.trim() || null,
      },
    })

    // 2. Refresh items
    await tx.slipItem.deleteMany({ where: { slipId: id } })
    let sortIdx = 0
    const itemsToCreate: {
      slipId: string
      kind: SlipItemKind
      description: string
      amount: Prisma.Decimal | null
      sortOrder: number
      vehicleBrandId?: string | null
      vehicleTypeId?: string | null
    }[] = []

    if (input.interestItems) {
      const motor = normalizeCob(resolvedCob.name as CobType) === "Motor Vehicle"
      for (const it of input.interestItems) {
        const hasMotorData =
          motor &&
          Boolean(
            it.vehicleBrandId ||
            it.licensePlate ||
            it.chassisNumber ||
            it.vehicleModel
          )
        if (it.description?.trim() || hasMotorData) {
          const finalDesc = motor
            ? buildVehicleDescription(it) || it.description?.trim() || "Kendaraan Bermotor"
            : it.description.trim()
          itemsToCreate.push({
            slipId: id,
            kind: "Interest",
            description: finalDesc,
            amount: new Prisma.Decimal(it.amount || 0),
            sortOrder: sortIdx++,
            ...(motor ? await checkVehiclePair(tx, it.vehicleBrandId, it.vehicleTypeId) : {}),
          })
        }
      }
    }

    if (input.sumInsuredSection1) {
      for (const it of input.sumInsuredSection1) {
        if (it.description.trim()) {
          itemsToCreate.push({
            slipId: id,
            kind: "SumInsuredSection1",
            description: it.description.trim(),
            amount: new Prisma.Decimal(it.amount || 0),
            sortOrder: sortIdx++,
          })
        }
      }
    }

    if (input.sumInsuredSection2) {
      for (const it of input.sumInsuredSection2) {
        if (it.description.trim()) {
          itemsToCreate.push({
            slipId: id,
            kind: "SumInsuredSection2",
            description: it.description.trim(),
            amount: new Prisma.Decimal(it.amount || 0),
            sortOrder: sortIdx++,
          })
        }
      }
    }

    if (input.deductiblesSection1) {
      for (const d of input.deductiblesSection1) {
        if (d.trim()) {
          itemsToCreate.push({
            slipId: id,
            kind: "DeductibleSection1",
            description: d.trim(),
            amount: null,
            sortOrder: sortIdx++,
          })
        }
      }
    }

    if (input.deductiblesSection2) {
      for (const d of input.deductiblesSection2) {
        if (d.trim()) {
          itemsToCreate.push({
            slipId: id,
            kind: "DeductibleSection2",
            description: d.trim(),
            amount: null,
            sortOrder: sortIdx++,
          })
        }
      }
    }

    if (itemsToCreate.length > 0) {
      await tx.slipItem.createMany({ data: itemsToCreate })
    }

    // 3. Refresh rate lines
    await tx.slipRateLine.deleteMany({ where: { slipId: id } })
    let rateSortIdx = 0
    const rateKindId = cache.rateLineKinds.get("rate")!
    const tplKindId = cache.rateLineKinds.get("tpl")!
    const paKindId = cache.rateLineKinds.get("pa")!

    const rateLinesToCreate: {
      slipId: string
      kindId: string
      label: string
      limitAmount: Prisma.Decimal | null
      rate: Prisma.Decimal | null
      premium: Prisma.Decimal
      rateMin: Prisma.Decimal | null
      rateMax: Prisma.Decimal | null
      deductible: string | null
      outOfBoundsReason: string | null
      sortOrder: number
    }[] = []

    if (input.rateLines) {
      for (const rl of input.rateLines) {
        const exception = input.rateExceptions?.[rl.id]
        const reason = exception ? `${exception.reason}: ${exception.note}` : null
        rateLinesToCreate.push({
          slipId: id,
          kindId: rateKindId,
          label: rl.label,
          limitAmount: null,
          rate: rl.rate != null ? new Prisma.Decimal(rl.rate) : null,
          premium: new Prisma.Decimal(rl.premium || 0),
          rateMin: rl.min != null ? new Prisma.Decimal(rl.min) : null,
          rateMax: rl.max != null ? new Prisma.Decimal(rl.max) : null,
          deductible: rl.deductible?.trim() || null,
          outOfBoundsReason: reason,
          sortOrder: rateSortIdx++,
        })
      }
    }

    if (input.tplLines) {
      for (const rl of input.tplLines) {
        const exception = input.rateExceptions?.[rl.id]
        const reason = exception ? `${exception.reason}: ${exception.note}` : null
        rateLinesToCreate.push({
          slipId: id,
          kindId: tplKindId,
          label: rl.label,
          limitAmount: rl.basis ? new Prisma.Decimal(rl.basis) : null,
          rate: rl.rate != null ? new Prisma.Decimal(rl.rate) : null,
          premium: new Prisma.Decimal(rl.premium || 0),
          rateMin: rl.min != null ? new Prisma.Decimal(rl.min) : null,
          rateMax: rl.max != null ? new Prisma.Decimal(rl.max) : null,
          deductible: rl.deductible?.trim() || null,
          outOfBoundsReason: reason,
          sortOrder: rateSortIdx++,
        })
      }
    }

    if (input.paLines) {
      for (const rl of input.paLines) {
        const exception = input.rateExceptions?.[rl.id]
        const reason = exception ? `${exception.reason}: ${exception.note}` : null
        rateLinesToCreate.push({
          slipId: id,
          kindId: paKindId,
          label: rl.label,
          limitAmount: rl.basis ? new Prisma.Decimal(rl.basis) : null,
          rate: rl.rate != null ? new Prisma.Decimal(rl.rate) : null,
          premium: new Prisma.Decimal(rl.premium || 0),
          rateMin: rl.min != null ? new Prisma.Decimal(rl.min) : null,
          rateMax: rl.max != null ? new Prisma.Decimal(rl.max) : null,
          deductible: rl.deductible?.trim() || null,
          outOfBoundsReason: reason,
          sortOrder: rateSortIdx++,
        })
      }
    }

    if (rateLinesToCreate.length > 0) {
      await tx.slipRateLine.createMany({ data: rateLinesToCreate })
    }

    // 4. Refresh Security Panel
    await tx.slipSecurityPanel.deleteMany({ where: { slipId: id } })
    if (input.securityPanel && input.securityPanel.length > 0) {
      const leaderRoleId = cache.securityRoles.get("leader")!
      const memberRoleId = cache.securityRoles.get("member")!

      for (const sp of input.securityPanel) {
        if (!sp.insurer.trim()) continue

        let insurer = await tx.insurer.findFirst({
          where: { name: { equals: sp.insurer.trim(), mode: "insensitive" } },
          select: { id: true },
        })
        if (!insurer) {
          insurer = await tx.insurer.create({
            data: { name: sp.insurer.trim() },
            select: { id: true },
          })
        }

        const positionId = sp.role === "As Leader" ? leaderRoleId : memberRoleId
        await tx.slipSecurityPanel.create({
          data: {
            slipId: id,
            insurerId: insurer.id,
            sharePct: new Prisma.Decimal(sp.share || 0),
            positionId,
          },
        })
      }
    }

    // 5. Refresh Clauses
    await tx.slipClause.deleteMany({ where: { slipId: id } })
    if (input.clauseIds && input.clauseIds.length > 0) {
      let clIdx = 0
      for (const clId of input.clauseIds) {
        const clause = await tx.clause.findUnique({
          where: { id: clId },
          select: { id: true, title: true, wordingHtml: true },
        })

        if (clause) {
          const override = input.clauseOverrides?.[clId]
          await tx.slipClause.create({
            data: {
              slipId: id,
              clauseId: clause.id,
              title: override?.title || clause.title,
              wordingHtml: override?.wording || clause.wordingHtml,
              isEdited: Boolean(override),
              sortOrder: clIdx++,
            },
          })
        }
      }
    }

    // 6. Refresh Wording Forms
    await tx.slipWordingForm.deleteMany({ where: { slipId: id } })
    if (input.wordingForms && input.wordingForms.length > 0) {
      for (const wf of input.wordingForms) {
        if (!wf.trim()) continue
        let form = await tx.wordingForm.findFirst({
          where: { name: { equals: wf.trim(), mode: "insensitive" } },
          select: { id: true },
        })
        if (!form) {
          form = await tx.wordingForm.create({
            data: { name: wf.trim() },
            select: { id: true },
          })
        }

        await tx.slipWordingForm.create({
          data: {
            slipId: id,
            wordingFormId: form.id,
          },
        })
      }
    }

    // 7. Audit log
    await recordAudit(tx, {
      userId,
      entity: "placing_slips",
      entityId: id,
      action: "Update",
      before: {
        insuredName: existing.insuredName,
        status: existing.status,
      },
      after: {
        insuredName: input.insuredName,
        status: input.status || existing.status,
      },
    })
  })

  const full = await getPlacingSlipById(id)
  if (!full) throw new Error("Gagal mengambil data placing slip setelah perbaruan.")
  return full
}

/**
 * Release Placing Slip dan terbitkan nomor resmi dokumen (PRD A-16).
 */
export async function releasePlacingSlip(
  id: string,
  userId: string
): Promise<PlacingSlipRecord> {
  const existing = await prisma.placingSlip.findUnique({
    where: { id },
    include: {
      cob: true,
      coverType: true,
      items: true,
      rateLines: true,
      client: true,
    },
  })

  if (!existing) {
    throw new Error("Placing slip tidak ditemukan.")
  }

  if (existing.status === "Released") {
    const full = await getPlacingSlipById(id)
    return full!
  }

  if (existing.status === "Cancelled" || existing.status === "Closed") {
    throw new Error(`Placing Slip berstatus ${existing.status} tidak dapat di-release.`)
  }

  // Lakukan rilis dalam transaksi
  await prisma.$transaction(async (tx) => {
    // Generate nomor slip dokumen jika belum ada
    let slipNo = existing.slipNo
    if (!slipNo) {
      const coverCode =
        existing.coverType?.abbreviation ||
        coverCodeFor(
          normalizeCob(existing.cob.name as CobType),
          existing.typeOfCover || existing.coverType?.name || ""
        )
      slipNo = await nextDocumentNumber(tx, { code: "PS", coverCode })
    }

    await tx.placingSlip.update({
      where: { id },
      data: {
        slipNo,
        status: "Released",
        releasedAt: new Date(),
        releasedBy: userId,
      },
    })

    await recordAudit(tx, {
      userId,
      entity: "placing_slips",
      entityId: id,
      action: "Release",
      before: { status: existing.status, slipNo: existing.slipNo },
      after: { status: "Released", slipNo },
    })
  })

  const full = await getPlacingSlipById(id)
  if (!full) throw new Error("Gagal mengambil data placing slip setelah rilis.")
  return full
}

/**
 * Mengubah status Placing Slip (misal: "Draft", "Quoted", "Closed", "Cancelled").
 */
export async function togglePlacingSlipStatus(
  id: string,
  status: SlipStatus,
  userId: string
): Promise<PlacingSlipRecord> {
  const existing = await prisma.placingSlip.findUnique({
    where: { id },
    select: { id: true, status: true, slipNo: true },
  })

  if (!existing) {
    throw new Error("Placing slip tidak ditemukan.")
  }

  if (status === "Released") {
    return releasePlacingSlip(id, userId)
  }

  await prisma.$transaction(async (tx) => {
    await tx.placingSlip.update({
      where: { id },
      data: { status },
    })

    await recordAudit(tx, {
      userId,
      entity: "placing_slips",
      entityId: id,
      // Pembatalan punya aksi sendiri di audit trail (Batal), bukan Ubah.
      action: status === "Cancelled" ? "Cancel" : "Update",
      before: { status: existing.status },
      after: { status },
    })
  })

  const full = await getPlacingSlipById(id)
  if (!full) throw new Error("Gagal mengambil data placing slip.")
  return full
}

/**
 * Menghapus Placing Slip secara permanen jika masih berstatus Draft dan tidak memiliki polis.
 */
export async function deletePlacingSlip(id: string, userId: string): Promise<void> {
  const existing = await prisma.placingSlip.findUnique({
    where: { id },
    select: {
      id: true,
      slipNo: true,
      status: true,
      insuredName: true,
      _count: {
        select: { policies: true },
      },
    },
  })

  if (!existing) {
    throw new Error("Placing slip tidak ditemukan.")
  }

  if (existing._count.policies > 0) {
    throw new Error(
      `Placing Slip ini sudah memiliki ${existing._count.policies} polis terhubung dan tidak dapat dihapus.`
    )
  }

  if (existing.status !== "Draft") {
    throw new Error(
      `Hanya Placing Slip berstatus "Draft" yang dapat dihapus fisik. Slip berstatus "${existing.status}" hanya dapat dibatalkan (Cancelled).`
    )
  }

  await prisma.$transaction(async (tx) => {
    await tx.slipItem.deleteMany({ where: { slipId: id } })
    await tx.slipRateLine.deleteMany({ where: { slipId: id } })
    await tx.slipSecurityPanel.deleteMany({ where: { slipId: id } })
    await tx.slipClause.deleteMany({ where: { slipId: id } })
    await tx.slipWordingForm.deleteMany({ where: { slipId: id } })
    await tx.placingSlip.delete({ where: { id } })

    await recordAudit(tx, {
      userId,
      entity: "placing_slips",
      entityId: id,
      action: "Delete",
      before: {
        id: existing.id,
        slipNo: existing.slipNo,
        insuredName: existing.insuredName,
        status: existing.status,
      },
    })
  })
}

/**
 * Pembenihan data awal 3 Placing Slip mock LCH jika tabel placing_slips masih kosong.
 */
export async function seedInitialSlipsIfEmpty(): Promise<number> {
  if (hasCheckedSeed) return 0

  const count = await prisma.placingSlip.count()
  if (count > 0) {
    hasCheckedSeed = true
    return 0
  }

  const admin = await prisma.user.findFirst({
    where: { isActive: true },
    select: { id: true },
  })
  if (!admin) return 0

  let seededCount = 0

  for (const mock of MOCK_SLIPS) {
    try {
      const cache = await getLookupsCache()
      const resolvedClientId = await resolveClientId(mock.clientId || "", mock.insuredName)
      const resolvedCob = await resolveCob(mock.cob)
      const resolvedCoverType = await resolveCoverType(resolvedCob.id, mock.typeOfCover)

      let occupationId: string | null = null
      if (mock.occupation) {
        const code = mock.occupation.trim().split(/[^0-9A-Za-z]/)[0].toLowerCase()
        const foundOcc = cache.occupationsByCode.get(code)
        if (foundOcc) occupationId = foundOcc.id
      }

      let constructionClassId: string | null = null
      if (mock.constructionClass) {
        constructionClassId = cache.constructionClasses.get(mock.constructionClass) || null
      }

      const indemnityMonths = parseIndemnityMonths(mock.indemnityPeriod)
      const inceptionDate = mock.inceptionDate ? new Date(mock.inceptionDate) : null
      const expiryDate = mock.expiryDate ? new Date(mock.expiryDate) : null

      await prisma.$transaction(async (tx) => {
        const slip = await tx.placingSlip.create({
          data: {
            slipNo: mock.slipNo || null,
            clientId: resolvedClientId,
            cobId: resolvedCob.id,
            coverTypeId: resolvedCoverType?.id || null,
            typeOfCover: mock.typeOfCover?.trim() || null,
            insuredName: mock.insuredName,
            correspondenceAddress: mock.correspondenceAddress || null,
            currencyCode: mock.currency || "IDR",
            status: (mock.status as SlipStatus) || "Draft",
            periodTba: mock.periodTba ?? false,
            inceptionDate,
            expiryDate,
            occupationId,
            riskLocation: mock.riskLocation || null,
            coverage: mock.coverage || null,
            constructionClassId,
            indemnityMonths,
            interestSection1: mock.interestSection1 || null,
            interestSection2: mock.interestSection2 || null,
            specialConditions: mock.specialConditions || null,
            discountPct: new Prisma.Decimal(mock.discountPct || 0),
            adminCost: new Prisma.Decimal(mock.adminCost || 0),
            stampDuty: new Prisma.Decimal(mock.stampDuty || 0),
            brokeragePct: new Prisma.Decimal(mock.brokeragePct || 0),
            includeVat: mock.includeVat ?? false,
            subjectivity: mock.subjectivity || null,
            closingInstruction: mock.closingInstruction || null,
            coverNoteRemarks: mock.coverNoteRemarks || null,
            releasedAt: mock.status === "Released" ? new Date() : null,
            releasedBy: mock.status === "Released" ? admin.id : null,
            createdBy: admin.id,
          },
        })

        // Items
        let itIdx = 0
        const itemsData: {
          slipId: string
          kind: SlipItemKind
          description: string
          amount: Prisma.Decimal | null
          sortOrder: number
        }[] = []

        for (const it of mock.interestItems || []) {
          itemsData.push({
            slipId: slip.id,
            kind: "Interest",
            description: it.description,
            amount: new Prisma.Decimal(it.amount || 0),
            sortOrder: itIdx++,
          })
        }
        for (const it of mock.sumInsuredSection1 || []) {
          itemsData.push({
            slipId: slip.id,
            kind: "SumInsuredSection1",
            description: it.description,
            amount: new Prisma.Decimal(it.amount || 0),
            sortOrder: itIdx++,
          })
        }
        for (const it of mock.sumInsuredSection2 || []) {
          itemsData.push({
            slipId: slip.id,
            kind: "SumInsuredSection2",
            description: it.description,
            amount: new Prisma.Decimal(it.amount || 0),
            sortOrder: itIdx++,
          })
        }
        for (const d of mock.deductiblesSection1 || []) {
          itemsData.push({
            slipId: slip.id,
            kind: "DeductibleSection1",
            description: d,
            amount: null,
            sortOrder: itIdx++,
          })
        }
        for (const d of mock.deductiblesSection2 || []) {
          itemsData.push({
            slipId: slip.id,
            kind: "DeductibleSection2",
            description: d,
            amount: null,
            sortOrder: itIdx++,
          })
        }
        if (itemsData.length > 0) {
          await tx.slipItem.createMany({ data: itemsData })
        }

        // Rate Lines
        let rIdx = 0
        const rateKindId = cache.rateLineKinds.get("rate")!
        const tplKindId = cache.rateLineKinds.get("tpl")!
        const paKindId = cache.rateLineKinds.get("pa")!

        const rateData: {
          slipId: string
          kindId: string
          label: string
          limitAmount: Prisma.Decimal | null
          rate: Prisma.Decimal | null
          premium: Prisma.Decimal
          rateMin: Prisma.Decimal | null
          rateMax: Prisma.Decimal | null
          deductible: string | null
          outOfBoundsReason: string | null
          sortOrder: number
        }[] = []

        for (const rl of mock.rateLines || []) {
          rateData.push({
            slipId: slip.id,
            kindId: rateKindId,
            label: rl.label,
            limitAmount: null,
            rate: rl.rate != null ? new Prisma.Decimal(rl.rate) : null,
            premium: new Prisma.Decimal(rl.premium || 0),
            rateMin: rl.min != null ? new Prisma.Decimal(rl.min) : null,
            rateMax: rl.max != null ? new Prisma.Decimal(rl.max) : null,
            deductible: rl.deductible?.trim() || null,
            outOfBoundsReason: null,
            sortOrder: rIdx++,
          })
        }
        for (const rl of mock.tplLines || []) {
          rateData.push({
            slipId: slip.id,
            kindId: tplKindId,
            label: rl.label,
            limitAmount: rl.basis ? new Prisma.Decimal(rl.basis) : null,
            rate: rl.rate != null ? new Prisma.Decimal(rl.rate) : null,
            premium: new Prisma.Decimal(rl.premium || 0),
            rateMin: null,
            rateMax: null,
            deductible: rl.deductible?.trim() || null,
            outOfBoundsReason: null,
            sortOrder: rIdx++,
          })
        }
        for (const rl of mock.paLines || []) {
          rateData.push({
            slipId: slip.id,
            kindId: paKindId,
            label: rl.label,
            limitAmount: rl.basis ? new Prisma.Decimal(rl.basis) : null,
            rate: rl.rate != null ? new Prisma.Decimal(rl.rate) : null,
            premium: new Prisma.Decimal(rl.premium || 0),
            rateMin: null,
            rateMax: null,
            deductible: rl.deductible?.trim() || null,
            outOfBoundsReason: null,
            sortOrder: rIdx++,
          })
        }
        if (rateData.length > 0) {
          await tx.slipRateLine.createMany({ data: rateData })
        }

        // Security Panel
        if (mock.securityPanel) {
          const leaderRoleId = cache.securityRoles.get("leader")!
          const memberRoleId = cache.securityRoles.get("member")!
          for (const sp of mock.securityPanel) {
            let insurer = await tx.insurer.findFirst({
              where: { name: { equals: sp.insurer.trim(), mode: "insensitive" } },
              select: { id: true },
            })
            if (!insurer) {
              insurer = await tx.insurer.create({
                data: { name: sp.insurer.trim() },
                select: { id: true },
              })
            }
            const positionId = sp.role === "As Leader" ? leaderRoleId : memberRoleId
            await tx.slipSecurityPanel.create({
              data: {
                slipId: slip.id,
                insurerId: insurer.id,
                sharePct: new Prisma.Decimal(sp.share || 0),
                positionId,
              },
            })
          }
        }

        // Clauses (match first 5 clauses if mock clause ID is abstract)
        const clausesToLink = await tx.clause.findMany({ take: 8, select: { id: true, title: true, wordingHtml: true } })
        let clOrder = 0
        for (const cl of clausesToLink) {
          await tx.slipClause.create({
            data: {
              slipId: slip.id,
              clauseId: cl.id,
              title: cl.title,
              wordingHtml: cl.wordingHtml,
              isEdited: false,
              sortOrder: clOrder++,
            },
          })
        }

        // Wording Forms
        for (const wf of mock.wordingForms || []) {
          let form = await tx.wordingForm.findFirst({
            where: { name: { equals: wf.trim(), mode: "insensitive" } },
            select: { id: true },
          })
          if (!form) {
            form = await tx.wordingForm.create({
              data: { name: wf.trim() },
              select: { id: true },
            })
          }
          await tx.slipWordingForm.create({
            data: {
              slipId: slip.id,
              wordingFormId: form.id,
            },
          })
        }
      })
      seededCount++
    } catch (err) {
      console.error(`Gagal membenihkan mock slip ${mock.id}:`, err)
    }
  }

  hasCheckedSeed = true
  return seededCount
}
