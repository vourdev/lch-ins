import { cn } from "@/lib/utils"

type Tone = "neutral" | "info" | "success" | "warning" | "danger"

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-primary/8 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/12 text-warning",
  danger: "bg-destructive/8 text-destructive",
}

const DOT_CLASS: Record<Tone, string> = {
  neutral: "bg-muted-foreground/50",
  info: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
}

const STATUS_TONE: Record<string, Tone> = {
  /* slip & SPPA */
  Draft: "neutral",
  Released: "info",
  Quoted: "warning",
  Closed: "success",
  Cancelled: "danger",
  Submitted: "info",
  /* policy */
  Active: "success",
  Expiring: "warning",
  Expired: "danger",
  /* client */
  Prospect: "info",
  Inactive: "neutral",
  /* policy type */
  Baru: "info",
  Renewal: "success",
  Endorsement: "warning",
  Cancellation: "danger",
  /* claim status */
  Outstanding: "warning",
  Settled: "success",
  Rejected: "danger",
  /* claim stage */
  "Tunggu Dokumen": "neutral",
  "Dokumen Belum Lengkap": "warning",
  "Dokumen Lengkap": "info",
  "Proses Adjuster": "info",
  "SPK / SPGR terbit": "info",
  /* audit action */
  Create: "success",
  Update: "info",
  Delete: "danger",
  Release: "info",
  Cancel: "warning",
}

/** Label tampilan untuk status yang disimpan dalam bahasa Inggris. */
const STATUS_LABEL: Record<string, string> = {
  Cancelled: "Dibatalkan",
  Create: "Tambah",
  Update: "Ubah",
  Delete: "Hapus",
  Release: "Rilis",
  Cancel: "Batal",
}

const BASE =
  "inline-flex h-5.5 w-fit shrink-0 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium whitespace-nowrap"

export function StatusBadge({
  status,
  className,
}: {
  status: string
  className?: string
}) {
  const tone = STATUS_TONE[status] ?? "neutral"
  return (
    <span className={cn(BASE, TONE_CLASS[tone], className)}>
      <span className={cn("size-1.5 shrink-0 rounded-full", DOT_CLASS[tone])} />
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

export function ToneBadge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone
  className?: string
  children: React.ReactNode
}) {
  return (
    <span className={cn(BASE, TONE_CLASS[tone], className)}>{children}</span>
  )
}
