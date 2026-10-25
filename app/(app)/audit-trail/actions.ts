"use server"

import { unstable_rethrow } from "next/navigation"

import type { AuditFilter } from "@/components/audit/audit-filter"
import { listAuditLogsForExport, type AuditLogRecord } from "@/lib/server/audit"
import { requireAdmin } from "@/lib/server/session"

type ActionResponse<T> = { ok: true; data: T } | { ok: false; error: string }

export async function exportAuditLogsAction(
  filter: Omit<AuditFilter, "page" | "pageSize">
): Promise<ActionResponse<AuditLogRecord[]>> {
  try {
    await requireAdmin("/audit-trail")
    const rows = await listAuditLogsForExport(filter)
    return { ok: true, data: rows }
  } catch (err) {
    unstable_rethrow(err)
    const message = err instanceof Error ? err.message : "Gagal menyiapkan export audit trail"
    return { ok: false, error: message }
  }
}
