import "server-only"

import type { AuditAction, Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import {
  diffChanges,
  recordAudit,
  type AuditEntry,
} from "@/server/services/audit"

export { diffChanges, recordAudit, type AuditEntry }

export interface AuditLogRecord {
  id: string
  userId: string
  userName: string
  userEmail: string
  userJobTitle: string | null
  entity: string
  entityId: string
  action: AuditAction
  changes: Record<string, { before: unknown; after: unknown }> | null
  createdAt: string
  /** Readable name of the audited record, e.g. client name or policy number. */
  entityLabel: string | null
  /** Display names for the IDs referenced in `changes`, keyed by ID. */
  refNames: Record<string, string>
}

type AuditChanges = Record<string, { before: unknown; after: unknown }>

type AuditRow = Prisma.AuditLogGetPayload<{
  include: {
    user: { select: { id: true; name: true; email: true; jobTitle: true } }
  }
}>

type RefModel =
  | "user"
  | "client"
  | "sppa"
  | "placingSlip"
  | "policy"
  | "claim"
  | "classOfBusiness"
  | "coverType"
  | "occupation"
  | "insurer"
  | "adjuster"
  | "wordingForm"
  | "cobOjkClass"
  | "bankAccount"
  | "lookupValue"
  | "vehicleBrand"
  | "vehicleType"

const ENTITY_MODEL: Record<string, RefModel> = {
  users: "user",
  clients: "client",
  sppa: "sppa",
  placing_slips: "placingSlip",
  policies: "policy",
  claims: "claim",
  classes_of_business: "classOfBusiness",
  cover_types: "coverType",
  insurers: "insurer",
  adjusters: "adjuster",
  wording_forms: "wordingForm",
  cob_ojk_classes: "cobOjkClass",
  bank_accounts: "bankAccount",
  lookup_values: "lookupValue",
  vehicle_brands: "vehicleBrand",
  vehicle_types: "vehicleType",
}

/** Foreign keys that do not point at lookup_values; every other `*Id` key does. */
const FIELD_MODEL: Record<string, RefModel> = {
  userId: "user",
  createdBy: "user",
  createdById: "user",
  releasedBy: "user",
  issuedBy: "user",
  uploadedBy: "user",
  clientId: "client",
  sppaId: "sppa",
  placingSlipId: "placingSlip",
  slipId: "placingSlip",
  policyId: "policy",
  parentPolicyId: "policy",
  claimId: "claim",
  cobId: "classOfBusiness",
  coverTypeId: "coverType",
  occupationId: "occupation",
  insurerId: "insurer",
  adjusterId: "adjuster",
  wordingFormId: "wordingForm",
  cobOjkClassId: "cobOjkClass",
  bankAccountId: "bankAccount",
  vehicleBrandId: "vehicleBrand",
  brandId: "vehicleBrand",
  vehicleTypeId: "vehicleType",
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type NamePairs = Promise<[string, string][]>

const NAME_RESOLVERS: Record<RefModel, (ids: string[]) => NamePairs> = {
  user: (ids) =>
    prisma.user
      .findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
      .then((rows) => rows.map((r) => [r.id, r.name])),
  client: (ids) =>
    prisma.client
      .findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
      .then((rows) => rows.map((r) => [r.id, r.name])),
  sppa: (ids) =>
    prisma.sppa
      .findMany({
        where: { id: { in: ids } },
        select: { id: true, insuredName: true },
      })
      .then((rows) => rows.map((r) => [r.id, r.insuredName])),
  placingSlip: (ids) =>
    prisma.placingSlip
      .findMany({
        where: { id: { in: ids } },
        select: { id: true, slipNo: true, insuredName: true },
      })
      .then((rows) =>
        rows.map((r) => [r.id, r.slipNo ?? `${r.insuredName} (draft)`])
      ),
  policy: (ids) =>
    prisma.policy
      .findMany({
        where: { id: { in: ids } },
        select: { id: true, policyNo: true },
      })
      .then((rows) => rows.map((r) => [r.id, r.policyNo])),
  claim: (ids) =>
    prisma.claim
      .findMany({ where: { id: { in: ids } }, select: { id: true, claimNo: true } })
      .then((rows) => rows.map((r) => [r.id, r.claimNo])),
  classOfBusiness: (ids) =>
    prisma.classOfBusiness
      .findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
      .then((rows) => rows.map((r) => [r.id, r.name])),
  coverType: (ids) =>
    prisma.coverType
      .findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
      .then((rows) => rows.map((r) => [r.id, r.name])),
  occupation: (ids) =>
    prisma.occupation
      .findMany({
        where: { id: { in: ids } },
        select: { id: true, code: true, name: true },
      })
      .then((rows) => rows.map((r) => [r.id, `${r.code} - ${r.name}`])),
  insurer: (ids) =>
    prisma.insurer
      .findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
      .then((rows) => rows.map((r) => [r.id, r.name])),
  adjuster: (ids) =>
    prisma.adjuster
      .findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
      .then((rows) => rows.map((r) => [r.id, r.name])),
  wordingForm: (ids) =>
    prisma.wordingForm
      .findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
      .then((rows) => rows.map((r) => [r.id, r.name])),
  cobOjkClass: (ids) =>
    prisma.cobOjkClass
      .findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
      .then((rows) => rows.map((r) => [r.id, r.name])),
  bankAccount: (ids) =>
    prisma.bankAccount
      .findMany({
        where: { id: { in: ids } },
        select: { id: true, accountNo: true, bank: { select: { name: true } } },
      })
      .then((rows) => rows.map((r) => [r.id, `${r.bank.name} ${r.accountNo}`])),
  lookupValue: (ids) =>
    prisma.lookupValue
      .findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
      .then((rows) => rows.map((r) => [r.id, r.name])),
  vehicleBrand: (ids) =>
    prisma.vehicleBrand
      .findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
      .then((rows) => rows.map((r) => [r.id, r.name])),
  vehicleType: (ids) =>
    prisma.vehicleType
      .findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, brand: { select: { name: true } } },
      })
      .then((rows) => rows.map((r) => [r.id, `${r.brand.name} ${r.name}`])),
}

function refModelFor(key: string): RefModel | null {
  return FIELD_MODEL[key] ?? (key.endsWith("Id") ? "lookupValue" : null)
}

/** Name fields read from the snapshot when the record itself has been deleted. */
const SNAPSHOT_NAME_FIELDS = [
  "policyNo",
  "claimNo",
  "slipNo",
  "name",
  "insuredName",
  "accountNo",
  "email",
]

function nameFromSnapshot(changes: AuditChanges | null): string | null {
  if (!changes) return null
  for (const field of SNAPSHOT_NAME_FIELDS) {
    const value = changes[field]?.after ?? changes[field]?.before
    if (typeof value === "string" && value.trim()) return value
  }
  return null
}

async function toAuditRecords(rows: AuditRow[]): Promise<AuditLogRecord[]> {
  const wanted = new Map<RefModel, Set<string>>()
  const want = (model: RefModel | null | undefined, id: unknown) => {
    if (!model || typeof id !== "string" || !UUID_PATTERN.test(id)) return
    if (!wanted.has(model)) wanted.set(model, new Set())
    wanted.get(model)!.add(id)
  }

  for (const r of rows) {
    want(ENTITY_MODEL[r.entity], r.entityId)
    const changes = r.changes as AuditChanges | null
    for (const [key, change] of Object.entries(changes ?? {})) {
      const model = refModelFor(key)
      want(model, change?.before)
      want(model, change?.after)
    }
  }

  const resolved = await Promise.all(
    [...wanted].map(([model, ids]) => NAME_RESOLVERS[model]([...ids]))
  )
  const names = new Map(resolved.flat())

  // Deleted records keep their name in the snapshot of their own Create/Delete log.
  const missing = [...wanted.values()]
    .flatMap((ids) => [...ids])
    .filter((id) => !names.has(id))
  if (missing.length > 0) {
    const snapshots = await prisma.auditLog.findMany({
      where: { entityId: { in: missing }, action: { in: ["Create", "Delete"] } },
      select: { entityId: true, changes: true },
      orderBy: { createdAt: "desc" },
    })
    for (const s of snapshots) {
      const name = nameFromSnapshot(s.changes as AuditChanges | null)
      if (name && !names.has(s.entityId)) names.set(s.entityId, name)
    }
  }

  return rows.map((r) => {
    const changes = (r.changes as AuditChanges | null) || null
    const refNames: Record<string, string> = {}
    for (const change of Object.values(changes ?? {})) {
      for (const value of [change?.before, change?.after]) {
        if (typeof value === "string" && names.has(value)) {
          refNames[value] = names.get(value)!
        }
      }
    }

    return {
      id: r.id,
      userId: r.userId,
      userName: r.user.name,
      userEmail: r.user.email,
      userJobTitle: r.user.jobTitle,
      entity: r.entity,
      entityId: r.entityId,
      action: r.action,
      changes,
      createdAt: r.createdAt.toISOString(),
      entityLabel: names.get(r.entityId) ?? nameFromSnapshot(changes),
      refNames,
    }
  })
}

export interface ListAuditLogsParams {
  search?: string
  entity?: string
  action?: AuditAction
  userId?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

export interface ListAuditLogsResult {
  items: AuditLogRecord[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Query audit logs with search, multi-attribute filtering, and pagination.
 */
export async function listAuditLogs(
  params: ListAuditLogsParams = {}
): Promise<ListAuditLogsResult> {
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 50))
  const skip = (page - 1) * pageSize

  const where: Prisma.AuditLogWhereInput = {}

  if (params.entity && params.entity.trim()) {
    where.entity = { equals: params.entity.trim(), mode: "insensitive" }
  }

  if (params.action) {
    where.action = params.action
  }

  if (params.userId && params.userId.trim()) {
    where.userId = params.userId.trim()
  }

  if (params.startDate || params.endDate) {
    where.createdAt = {}
    if (params.startDate) {
      const start = new Date(params.startDate)
      start.setHours(0, 0, 0, 0)
      where.createdAt.gte = start
    }
    if (params.endDate) {
      const end = new Date(params.endDate)
      end.setHours(23, 59, 59, 999)
      where.createdAt.lte = end
    }
  }

  if (params.search && params.search.trim()) {
    const q = params.search.trim()
    const isUuid = UUID_PATTERN.test(q)

    where.OR = [
      {
        user: {
          name: { contains: q, mode: "insensitive" },
        },
      },
      {
        user: {
          email: { contains: q, mode: "insensitive" },
        },
      },
      {
        entity: { contains: q, mode: "insensitive" },
      },
      ...(isUuid
        ? [
            { entityId: { equals: q } },
            { id: { equals: q } },
          ]
        : []),
    ]
  }

  const [total, rows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            jobTitle: true,
          },
        },
      },
    }),
  ])

  const items = await toAuditRecords(rows)

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  }
}

/**
 * Fetch a single audit log entry by ID.
 */
export async function getAuditLogById(
  id: string
): Promise<AuditLogRecord | null> {
  const r = await prisma.auditLog.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          jobTitle: true,
        },
      },
    },
  })

  if (!r) return null

  const [record] = await toAuditRecords([r])
  return record
}

/**
 * Get distinct entity names present in the audit log for filter dropdown.
 */
export async function listAuditEntities(): Promise<string[]> {
  const groups = await prisma.auditLog.groupBy({
    by: ["entity"],
    orderBy: { entity: "asc" },
  })
  return groups.map((g) => g.entity)
}
