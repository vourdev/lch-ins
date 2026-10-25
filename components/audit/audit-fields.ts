import { ROLE_LABELS, type RoleCode } from "@/lib/access"
import { dateShort, num } from "@/lib/format"
import type { AuditLogRecord } from "@/lib/server/audit"

export const ENTITY_LABELS: Record<string, string> = {
  clients: "Database Klien",
  sppa: "SPPA",
  users: "Manajemen Pengguna",
  master_clauses: "Master Klausul",
  placing_slips: "Placing Slip",
  policies: "Polis",
  claims: "Klaim",
  adjusters: "Adjuster",
  bank_accounts: "Rekening Bank",
  classes_of_business: "Class of Business",
  cob_ojk_classes: "Klasifikasi OJK",
  cover_types: "Type of Cover",
  insurers: "Asuransi",
  lookup_values: "Nilai Pilihan",
  wording_forms: "Wording",
  vehicle_brands: "Merek Kendaraan",
  vehicle_types: "Tipe Kendaraan",
}

export const ACTION_LABELS: Record<string, string> = {
  Create: "Tambah",
  Update: "Ubah",
  Delete: "Hapus",
  Release: "Rilis",
  Cancel: "Batal",
}

const FIELD_LABELS: Record<string, string> = {
  name: "Nama",
  code: "Kode",
  email: "Email",
  jobTitle: "Jabatan",
  roles: "Peran",
  roleId: "Peran",
  isActive: "Aktif",
  mustChangePassword: "Wajib ganti sandi",
  description: "Keterangan",
  notes: "Catatan",
  remarks: "Catatan",
  address: "Alamat",
  phone: "Telepon",
  status: "Status",
  statusId: "Status",
  stageId: "Tahap",
  type: "Jenis",
  kindId: "Jenis",
  client: "Klien",
  clientId: "Klien",
  clientTypeId: "Jenis klien",
  idTypeId: "Jenis identitas",
  idNumber: "Nomor identitas",
  npwp: "NPWP",
  incomeSourceId: "Sumber penghasilan",
  insurancePurposeId: "Tujuan asuransi",
  addressTypeId: "Jenis alamat",
  positionId: "Jabatan",
  insuredName: "Nama tertanggung",
  groupingInsured: "Grup tertanggung",
  riskLocation: "Lokasi risiko",
  cob: "Class of Business",
  cobId: "Class of Business",
  coverType: "Type of Cover",
  coverTypeId: "Type of Cover",
  occupation: "Okupasi",
  occupationId: "Okupasi",
  constructionClassId: "Kelas konstruksi",
  currencyCode: "Mata uang",
  sumInsured: "Nilai pertanggungan",
  premium: "Premi",
  rate: "Rate",
  rateModeId: "Mode rate",
  brokeragePct: "Brokerage (%)",
  adminCost: "Biaya admin",
  stampDuty: "Bea meterai",
  periodStart: "Periode mulai",
  periodEnd: "Periode akhir",
  inceptionDate: "Tanggal mulai",
  expiryDate: "Tanggal berakhir",
  answers: "Isian SPPA",
  sppaId: "SPPA",
  slipNo: "Nomor slip",
  placingSlipId: "Placing slip",
  slipId: "Placing slip",
  placingSlips: "Placing slip",
  policyNo: "Nomor polis",
  policyId: "Polis",
  policyTypeId: "Jenis polis",
  parentPolicyId: "Polis induk",
  endorsementSeq: "Endorsemen ke",
  insurer: "Asuransi",
  insurerId: "Asuransi",
  cobOjkClassId: "Klasifikasi OJK",
  placementLocationId: "Lokasi penempatan",
  wordingFormId: "Wording",
  vehicleBrandId: "Merek kendaraan",
  brandId: "Merek kendaraan",
  vehicleTypeId: "Tipe kendaraan",
  sortOrder: "Urutan",
  formVariantId: "Varian formulir",
  resetPeriodId: "Periode reset",
  claimNo: "Nomor klaim",
  claimId: "Klaim",
  estimatedLoss: "Estimasi kerugian",
  claimedAmount: "Nilai klaim",
  paidAmount: "Nilai dibayar",
  document: "Dokumen klaim",
  documentReceived: "Dokumen diterima",
  documentReceivedDate: "Tanggal dokumen diterima",
  documentNotes: "Catatan dokumen",
  documentFile: "Berkas dokumen",
  followupDate: "Tanggal follow-up",
  followupNote: "Catatan follow-up",
  lossDate: "Tanggal kejadian",
  reportDate: "Tanggal laporan",
  adjusterId: "Adjuster",
  bankId: "Bank",
  bankAccountId: "Rekening bank",
  accountNo: "Nomor rekening",
  accountName: "Nama rekening",
  createdBy: "Dibuat oleh",
  createdById: "Dibuat oleh",
  releasedBy: "Dirilis oleh",
  issuedBy: "Diterbitkan oleh",
  uploadedBy: "Diunggah oleh",
  userId: "Pengguna",
}

const MONEY_FIELDS = new Set([
  "sumInsured",
  "premium",
  "adminCost",
  "stampDuty",
  "estimatedLoss",
  "claimedAmount",
  "paidAmount",
])

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/

export function entityLabel(entity: string) {
  return ENTITY_LABELS[entity.toLowerCase()] ?? entity
}

export function actionLabel(action: string) {
  return ACTION_LABELS[action] ?? action
}

/** Unmapped keys fall back to their words, e.g. "riskLocation" -> "Risk location". */
export function fieldLabel(key: string) {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key]
  const words = key
    .replace(/^_+/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function isBlank(value: unknown) {
  if (value === null || value === undefined || value === "") return true
  if (Array.isArray(value)) return value.length === 0
  return false
}

/**
 * Fields a reader can act on. Drops internal keys, relation snapshots that
 * duplicate a foreign key already shown by name, and fields empty on both sides.
 */
export function visibleChangeKeys(log: AuditLogRecord) {
  const changes = log.changes ?? {}
  return Object.keys(changes).filter(
    (key) =>
      key !== "id" &&
      !key.startsWith("_") &&
      !(`${key}Id` in changes) &&
      !(isBlank(changes[key]?.before) && isBlank(changes[key]?.after))
  )
}

export function changeSummary(log: AuditLogRecord) {
  if (log.action === "Create") return "Data baru dibuat"
  if (log.action === "Delete") return "Data dihapus"
  const labels = visibleChangeKeys(log).map(fieldLabel)
  if (labels.length === 0) return "Tidak ada rincian perubahan"
  if (labels.length <= 3) return labels.join(", ")
  return `${labels.slice(0, 3).join(", ")} +${labels.length - 3} lainnya`
}

export function formatAuditValue(
  key: string,
  value: unknown,
  refNames: Record<string, string>
): string {
  if (value === null || value === undefined || value === "") return "—"
  if (typeof value === "boolean") return value ? "Ya" : "Tidak"
  if (typeof value === "number") return num(value, Number.isInteger(value) ? 0 : 2)

  if (Array.isArray(value)) {
    if (value.length === 0) return "—"
    if (key === "roles") {
      return value.map((r) => ROLE_LABELS[r as RoleCode] ?? String(r)).join(", ")
    }
    if (value.every((v) => typeof v !== "object" || v === null)) {
      return value.map((v) => formatAuditValue(key, v, refNames)).join(", ")
    }
    return `${value.length} data`
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>
    if (typeof record.name === "string") return record.name
    return Object.entries(record)
      .filter(([k]) => k !== "id")
      .map(([k, v]) => `${fieldLabel(k)}: ${formatAuditValue(k, v, refNames)}`)
      .join("\n")
  }

  const text = String(value)
  // A deleted reference has no name left to show.
  if (UUID_PATTERN.test(text)) return refNames[text] ?? "Data tidak ditemukan"
  if (DATE_PATTERN.test(text)) return dateShort(text)
  if (DATETIME_PATTERN.test(text)) return dateShort(new Date(text))
  if (MONEY_FIELDS.has(key) && text.trim() !== "" && !Number.isNaN(Number(text))) {
    return num(Number(text))
  }
  return text
}
