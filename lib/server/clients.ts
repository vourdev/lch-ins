import "server-only"

import { cache } from "react"

import type {
  ClassOfBusiness as CobType,
  Client,
  ClientAddress,
  ClientDocument,
  ClientStatus,
  ClientType,
} from "@/lib/data/types"
import { CLIENTS } from "@/lib/data/clients"
import { normalizeCob } from "@/lib/format"
import type { Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { cobLookupKeys } from "@/lib/server/cob"
import {
  assertClaimableFile,
  deleteStoredFiles,
  storedFilePath,
  storedFileUrl,
} from "@/lib/server/stored-files"
import { recordAudit } from "@/server/services/audit"

export interface ClientRecord extends Client {
  dbId: string
  isUsedInDocuments?: boolean
}

export interface ClientAddressInput {
  id?: string
  label: string
  value: string
  isPrimary?: boolean
}

export interface ClientDocumentInput {
  id?: string
  type: string
  fileName: string
  /** Id stored_files bila file baru diunggah untuk baris ini. */
  fileId?: string
}

export interface ClientInput {
  clientType: ClientType
  name: string
  npwp?: string | null
  idType?: string | null
  idNumber?: string | null
  birthPlace?: string | null
  birthDate?: string | null
  contactPerson?: string | null
  contactPersonIdNumber?: string | null
  email?: string | null
  phone?: string | null
  incomeSource?: string | null
  insurancePurpose?: string | null
  insurancePurposeNote?: string | null
  kycDate?: string | null
  cob?: CobType | string | null
  status?: ClientStatus | string
  notes?: string | null
  addresses?: ClientAddressInput[]
  documents?: ClientDocumentInput[]
}

export interface ListClientsParams {
  search?: string
  cob?: string
  status?: string
}

/**
 * Runtime guard to prevent redundant `prisma.client.count()` queries on every client listing.
 */
let hasCheckedSeed = false

/**
 * Peta nilai lookup dan COB ke UUID. Berlaku satu request saja: nilai baru
 * di Master Data (misalnya tujuan asuransi) harus langsung bisa disimpan.
 */
const getLookupsCache = cache(async () => {
  const [lookupRows, cobRows] = await Promise.all([
    prisma.lookupValue.findMany({
      where: {
        lookupType: {
          in: [
            "client_type",
            "client_status",
            "id_type",
            "income_source",
            "insurance_purpose",
            "address_type",
            "client_document_type",
          ],
        },
      },
      select: { id: true, lookupType: true, code: true, name: true },
    }),
    prisma.classOfBusiness.findMany({
      select: { id: true, code: true, name: true },
    }),
  ])

  const byTypeAndCode = new Map<string, { id: string; name: string }>()
  const byTypeAndName = new Map<string, { id: string; code: string }>()

  for (const row of lookupRows) {
    byTypeAndCode.set(`${row.lookupType}:${row.code.toLowerCase()}`, {
      id: row.id,
      name: row.name,
    })
    byTypeAndName.set(`${row.lookupType}:${row.name.toLowerCase()}`, {
      id: row.id,
      code: row.code,
    })
  }

  const cobsByName = new Map<string, string>()
  const cobsByCode = new Map<string, string>()

  for (const cob of cobRows) {
    cobsByName.set(cob.name.toLowerCase(), cob.id)
    cobsByCode.set(cob.code.toLowerCase(), cob.id)
  }

  return { byTypeAndCode, byTypeAndName, cobsByName, cobsByCode }
})

type ClientLookups = Awaited<ReturnType<typeof getLookupsCache>>

function resolveLookupId(
  cache: ClientLookups,
  type: string,
  valueOrCode: string | null | undefined
): string | null {
  if (!valueOrCode || !valueOrCode.trim()) return null
  const key = valueOrCode.trim().toLowerCase()

  // Match by display name (e.g., "Korporasi", "Active")
  const byName = cache.byTypeAndName.get(`${type}:${key}`)
  if (byName) return byName.id

  // Match by code (e.g., "corporate", "active")
  const byCode = cache.byTypeAndCode.get(`${type}:${key}`)
  if (byCode) return byCode.id

  return null
}

function resolveCobId(
  cache: ClientLookups,
  cobValue: string | null | undefined
): string | null {
  if (!cobValue || !cobValue.trim()) return null
  for (const key of cobLookupKeys(cobValue)) {
    const id = cache.cobsByName.get(key) ?? cache.cobsByCode.get(key)
    if (id) return id
  }
  // COB klien boleh kosong. Dulu nama yang tidak cocok jatuh ke COB pertama
  // atau dicocokkan sebagian; lebih aman dibiarkan kosong.
  return null
}

/**
 * Format Date to ISO date-only string (YYYY-MM-DD).
 */
function toDateOnly(d: Date | null | undefined): string | undefined {
  if (!d) return undefined
  return d.toISOString().split("T")[0]
}

type PrismaClientWithRelations = Prisma.ClientGetPayload<{
  include: {
    clientType: true
    idType: true
    incomeSource: true
    insurancePurpose: true
    status: true
    cob: true
    addresses: {
      include: { addressType: true }
    }
    documents: {
      include: { documentType: true }
    }
    _count: {
      select: {
        sppa: true
        placingSlips: true
        policies: true
      }
    }
  }
}>

/**
 * Transform Prisma database entity into UI-compatible ClientRecord.
 */
function mapPrismaClientToRecord(
  c: PrismaClientWithRelations,
  counts?: { sppa?: number; placingSlips?: number; policies?: number }
): ClientRecord {
  const isUsed = Boolean(
    (counts?.sppa ?? c._count?.sppa ?? 0) > 0 ||
      (counts?.placingSlips ?? c._count?.placingSlips ?? 0) > 0 ||
      (counts?.policies ?? c._count?.policies ?? 0) > 0
  )

  const addresses: ClientAddress[] = (c.addresses || []).map((a) => ({
    id: a.id,
    label: a.addressType?.name || "Alamat Korespondensi",
    value: a.address,
    isPrimary: a.isPrimary,
    phone: undefined,
  }))

  const documents: ClientDocument[] = (c.documents || []).map((d) => ({
    id: d.id,
    type: d.documentType?.name || "Lain-lain",
    fileName: d.fileName,
    uploadedAt: toDateOnly(d.uploadedAt) || "",
    url: storedFileUrl(d.filePath),
  }))

  const cobName: CobType = normalizeCob(c.cob?.name)

  return {
    id: c.id,
    dbId: c.id,
    clientType: (c.clientType?.name === "Perorangan"
      ? "Perorangan"
      : "Korporasi") as ClientType,
    name: c.name,
    npwp: c.npwp || "",
    idType: c.idType?.name || undefined,
    idNumber: c.idNumber || undefined,
    birthPlace: c.birthPlace || undefined,
    birthDate: toDateOnly(c.birthDate),
    contactPerson: c.contactPerson || "",
    contactPersonIdNumber: c.contactPersonIdNumber || undefined,
    email: c.email || "",
    phone: c.phone || "",
    incomeSource: c.incomeSource?.name || undefined,
    insurancePurpose: c.insurancePurpose?.name || undefined,
    insurancePurposeNote: c.insurancePurposeNote || undefined,
    kycDate: toDateOnly(c.kycDate),
    cob: cobName,
    status: (c.status?.name || "Active") as ClientStatus,
    notes: c.notes || undefined,
    addresses,
    documents,
    createdAt: toDateOnly(c.createdAt) || new Date().toISOString().split("T")[0],
    isUsedInDocuments: isUsed,
  }
}

/**
 * Auto-seed 12 default mock clients to PostgreSQL if the clients table is empty.
 */
export async function seedInitialClientsIfEmpty(): Promise<number> {
  if (hasCheckedSeed) return 0

  const count = await prisma.client.count()
  if (count > 0) {
    hasCheckedSeed = true
    return count
  }

  const cache = await getLookupsCache()
  const firstUser = await prisma.user.findFirst({ select: { id: true } })
  const defaultUserId = firstUser?.id

  let seeded = 0

  for (const item of CLIENTS) {
    const clientTypeId =
      resolveLookupId(cache, "client_type", item.clientType) ||
      resolveLookupId(cache, "client_type", "corporate")!

    const statusId =
      resolveLookupId(cache, "client_status", item.status) ||
      resolveLookupId(cache, "client_status", "active")!

    const idTypeId = resolveLookupId(cache, "id_type", item.idType)
    const incomeSourceId = resolveLookupId(
      cache,
      "income_source",
      item.incomeSource
    )
    const insurancePurposeId = resolveLookupId(
      cache,
      "insurance_purpose",
      item.insurancePurpose
    )
    const cobId = resolveCobId(cache, item.cob)

    await prisma.$transaction(async (tx) => {
      const created = await tx.client.create({
        data: {
          clientTypeId,
          name: item.name.trim(),
          npwp: item.npwp || null,
          idTypeId,
          idNumber: item.idNumber || null,
          birthPlace: item.birthPlace || null,
          birthDate: item.birthDate ? new Date(item.birthDate) : null,
          contactPerson: item.contactPerson || null,
          contactPersonIdNumber: item.contactPersonIdNumber || null,
          email: item.email || null,
          phone: item.phone || null,
          incomeSourceId,
          insurancePurposeId,
          insurancePurposeNote: item.insurancePurposeNote || null,
          kycDate: item.kycDate ? new Date(item.kycDate) : null,
          cobId,
          statusId,
          notes: item.notes || null,
        },
      })

      if (item.addresses && item.addresses.length > 0) {
        for (const [idx, addr] of item.addresses.entries()) {
          const addressTypeId =
            resolveLookupId(cache, "address_type", addr.label) ||
            resolveLookupId(cache, "address_type", "correspondence")!

          await tx.clientAddress.create({
            data: {
              clientId: created.id,
              addressTypeId,
              address: addr.value,
              isPrimary: addr.isPrimary ?? idx === 0,
            },
          })
        }
      }

      if (defaultUserId && item.documents && item.documents.length > 0) {
        for (const doc of item.documents) {
          const docTypeId =
            resolveLookupId(cache, "client_document_type", doc.type) ||
            resolveLookupId(cache, "client_document_type", "other")!

          await tx.clientDocument.create({
            data: {
              clientId: created.id,
              documentTypeId: docTypeId,
              fileName: doc.fileName,
              filePath: doc.url || `/mock/docs/${doc.fileName}`,
              uploadedBy: defaultUserId,
              uploadedAt: doc.uploadedAt
                ? new Date(doc.uploadedAt)
                : new Date(),
            },
          })
        }
      }
    })

    seeded++
  }

  hasCheckedSeed = true
  return seeded
}

export interface ClientOption {
  id: string
  name: string
}

/** Id and name only, for pickers on pages that must not receive KYC data. */
export async function listClientOptions(): Promise<ClientOption[]> {
  await seedInitialClientsIfEmpty()
  return prisma.client.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
}

/**
 * Retrieve all clients from PostgreSQL with relational fields and filters.
 */
export async function listClients(
  params: ListClientsParams = {}
): Promise<ClientRecord[]> {
  await seedInitialClientsIfEmpty()

  const { search, cob, status } = params
  const whereAnd: Prisma.ClientWhereInput[] = []

  if (search && search.trim()) {
    const q = search.trim()
    whereAnd.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { contactPerson: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { npwp: { contains: q, mode: "insensitive" } },
      ],
    })
  }

  if (cob && cob !== "all") {
    whereAnd.push({
      cob: {
        name: { equals: cob, mode: "insensitive" },
      },
    })
  }

  if (status && status !== "all") {
    whereAnd.push({
      status: {
        name: { equals: status, mode: "insensitive" },
      },
    })
  }

  const where = whereAnd.length > 0 ? { AND: whereAnd } : {}

  const rows = await prisma.client.findMany({
    where,
    include: {
      clientType: true,
      idType: true,
      incomeSource: true,
      insurancePurpose: true,
      status: true,
      cob: true,
      addresses: {
        include: { addressType: true },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
      documents: {
        include: { documentType: true },
        orderBy: { uploadedAt: "desc" },
      },
      _count: {
        select: {
          sppa: true,
          placingSlips: true,
          policies: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return rows.map((r) => mapPrismaClientToRecord(r))
}

/**
 * Retrieve a single client record by ID from PostgreSQL.
 */
export async function getClientById(
  id: string
): Promise<ClientRecord | null> {
  if (!id) return null
  await seedInitialClientsIfEmpty()

  // Verify whether id is a valid UUID
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id
    )

  if (!isUuid) {
    // If legacy mock ID (e.g. c-001), lookup by mock name in DB
    const mock = CLIENTS.find((c) => c.id === id)
    if (mock) {
      const match = await prisma.client.findFirst({
        where: { name: { equals: mock.name, mode: "insensitive" } },
        include: {
          clientType: true,
          idType: true,
          incomeSource: true,
          insurancePurpose: true,
          status: true,
          cob: true,
          addresses: {
            include: { addressType: true },
            orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          },
          documents: {
            include: { documentType: true },
            orderBy: { uploadedAt: "desc" },
          },
          _count: {
            select: {
              sppa: true,
              placingSlips: true,
              policies: true,
            },
          },
        },
      })
      if (match) return mapPrismaClientToRecord(match)
    }
    return null
  }

  const row = await prisma.client.findUnique({
    where: { id },
    include: {
      clientType: true,
      idType: true,
      incomeSource: true,
      insurancePurpose: true,
      status: true,
      cob: true,
      addresses: {
        include: { addressType: true },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
      documents: {
        include: { documentType: true },
        orderBy: { uploadedAt: "desc" },
      },
      _count: {
        select: {
          sppa: true,
          placingSlips: true,
          policies: true,
        },
      },
    },
  })

  if (!row) return null
  return mapPrismaClientToRecord(row)
}

/**
 * Persist a new client record with associated addresses and documents into PostgreSQL.
 */
function missingUpload(fileName: string) {
  return new Error(`Isi berkas ${fileName} belum terunggah. Pilih ulang filenya.`)
}

/**
 * file_path untuk berkas KYC yang baru diunggah. Satu isi berkas hanya boleh
 * dipakai satu baris, karena menghapus baris ikut menghapus isinya.
 */
async function claimClientDocumentFile(
  tx: Prisma.TransactionClient,
  fileId: string,
  userId: string
) {
  await assertClaimableFile(tx, fileId, "client_document", userId)
  const filePath = storedFilePath(fileId)
  const used = await tx.clientDocument.findFirst({
    where: { filePath },
    select: { id: true },
  })
  if (used) {
    throw new Error("Berkas ini sudah dipakai dokumen lain. Pilih ulang filenya.")
  }
  return filePath
}

export async function createClient(
  input: ClientInput,
  userId?: string
): Promise<ClientRecord> {
  const cache = await getLookupsCache()
  const name = input.name.trim()

  // Guard against duplicate client name (case-insensitive)
  const existing = await prisma.client.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  })
  if (existing) {
    throw new Error(`Klien dengan nama "${name}" sudah terdaftar di database.`)
  }

  const clientTypeId =
    resolveLookupId(cache, "client_type", input.clientType) ||
    resolveLookupId(cache, "client_type", "corporate")!

  const statusId =
    resolveLookupId(cache, "client_status", input.status || "Active") ||
    resolveLookupId(cache, "client_status", "active")!

  const idTypeId = resolveLookupId(cache, "id_type", input.idType)
  const incomeSourceId = resolveLookupId(
    cache,
    "income_source",
    input.incomeSource
  )
  const insurancePurposeId = resolveLookupId(
    cache,
    "insurance_purpose",
    input.insurancePurpose
  )
  const cobId = resolveCobId(cache, input.cob)

  const corporate = input.clientType === "Korporasi"

  const record = await prisma.$transaction(async (tx) => {
    const created = await tx.client.create({
      data: {
        clientTypeId,
        name,
        npwp: input.npwp?.trim() || null,
        idTypeId: corporate ? null : idTypeId,
        idNumber: corporate ? null : input.idNumber?.trim() || null,
        birthPlace: corporate ? null : input.birthPlace?.trim() || null,
        birthDate:
          !corporate && input.birthDate ? new Date(input.birthDate) : null,
        contactPerson: input.contactPerson?.trim() || (corporate ? null : name),
        contactPersonIdNumber: corporate
          ? input.contactPersonIdNumber?.trim() || null
          : null,
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        incomeSourceId: corporate ? null : incomeSourceId,
        insurancePurposeId,
        insurancePurposeNote: input.insurancePurposeNote?.trim() || null,
        kycDate: input.kycDate ? new Date(input.kycDate) : new Date(),
        cobId,
        statusId,
        notes: input.notes?.trim() || null,
      },
      include: {
        clientType: true,
        idType: true,
        incomeSource: true,
        insurancePurpose: true,
        status: true,
        cob: true,
        addresses: { include: { addressType: true } },
        documents: { include: { documentType: true } },
      },
    })

    if (input.addresses && input.addresses.length > 0) {
      for (const [idx, addr] of input.addresses.entries()) {
        const addressTypeId =
          resolveLookupId(cache, "address_type", addr.label) ||
          resolveLookupId(cache, "address_type", "correspondence")!

        await tx.clientAddress.create({
          data: {
            clientId: created.id,
            addressTypeId,
            address: addr.value.trim(),
            isPrimary: addr.isPrimary ?? idx === 0,
          },
        })
      }
    }

    if (userId && input.documents && input.documents.length > 0) {
      for (const doc of input.documents) {
        if (!doc.fileName) continue
        if (!doc.fileId) throw missingUpload(doc.fileName)
        const docTypeId =
          resolveLookupId(cache, "client_document_type", doc.type) ||
          resolveLookupId(cache, "client_document_type", "other")!

        await tx.clientDocument.create({
          data: {
            clientId: created.id,
            documentTypeId: docTypeId,
            fileName: doc.fileName,
            filePath: await claimClientDocumentFile(tx, doc.fileId, userId),
            uploadedBy: userId,
          },
        })
      }
    }

    if (userId) {
      await recordAudit(tx, {
        userId,
        entity: "clients",
        entityId: created.id,
        action: "Create",
        after: created,
      })
    }

    return created
  })

  return getClientById(record.id) as Promise<ClientRecord>
}

/**
 * Update an existing client record in PostgreSQL.
 */
export async function updateClient(
  id: string,
  input: ClientInput,
  userId?: string
): Promise<ClientRecord> {
  const existing = await getClientById(id)
  if (!existing) {
    throw new Error("Klien tidak ditemukan di database.")
  }

  const cache = await getLookupsCache()
  const name = input.name.trim()

  // Guard against name conflicts with other clients
  if (name.toLowerCase() !== existing.name.toLowerCase()) {
    const duplicate = await prisma.client.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        id: { not: existing.dbId },
      },
      select: { id: true },
    })
    if (duplicate) {
      throw new Error(`Klien dengan nama "${name}" sudah terdaftar.`)
    }
  }

  const clientTypeId =
    resolveLookupId(cache, "client_type", input.clientType) ||
    resolveLookupId(cache, "client_type", "corporate")!

  const statusId =
    resolveLookupId(cache, "client_status", input.status || existing.status) ||
    resolveLookupId(cache, "client_status", "active")!

  const idTypeId = resolveLookupId(cache, "id_type", input.idType)
  const incomeSourceId = resolveLookupId(
    cache,
    "income_source",
    input.incomeSource
  )
  const insurancePurposeId = resolveLookupId(
    cache,
    "insurance_purpose",
    input.insurancePurpose
  )
  const cobId = resolveCobId(cache, input.cob)

  const corporate = input.clientType === "Korporasi"

  await prisma.$transaction(async (tx) => {
    const before = await tx.client.findUnique({
      where: { id: existing.dbId },
    })

    await tx.client.update({
      where: { id: existing.dbId },
      data: {
        clientTypeId,
        name,
        npwp: input.npwp?.trim() || null,
        idTypeId: corporate ? null : idTypeId,
        idNumber: corporate ? null : input.idNumber?.trim() || null,
        birthPlace: corporate ? null : input.birthPlace?.trim() || null,
        birthDate:
          !corporate && input.birthDate ? new Date(input.birthDate) : null,
        contactPerson: input.contactPerson?.trim() || (corporate ? null : name),
        contactPersonIdNumber: corporate
          ? input.contactPersonIdNumber?.trim() || null
          : null,
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        incomeSourceId: corporate ? null : incomeSourceId,
        insurancePurposeId,
        insurancePurposeNote: input.insurancePurposeNote?.trim() || null,
        kycDate: input.kycDate ? new Date(input.kycDate) : undefined,
        cobId,
        statusId,
        notes: input.notes?.trim() || null,
      },
    })

    // Synchronize addresses: remove old records and re-insert updated list
    if (input.addresses && input.addresses.length > 0) {
      await tx.clientAddress.deleteMany({
        where: { clientId: existing.dbId },
      })

      for (const [idx, addr] of input.addresses.entries()) {
        const addressTypeId =
          resolveLookupId(cache, "address_type", addr.label) ||
          resolveLookupId(cache, "address_type", "correspondence")!

        await tx.clientAddress.create({
          data: {
            clientId: existing.dbId,
            addressTypeId,
            address: addr.value.trim(),
            isPrimary: addr.isPrimary ?? idx === 0,
          },
        })
      }
    }

    // Berkas KYC disamakan dengan isi form: baris yang dihapus ikut dihapus
    // beserta isinya, file pengganti menggantikan isi lama, dan baris baru
    // wajib membawa file yang sudah diunggah. Baris baru dari form memakai id
    // sementara (bukan UUID), jadi baris lama dikenali dari daftar milik klien
    // ini, bukan dengan query per id.
    if (userId && input.documents) {
      const current = await tx.clientDocument.findMany({
        where: { clientId: existing.dbId },
        select: { id: true, documentTypeId: true, filePath: true },
      })
      const currentById = new Map(current.map((d) => [d.id, d]))
      const keptIds = new Set<string>()
      const unusedPaths: string[] = []

      for (const doc of input.documents) {
        if (!doc.fileName) continue
        const docTypeId =
          resolveLookupId(cache, "client_document_type", doc.type) ||
          resolveLookupId(cache, "client_document_type", "other")!
        const old = doc.id ? currentById.get(doc.id) : undefined
        const filePath = doc.fileId
          ? await claimClientDocumentFile(tx, doc.fileId, userId)
          : null

        if (!old) {
          if (!filePath) throw missingUpload(doc.fileName)
          await tx.clientDocument.create({
            data: {
              clientId: existing.dbId,
              documentTypeId: docTypeId,
              fileName: doc.fileName,
              filePath,
              uploadedBy: userId,
            },
          })
          continue
        }

        keptIds.add(old.id)
        if (filePath) {
          await tx.clientDocument.update({
            where: { id: old.id },
            data: {
              documentTypeId: docTypeId,
              fileName: doc.fileName,
              filePath,
              uploadedBy: userId,
              uploadedAt: new Date(),
            },
          })
          unusedPaths.push(old.filePath)
        } else if (old.documentTypeId !== docTypeId) {
          await tx.clientDocument.update({
            where: { id: old.id },
            data: { documentTypeId: docTypeId },
          })
        }
      }

      const removed = current.filter((d) => !keptIds.has(d.id))
      if (removed.length > 0) {
        await tx.clientDocument.deleteMany({
          where: { id: { in: removed.map((d) => d.id) } },
        })
        unusedPaths.push(...removed.map((d) => d.filePath))
      }
      await deleteStoredFiles(tx, unusedPaths)
    }

    if (userId) {
      const after = await tx.client.findUnique({
        where: { id: existing.dbId },
      })
      await recordAudit(tx, {
        userId,
        entity: "clients",
        entityId: existing.dbId,
        action: "Update",
        before,
        after,
      })
    }
  })

  return getClientById(existing.dbId) as Promise<ClientRecord>
}

/**
 * Toggle client operational status (Active, Inactive, Prospect).
 */
export async function toggleClientStatus(
  id: string,
  status: ClientStatus,
  userId?: string
): Promise<void> {
  const existing = await getClientById(id)
  if (!existing) {
    throw new Error("Klien tidak ditemukan di database.")
  }

  const cache = await getLookupsCache()
  const statusId = resolveLookupId(cache, "client_status", status)
  if (!statusId) {
    throw new Error(`Status tidak valid: ${status}`)
  }

  await prisma.client.update({
    where: { id: existing.dbId },
    data: { statusId },
  })

  if (userId) {
    await recordAudit({
      userId,
      entity: "clients",
      entityId: existing.dbId,
      action: "Update",
      before: { status: existing.status },
      after: { status },
    })
  }
}

/**
 * Delete client record along with addresses and KYC documents.
 * Rejects deletion if client is referenced in SPPA, placing slips, or policies.
 */
export async function deleteClient(id: string, userId?: string): Promise<void> {
  const existing = await getClientById(id)
  if (!existing) {
    throw new Error("Klien tidak ditemukan di database.")
  }

  // Guard against physical deletion of clients referenced in operational documents
  const counts = await prisma.client.findUnique({
    where: { id: existing.dbId },
    select: {
      _count: {
        select: {
          sppa: true,
          placingSlips: true,
          policies: true,
        },
      },
    },
  })

  const used =
    (counts?._count.sppa ?? 0) > 0 ||
    (counts?._count.placingSlips ?? 0) > 0 ||
    (counts?._count.policies ?? 0) > 0

  if (used) {
    throw new Error(
      "Klien sudah digunakan dalam SPPA, Placing Slip, atau Polis. Tidak dapat dihapus secara permanen. Silakan nonaktifkan status klien menjadi Inactive."
    )
  }

  const before = await prisma.client.findUnique({
    where: { id: existing.dbId },
  })

  await prisma.$transaction(async (tx) => {
    await tx.clientAddress.deleteMany({ where: { clientId: existing.dbId } })
    const documents = await tx.clientDocument.findMany({
      where: { clientId: existing.dbId },
      select: { filePath: true },
    })
    await tx.clientDocument.deleteMany({ where: { clientId: existing.dbId } })
    await deleteStoredFiles(tx, documents.map((d) => d.filePath))
    await tx.client.delete({ where: { id: existing.dbId } })

    if (userId) {
      await recordAudit(tx, {
        userId,
        entity: "clients",
        entityId: existing.dbId,
        action: "Delete",
        before,
      })
    }
  })
}
