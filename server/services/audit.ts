import type { AuditAction, Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"

/**
 * Audit trail (PRD A-03): setiap tambah, ubah, hapus, release, dan batal
 * tercatat siapa, kapan, dan data apa yang berubah.
 *
 * Panggil di transaksi yang sama dengan perubahan datanya. Error tidak
 * ditelan: kalau audit gagal tercatat, perubahan datanya ikut dibatalkan,
 * supaya tidak ada perubahan yang lolos tanpa jejak.
 *
 *   await prisma.$transaction(async (tx) => {
 *     const before = await tx.client.findUniqueOrThrow({ where: { id } })
 *     const after = await tx.client.update({ where: { id }, data })
 *     await recordAudit(tx, {
 *       userId, entity: "clients", entityId: id, action: "Update", before, after,
 *     })
 *   })
 */

type Snapshot = Record<string, unknown> | null | undefined

export interface AuditEntry {
  userId: string
  /** Nama tabel, misalnya "placing_slips" atau "clients". */
  entity: string
  entityId: string
  action: AuditAction
  before?: Snapshot
  after?: Snapshot
  /** Unchanged fields stored with the diff so the row names what changed, e.g. a document title. */
  context?: Record<string, unknown>
}

/**
 * Technical and sensitive credential fields that must NEVER be persisted in changes.
 */
const IGNORED_FIELDS = new Set([
  "updatedAt",
  "createdAt",
  "password",
  "passwordHash",
  "temporaryPassword",
  "token",
  "secret",
  "salt",
])

/** Ubah ke nilai JSON biasa: Decimal jadi string, Date jadi ISO. */
function toJson(value: unknown): Prisma.InputJsonValue | null {
  if (value === undefined || value === null) return null
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

/**
 * Hanya kolom yang berubah yang disimpan, dalam bentuk
 * { kolom: { before, after } }. Untuk create dan delete seluruh isi baris
 * disimpan di sisi yang ada.
 */
export function diffChanges(before: Snapshot, after: Snapshot) {
  const a = (toJson(before) ?? {}) as Record<string, unknown>
  const b = (toJson(after) ?? {}) as Record<string, unknown>
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  const changes: Record<string, { before: unknown; after: unknown }> = {}
  for (const key of keys) {
    if (IGNORED_FIELDS.has(key)) continue
    if (JSON.stringify(a[key]) === JSON.stringify(b[key])) continue
    changes[key] = { before: a[key] ?? null, after: b[key] ?? null }
  }
  return changes
}

export async function recordAudit(
  tx: Prisma.TransactionClient,
  entry: AuditEntry
): Promise<Prisma.AuditLogGetPayload<Record<string, never>>>
export async function recordAudit(
  entry: AuditEntry
): Promise<Prisma.AuditLogGetPayload<Record<string, never>>>
export async function recordAudit(
  first: Prisma.TransactionClient | AuditEntry,
  second?: AuditEntry
) {
  const isTx = second !== undefined
  const client = isTx ? (first as Prisma.TransactionClient) : prisma
  const entry = isTx ? second : (first as AuditEntry)

  const diff = diffChanges(entry.before, entry.after)
  const context = Object.fromEntries(
    Object.entries(entry.context ?? {}).map(([k, v]) => {
      const value = toJson(v)
      return [k, { before: value, after: value }]
    })
  )
  const changes = Object.keys(diff).length ? { ...context, ...diff } : diff
  return client.auditLog.create({
    data: {
      userId: entry.userId,
      entity: entry.entity,
      entityId: entry.entityId,
      action: entry.action,
      changes: Object.keys(changes).length
        ? (changes as Prisma.InputJsonValue)
        : undefined,
    },
  })
}
