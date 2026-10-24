"use client"

import { Layers } from "lucide-react"

import {
  entityLabel,
  fieldLabel,
  formatAuditValue,
  visibleChangeKeys,
} from "@/components/audit/audit-fields"
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

export function AuditDiffDialog({
  log,
  open,
  onOpenChange,
}: AuditDiffDialogProps) {
  if (!log) return null

  const changes = log.changes ?? {}
  const changeKeys = visibleChangeKeys(log)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <StatusBadge status={log.action} />
              <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                <Layers className="size-3" />
                {entityLabel(log.entity)}
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
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3 text-xs">
            <span className="text-muted-foreground">Data:</span>
            <span className="text-right font-medium">
              {log.entityLabel ?? "—"}
            </span>
          </div>

          {changeKeys.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
              Tidak ada rincian perubahan yang tercatat pada log ini.
            </div>
          ) : (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Rincian Perubahan ({changeKeys.length})
              </h4>

              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/40 text-muted-foreground">
                      <th className="py-2.5 px-3 font-medium w-1/3">Isian</th>
                      <th className="py-2.5 px-3 font-medium w-1/3">Sebelum</th>
                      <th className="py-2.5 px-3 font-medium w-1/3">Sesudah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {changeKeys.map((key) => {
                      const item = changes[key]
                      return (
                        <tr key={key} className="hover:bg-muted/15">
                          <td className="py-2.5 px-3 font-medium align-top text-foreground">
                            {fieldLabel(key)}
                          </td>
                          <td className="py-2.5 px-3 align-top whitespace-pre-line wrap-break-word bg-destructive/5 text-destructive-foreground/90">
                            {formatAuditValue(key, item?.before, log.refNames)}
                          </td>
                          <td className="py-2.5 px-3 align-top whitespace-pre-line wrap-break-word bg-emerald-500/5 text-emerald-900 dark:text-emerald-100">
                            {formatAuditValue(key, item?.after, log.refNames)}
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

        <div className="p-4 border-t bg-muted/10 flex items-center justify-end">
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
