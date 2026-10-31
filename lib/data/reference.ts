import type {
  ClaimStage,
  ClaimStatus,
  ClassOfBusiness,
  ClientStatus,
  ClientType,
  PolicyType,
  SlipStatus,
} from "./types"

/*
 * Daftar yang tersisa di sini dipakai logika aplikasi (status, tipe klien,
 * tipe polis, kelas konstruksi). Pilihan dropdown lain (COB, type of cover,
 * asuransi, mata uang, wording, dan lookup form klien) dibaca dari master data
 * lewat lib/server/form-options.ts.
 */

export const CLIENT_TYPES: ClientType[] = ["Korporasi", "Perorangan"]
export const CLIENT_STATUSES: ClientStatus[] = [
  "Prospect",
  "Active",
  "Inactive",
]
export const SLIP_STATUSES: SlipStatus[] = [
  "Draft",
  "Released",
  "Quoted",
  "Closed",
  "Cancelled",
]
export const POLICY_TYPES: PolicyType[] = [
  "Baru",
  "Renewal",
  "Endorsement",
  "Cancellation",
]
/** Tipe polis yang wajib menunjuk polis induk. */
export const POLICY_TYPES_WITH_PARENT: PolicyType[] = [
  "Renewal",
  "Endorsement",
  "Cancellation",
]
export const CLAIM_STATUSES: ClaimStatus[] = [
  "Outstanding",
  "Settled",
  "Closed",
  "Rejected",
]
/** Tahapan dokumen klaim, dipilih terpisah dari status. */
export const CLAIM_STAGES: ClaimStage[] = [
  "Tunggu Dokumen",
  "Dokumen Belum Lengkap",
  "Dokumen Lengkap",
  "Proses Adjuster",
  "SPK / SPGR terbit",
]
/** Klaim yang masih berjalan, dipakai untuk outstanding di dashboard. */
export const OPEN_CLAIM_STATUSES: ClaimStatus[] = ["Outstanding"]

/** Kelas konstruksi harta benda (lookup construction_class). */
export const CONSTRUCTION_CLASSES = [
  {
    code: "K1",
    label: "Kelas 1",
    description: "Seluruhnya bahan tidak mudah terbakar",
  },
  {
    code: "K2",
    label: "Kelas 2",
    description: "Bahan mudah terbakar paling banyak 20%",
  },
  { code: "K3", label: "Kelas 3", description: "Selain kelas 1 dan 2" },
] as const
export type ConstructionClassCode =
  (typeof CONSTRUCTION_CLASSES)[number]["code"]

/** Label kelas konstruksi yang tampil di slip dan dokumen cetak. */
export function constructionClassLabel(code: string | undefined | null) {
  const hit = CONSTRUCTION_CLASSES.find((c) => c.code === code)
  return hit ? `${hit.label} (${hit.code})` : (code ?? "")
}

/**
 * Type of cover lama per COB beserta kodenya. Tidak lagi dipakai sebagai
 * pilihan form (pilihan dari master data); hanya cadangan kode {COVER} untuk
 * slip lama yang labelnya belum ada di master, misalnya "PAR + EQVET".
 */
export const TYPE_OF_COVER: Record<
  ClassOfBusiness,
  { label: string; code: string | null }[]
> = {
  Property: [
    { label: "Property All Risks (PAR)", code: "PAR" },
    { label: "PAR + EQVET", code: "PAREQ" },
    { label: "Industrial All Risks (IAR)", code: "IAR" },
    { label: "Fire (FLEXAS)", code: "FIRE" },
    { label: "Business Interruption", code: "BI" },
  ],
  "Motor Vehicle": [
    { label: "Comprehensive Casco + Perluasan", code: null },
    { label: "Comprehensive Casco", code: null },
    { label: "Total Loss Only (TLO)", code: "TLO" },
  ],
  "Marine Cargo": [
    { label: "Marine Cargo — Institute Cargo Clauses (A)", code: "MC" },
    { label: "Marine Cargo — Institute Cargo Clauses (C)", code: "MC" },
    { label: "Marine Hull", code: "MH" },
  ],
  Engineering: [
    { label: "Contractor's All Risks (CAR)", code: "CAR" },
    { label: "Erection All Risks (EAR)", code: "EAR" },
    { label: "Machinery Breakdown (MB)", code: "MB" },
    { label: "Electronic Equipment Insurance (EEI)", code: "EEI" },
  ],
  Liability: [
    { label: "Public Liability", code: "PL" },
    { label: "Product Liability", code: "PRL" },
    { label: "Professional Indemnity", code: "PI" },
    { label: "Directors & Officers Liability", code: "DNO" },
  ],
  "Personal Accident": [
    { label: "Personal Accident — Group", code: "PA" },
    { label: "Personal Accident — Individual", code: "PA" },
  ],
  "Surety Bond": [
    { label: "Performance Bond", code: "SB" },
    { label: "Advance Payment Bond", code: "SB" },
  ],
  Terrorism: [{ label: "Terrorism & Sabotage", code: "TS" }],
}

/** Okupasi OJK (SE OJK No. 6/SEOJK.05/2017) — subset yang dipakai. */
export const OCCUPATIONS = [
  {
    code: "2976",
    label: "Shopping Mall / Pusat Perbelanjaan Grade A",
    k1: 0.216,
    k2: 0.288,
    k3: 0.36,
  },
  {
    code: "2911",
    label: "Apartemen / Kantor / Parkir (≤6 lantai)",
    k1: 0.108,
    k2: 0.144,
    k3: 0.18,
  },
  {
    code: "2912",
    label: "Apartemen / Kantor / Parkir (>6 lantai)",
    k1: 0.135,
    k2: 0.18,
    k3: 0.225,
  },
  {
    code: "1311",
    label: "Pabrik Tekstil — pemintalan",
    k1: 0.685,
    k2: 0.913,
    k3: 1.141,
  },
  {
    code: "1512",
    label: "Pabrik Makanan & Minuman",
    k1: 0.402,
    k2: 0.536,
    k3: 0.67,
  },
  {
    code: "2101",
    label: "Pabrik Kertas & Bubur Kertas",
    k1: 0.848,
    k2: 1.13,
    k3: 1.413,
  },
  {
    code: "5210",
    label: "Gudang / Pergudangan Umum",
    k1: 0.324,
    k2: 0.432,
    k3: 0.54,
  },
  { code: "5511", label: "Hotel Berbintang", k1: 0.243, k2: 0.324, k3: 0.405 },
  { code: "8511", label: "Rumah Sakit", k1: 0.189, k2: 0.252, k3: 0.315 },
  {
    code: "9241",
    label: "Gedung Olahraga / Stadion",
    k1: 0.27,
    k2: 0.36,
    k3: 0.45,
  },
]

/** Tarif gempa bumi (EQVET) per mil, per zona. */
export const EQVET_TARIFF = [
  {
    construction: "Com: Steel / Wood / RC ≤ 9 lantai",
    z1: 0.75,
    z2: 0.76,
    z3: 1.0,
    z4: 1.43,
    z5: 1.9,
  },
  {
    construction: "Com: Steel / Wood / RC > 9 lantai",
    z1: 1.12,
    z2: 1.15,
    z3: 1.22,
    z4: 1.53,
    z5: 2.0,
  },
  {
    construction: "Com: Others (non-RC)",
    z1: 0.8,
    z2: 1.04,
    z3: 1.55,
    z4: 2.46,
    z5: 4.7,
  },
  {
    construction: "DW: Steel / Wood / RC",
    z1: 0.76,
    z2: 0.79,
    z3: 1.04,
    z4: 1.35,
    z5: 1.6,
  },
  {
    construction: "DW: Others (non-RC)",
    z1: 0.8,
    z2: 1.0,
    z3: 1.55,
    z4: 2.24,
    z5: 4.5,
  },
]

export const EQVET_ZONES = ["Zona 1", "Zona 2", "Zona 3", "Zona 4", "Zona 5"]

/** Tarif jaminan banjir per mil. */
export const FLOOD_TARIFF = [
  {
    region: "Jakarta, Banten, Jawa Barat",
    z1: "0,05 – 0,055",
    z2: "Tarif Zona 1 + Loading UW",
    z3: "Tarif Zona 1 + Loading UW",
    z4: "Tarif Zona 1 + Loading UW",
  },
  {
    region: "Luar Jakarta, Banten, Jawa Barat",
    z1: "0,045 – 0,05",
    z2: "0,05 – 0,055",
    z3: "Tarif Zona 2 + Loading UW",
    z4: "Tarif Zona 2 + Loading UW",
  },
]

/** Skala business interruption terhadap indemnity period. */
export const BI_SCALE = [
  { months: 1, pct: 20 },
  { months: 2, pct: 30 },
  { months: 3, pct: 40 },
  { months: 4, pct: 50 },
  { months: 6, pct: 60 },
  { months: 9, pct: 80 },
  { months: 12, pct: 100 },
  { months: 15, pct: 96 },
  { months: 18, pct: 93 },
  { months: 21, pct: 91.5 },
  { months: 24, pct: 90 },
  { months: 30, pct: 87 },
  { months: 36, pct: 85 },
  { months: 48, pct: 83 },
]

/** Baris rate default untuk COB Property. */
export const PROPERTY_RATE_LINES = [
  "FLEXAS",
  "FWTWD",
  "RSMDCC",
  "Other Losses",
  "BI PAR (FLEXAS + FWTWD + RSMDCC + Others)",
  "EQVET",
  "BI EQVET",
]

/** Baris rate default untuk COB Motor Vehicle. */
export const MOTOR_RATE_LINES = [
  "Comprehensive Casco",
  "Loading Rate Comprehensive",
  "Flood, Windstorm, Tempest & Water Damage",
  "Earthquake, Volcanic Eruption & Tsunami",
  "Strike, Riot, Civil Commotion",
  "Terrorism & Sabotage",
  "Authorized Workshop",
  "Theft by Driver",
]
