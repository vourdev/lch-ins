"use client"

import * as React from "react"
import { Check, Copy, Layers } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StatusBadge } from "@/components/shared/status-badge"
import type { AuditLogRecord } from "@/lib/server/audit"

export interface AuditDiffDialogProps {
  log: AuditLogRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatValue(val: unknown): React.ReactNode {
  if (val === null || val === undefined) {
    return <span className="text-muted-foreground italic">— (kosong)</span>
  }
  if (typeof val === "boolean") {
    return (
      <span
        className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${
          val
            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {val ? "true" : "false"}
      </span>
    )
  }
  if (typeof val === "object") {
    if (Array.isArray(val)) {
      if (val.length === 0) return <span className="text-muted-foreground italic">[]</span>
      return (
        <span className="font-mono text-xs break-all">
          {JSON.stringify(val, null, 1)}
        </span>
      )
    }
    return (
      <pre className="font-mono text-xs whitespace-pre-wrap break-all max-h-32 overflow-y-auto rounded bg-muted/50 p-1.5">
        {JSON.stringify(val, null, 2)}
      </pre>
    )
  }
  return <span className="wrap-break-word font-mono text-xs">{String(val)}</span>
}

const ENTITY_LABELS: Record<string, string> = {
  clients: "Database Klien",
  sppa: "SPPA",
  users: "Manajemen Pengguna",
  master_clauses: "Master Klausul",
  placing_slips: "Placing Slip",
  policies: "Polis",
  claims: "Klaim",
}

export function AuditDiffDialog({
  log,
  open,
  onOpenChange,
}: AuditDiffDialogProps) {
  const [copied, setCopied] = React.useState(false)

  if (!log) return null

  const entityLabel = ENTITY_LABELS[log.entity.toLowerCase()] ?? log.entity
  const changes = log.changes ?? {}
  const changeKeys = Object.keys(changes)

  function copyJson() {
    if (!log) return
    navigator.clipboard.writeText(JSON.stringify(log, null, 2))
    setCopied(true)
    toast.success("Data audit log disalin ke clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <StatusBadge status={log.action} />
              <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                <Layers className="size-3" />
                {entityLabel}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(log.createdAt).toLocaleString("id-ID", {
                dateStyle: "medium",
                timeStyle: "medium",
              })}
            </span>
          </div>

          <DialogTitle className="mt-2 text-lg font-semibold">
            Detail Perubahan Log Audit
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Aksi dilakukan oleh{" "}
            <strong className="text-foreground">{log.userName}</strong> (
            {log.userEmail})
            {log.userJobTitle ? ` · ${log.userJobTitle}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="rounded-lg border bg-muted/20 p-3 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">ID Entitas Target:</span>
              <span className="font-mono font-medium">{log.entityId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">ID Audit:</span>
              <span className="font-mono text-muted-foreground">{log.id}</span>
            </div>
          </div>

          {changeKeys.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
              Tidak ada rincian atribut field yang tercatat pada log ini.
            </div>
          ) : (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Rincian Perubahan Field ({changeKeys.length})
              </h4>

              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/40 text-muted-foreground">
                      <th className="py-2.5 px-3 font-medium w-1/3">Field</th>
                      <th className="py-2.5 px-3 font-medium w-1/3">Sebelum</th>
                      <th className="py-2.5 px-3 font-medium w-1/3">Sesudah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {changeKeys.map((key) => {
                      const item = changes[key]
                      return (
                        <tr key={key} className="hover:bg-muted/15">
                          <td className="py-2.5 px-3 font-mono font-medium align-top text-foreground">
                            {key}
                          </td>
                          <td className="py-2.5 px-3 align-top bg-destructive/5 text-destructive-foreground/90">
                            {formatValue(item?.before)}
                          </td>
                          <td className="py-2.5 px-3 align-top bg-emerald-500/5 text-emerald-900 dark:text-emerald-100">
                            {formatValue(item?.after)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-muted/10 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copyJson}
            className="text-xs"
          >
            {copied ? (
              <Check className="size-3.5 mr-1.5 text-emerald-600" />
            ) : (
              <Copy className="size-3.5 mr-1.5 text-muted-foreground" />
            )}
            Salin JSON
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
