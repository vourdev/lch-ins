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
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q)

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

  const items: AuditLogRecord[] = rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    userName: r.user.name,
    userEmail: r.user.email,
    userJobTitle: r.user.jobTitle,
    entity: r.entity,
    entityId: r.entityId,
    action: r.action,
    changes: (r.changes as Record<string, { before: unknown; after: unknown }>) || null,
    createdAt: r.createdAt.toISOString(),
  }))

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

  return {
    id: r.id,
    userId: r.userId,
    userName: r.user.name,
    userEmail: r.user.email,
    userJobTitle: r.user.jobTitle,
    entity: r.entity,
    entityId: r.entityId,
    action: r.action,
    changes: (r.changes as Record<string, { before: unknown; after: unknown }>) || null,
    createdAt: r.createdAt.toISOString(),
  }
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
