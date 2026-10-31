import type { ClassOfBusiness } from "@/lib/data/types"

export const CURRENCY_SYMBOL: Record<string, string> = {
  IDR: "IDR",
  USD: "USD",
  SGD: "SGD",
  EUR: "EUR",
}

/** 13440000 -> "13.440.000" */
export function num(value: number, fractionDigits = 0) {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value ?? 0)
}

/**
 * 13440000 -> "IDR 13.440.000" · 185185.18 -> "IDR 185.185,18" · USD always 2 decimals.
 * Whole rupiah amounts omit cents for compact table displays.
 */
export function money(value: number, currency = "IDR") {
  const cents = Math.round(Math.abs(value ?? 0) * 100) % 100 !== 0
  const digits = currency !== "IDR" || cents ? 2 : 0
  return `${CURRENCY_SYMBOL[currency] ?? currency} ${num(value, digits)}`
}

/** 13440000 -> "Rp 13.440.000" */
export function rupiah(value: number) {
  return `Rp ${num(value)}`
}

/** 13440000 -> "13,4 jt" · 1340000000 -> "1,34 M" */
export function compactMoney(value: number) {
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${num(value / 1_000_000_000, 2)} M`
  if (abs >= 1_000_000) return `${num(value / 1_000_000, 1)} jt`
  if (abs >= 1_000) return `${num(value / 1_000, 0)} rb`
  return num(value)
}

export function rate(value: number, digits = 6) {
  return num(value, digits)
}

export function percent(value: number, digits = 2) {
  return `${num(value, digits)}%`
}

const MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
]

const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
]

/** Cocok untuk "2026-08-11", bukan untuk nilai yang sudah ada jamnya. */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

function parse(input: string | Date) {
  if (typeof input !== "string") return input
  // Tanggal saja ditambah T00:00:00 supaya dibaca sebagai tengah malam waktu
  // lokal. Tanpa itu string polos dibaca sebagai UTC dan tanggalnya bisa mundur
  // sehari. Nilai yang sudah lengkap dengan jam — updatedAt dari database
  // dikirim sebagai ISO penuh — harus dipakai apa adanya; menempelkan
  // T00:00:00 ke belakangnya justru bikin Invalid Date.
  return new Date(DATE_ONLY.test(input) ? `${input}T00:00:00` : input)
}

/** Standard application date format: "10 Agu 2026" */
export function dateShort(input?: string | Date | null) {
  if (!input) return "—"
  const d = parse(input)
  if (Number.isNaN(d.getTime())) return "—"
  return `${d.getDate().toString().padStart(2, "0")} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

/** "10 Agustus 2026" */
export function dateLong(input?: string | Date | null) {
  if (!input) return "—"
  const d = parse(input)
  if (Number.isNaN(d.getTime())) return "—"
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`
}

/** English document format: "11 August 2026" */
export function dateEn(input?: string | Date | null) {
  if (!input) return "—"
  const d = parse(input)
  if (Number.isNaN(d.getTime())) return "—"
  return `${d.getDate().toString().padStart(2, "0")} ${MONTHS_EN[d.getMonth()]} ${d.getFullYear()}`
}

/** For input type="date" */
export function dateInput(input?: string | Date | null) {
  if (!input) return ""
  const d = parse(input)
  if (Number.isNaN(d.getTime())) return ""
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function monthLabel(monthIndex: number, year: number) {
  return `${MONTHS_ID[monthIndex]} ${year}`
}

export const MONTH_NAMES_ID = MONTHS_ID
export const MONTH_NAMES_SHORT = MONTHS_SHORT

const ROMAN = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
]
export function romanMonth(monthIndex: number) {
  return ROMAN[monthIndex]
}

/** 001/LCH-PLCMT/PS-PAREQ/VIII/2026 */
export function slipNumber(
  seq: number,
  coverCode: string | null,
  date: Date,
  kind: "PS" | "CI" | "CN" = "PS"
) {
  const code = coverCode ? `${kind}-${coverCode}` : kind
  return `${String(seq).padStart(3, "0")}/LCH-PLCMT/${code}/${romanMonth(date.getMonth())}/${date.getFullYear()}`
}

/**
 * Mask PII in table rows (NPWP, phone, ID numbers). Leading and trailing
 * characters remain visible for client verification; full values are restricted
 * to authorized detail views.
 */
export function maskMiddle(
  value: string | null | undefined,
  keepStart = 4,
  keepEnd = 3
) {
  if (!value) return "—"
  const chars = [...value]
  const digitIdx = chars
    .map((c, i) => (/[0-9A-Za-z]/.test(c) ? i : -1))
    .filter((i) => i >= 0)
  if (digitIdx.length <= keepStart + keepEnd) return value
  const hide = new Set(digitIdx.slice(keepStart, digitIdx.length - keepEnd))
  return chars.map((c, i) => (hide.has(i) ? "•" : c)).join("")
}

/** "andi.wijaya@grahasentosa.co.id" -> "an•••@grahasentosa.co.id" */
export function maskEmail(value: string | null | undefined) {
  if (!value) return "—"
  const [user, domain] = value.split("@")
  if (!domain) return maskMiddle(value)
  return `${user.slice(0, 2)}•••@${domain}`
}

/**
 * Label lama di data contoh yang namanya berbeda di master data. Master SE OJK
 * memakai GENERAL ACCIDENT untuk lini yang dulu ditulis Personal Accident.
 */
const COB_ALIASES: Record<string, ClassOfBusiness> = {
  "personal accident": "General Accident",
}

/**
 * Nama COB untuk tampilan. Master data menulis nama dengan huruf besar semua
 * ("MARINE CARGO"), aplikasi menampilkannya "Marine Cargo". Nama yang sudah
 * ditulis campuran huruf besar-kecil dipakai apa adanya.
 *
 * Dulu COB di luar delapan nama bawaan jatuh ke "Property". Sekarang COB baru
 * dari master tetap tampil dengan namanya sendiri, supaya tidak tersimpan
 * sebagai Property tanpa disadari.
 */
export function normalizeCob(cobStr?: string | null): ClassOfBusiness {
  if (!cobStr) return "Property"
  const name = cobStr.trim()
  const alias = COB_ALIASES[name.toLowerCase()]
  if (alias) return alias
  if (name !== name.toUpperCase()) return name
  return name
    .toLowerCase()
    .replace(/(^|[^a-z])([a-z])/g, (_, before: string, letter: string) =>
      before + letter.toUpperCase()
    )
}
