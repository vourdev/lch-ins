import { CLASSES_OF_BUSINESS, type Policy } from "@/lib/data"
import { daysBetween } from "@/lib/date"

export const RENEWAL_PERIODS = ["30", "60", "90", "180"] as const
export const DEFAULT_RENEWAL_PERIOD = "90"
export const MAX_RENEWAL_DAYS = Number(RENEWAL_PERIODS.at(-1))

/** Nilai periode dari URL bisa apa saja; yang di luar daftar jatuh ke default. */
export function parseRenewalPeriod(value: string | undefined) {
  return RENEWAL_PERIODS.find((p) => p === value) ?? DEFAULT_RENEWAL_PERIOD
}

export function parseRenewalCob(value: string | undefined) {
  return CLASSES_OF_BUSINESS.find((c) => c === value) ?? "all"
}

/** Query filter yang dibawa bolak-balik antara layar Renewal Notice dan halaman cetak. */
export function renewalQuery(days: string, cob: string) {
  return new URLSearchParams({ days, cob }).toString()
}

/** Kembali ke tab Renewal Notice dengan filter yang sama seperti saat cetak. */
export function renewalBackHref(days: string, cob: string) {
  return `/marketing?tab=renewal&${renewalQuery(days, cob)}`
}

/**
 * Polis yang berakhir dalam `days` hari ke depan, urut dari yang paling dekat.
 * Dipakai layar Renewal Notice dan halaman cetaknya supaya isinya selalu sama.
 */
export function renewalCandidates(
  policies: Policy[],
  today: string,
  days: number,
  cob: string
) {
  return policies
    .filter((p) => {
      // Endorsement dan pembatalan ikut polis induknya, tidak di-renew sendiri.
      if (p.type === "Endorsement" || p.type === "Cancellation") return false
      if (cob !== "all" && p.cob !== cob) return false
      const d = daysBetween(today, p.expiryDate)
      return d >= 0 && d <= days
    })
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))
}
