import { ACTION_LABELS } from "@/components/audit/audit-fields"
import type { AuditAction } from "@/lib/generated/prisma/client"

export interface AuditFilter {
  search: string
  action?: AuditAction
  entity: string
  userId: string
  startDate: string
  endDate: string
  page: number
  pageSize: number
}

export const AUDIT_PAGE_SIZES = [15, 25, 50, 100]

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ""

/** URL keys: q, action, entity, user, from, to, page, size. Invalid values fall back to no filter. */
export function parseAuditFilter(
  sp: Record<string, string | string[] | undefined>
): AuditFilter {
  const action = one(sp.action)
  const size = Number(one(sp.size))
  const from = one(sp.from)
  const to = one(sp.to)
  return {
    search: one(sp.q),
    action: action in ACTION_LABELS ? (action as AuditAction) : undefined,
    entity: one(sp.entity),
    userId: one(sp.user),
    startDate: DATE_PATTERN.test(from) ? from : "",
    endDate: DATE_PATTERN.test(to) ? to : "",
    page: Number(one(sp.page)) || 1,
    pageSize: AUDIT_PAGE_SIZES.includes(size) ? size : AUDIT_PAGE_SIZES[0],
  }
}
