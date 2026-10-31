/**
 * Seed master data LCH.
 *
 * Idempotent: aman dijalankan berulang kali, semuanya pakai upsert dengan
 * kunci alami (kode), bukan id acak.
 *
 * Sumbernya ada di prisma/seed-data:
 * - cob-toc.csv            daftar COB dan type of cover milik LCH (sheet FIX)
 * - tarif-ojk-*.csv        lima tabel tarif SE OJK No. 6/SEOJK.05/2017
 * - zona-gempa-ojk.csv     511 kabupaten dan kota beserta zona gempanya
 * - skala-bi-ojk.csv       persentase tarif menurut indemnity period
 * - clause-wording-lch.csv 607 klausul dari pustaka wording LCH
 * - kendaraan.csv          10 merek mobil terlaris 2026 (Gaikindo) dan model populernya
 *
 * Jalankan: npm run db:seed
 */

import { randomBytes } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { hashPassword } from "better-auth/crypto"

import type { RoleCode } from "../lib/access"
import { CLIENTS } from "../lib/data/clients"
import { SPPA } from "../lib/data/sppa"
import { Prisma } from "../lib/generated/prisma/client"
import { prisma } from "../lib/prisma"

const SEED_DIR = join(import.meta.dirname, "seed-data")

// ---------------------------------------------------------------------------
// Pembaca CSV
// ---------------------------------------------------------------------------

/**
 * Parser CSV kecil yang paham kutip ganda dan baris baru di dalam sel.
 * Wording klausula berisi baris baru, jadi split("\n") saja tidak cukup.
 */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false

  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          quoted = false
        }
      } else {
        cell += ch
      }
      continue
    }
    if (ch === '"') quoted = true
    else if (ch === ",") {
      row.push(cell)
      cell = ""
    } else if (ch === "\n") {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ""
    } else cell += ch
  }
  if (cell !== "" || row.length) {
    row.push(cell)
    rows.push(row)
  }

  const header = rows.shift()
  if (!header) return []
  return rows
    .filter((r) => r.some((c) => c.trim() !== ""))
    .map((r) =>
      Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? "").trim()]))
    )
}

const readCsv = (file: string) =>
  parseCsv(readFileSync(join(SEED_DIR, file), "utf8"))

/** Kolom angka yang boleh kosong. Kosong berarti belum ditentukan OJK. */
const dec = (v: string): Prisma.Decimal | null => {
  const s = (v ?? "").trim()
  return s === "" ? null : new Prisma.Decimal(s)
}

// ---------------------------------------------------------------------------
// Daftar pilihan pendek
// ---------------------------------------------------------------------------

/**
 * Isi awal lookup_values. Baris is_system dipakai logika sistem: labelnya boleh
 * diubah LCH, kodenya tidak, dan barisnya tidak boleh dihapus.
 */
const LOOKUPS: {
  type: string
  system: boolean
  values: [code: string, name: string][]
}[] = [
  {
    type: "role",
    system: true,
    values: [
      ["admin", "Admin"],
      ["marketing", "Marketing"],
      ["placement", "Teknik"],
      ["claim", "Klaim"],
      ["accounting", "Accounting"],
      ["finance", "Finance"],
      ["direksi", "Direksi"],
    ],
  },
  {
    type: "reset_period",
    system: true,
    values: [
      ["monthly", "Bulanan"],
      ["yearly", "Tahunan"],
      ["continuous", "Berlanjut"],
    ],
  },
  {
    type: "rate_mode",
    system: true,
    values: [
      ["permil", "Per mil"],
      ["percent", "Persen"],
    ],
  },
  {
    type: "form_variant",
    system: true,
    values: [
      ["property", "Property"],
      ["motor", "Motor"],
      ["standard", "Standard"],
    ],
  },
  {
    type: "rate_line_kind",
    system: true,
    values: [
      ["rate", "Rate"],
      ["tpl", "TPL"],
      ["pa", "PA"],
    ],
  },
  {
    type: "construction_class",
    system: true,
    values: [
      ["K1", "Class I"],
      ["K2", "Class II"],
      ["K3", "Class III"],
    ],
  },
  {
    type: "client_status",
    system: false,
    values: [
      ["prospect", "Prospect"],
      ["active", "Active"],
      ["inactive", "Inactive"],
    ],
  },
  {
    type: "client_type",
    system: true,
    values: [
      ["individual", "Perorangan"],
      ["corporate", "Korporasi"],
    ],
  },
  {
    type: "id_type",
    system: false,
    values: [
      ["ktp", "KTP"],
      ["sim", "SIM"],
      ["passport", "Paspor"],
    ],
  },
  {
    type: "income_source",
    system: false,
    values: [
      ["business", "Hasil usaha"],
      ["salary", "Gaji bulanan"],
      ["entrepreneur", "Wirausaha"],
      ["other", "Lain-lain"],
    ],
  },
  {
    type: "insurance_purpose",
    system: false,
    values: [
      ["asset", "Perlindungan aset"],
      ["credit", "Persyaratan pemberi kredit"],
      ["other", "Lain-lain"],
    ],
  },
  {
    type: "address_type",
    system: false,
    values: [
      ["company", "Alamat perusahaan"],
      ["correspondence", "Alamat korespondensi"],
      ["billing", "Alamat penagihan"],
    ],
  },
  {
    type: "client_document_type",
    system: false,
    values: [
      ["id_copy", "Copy KTP, SIM, atau paspor"],
      ["npwp_copy", "Copy NPWP"],
      ["kyc_form", "Form KYC"],
      ["other", "Lain-lain"],
    ],
  },
  {
    type: "security_role",
    system: true,
    values: [
      ["leader", "As Leader"],
      ["member", "As Member"],
    ],
  },
  {
    type: "policy_type",
    system: true,
    values: [
      ["new", "Baru"],
      ["renewal", "Renewal"],
      ["endorsement", "Endorsement"],
      ["cancellation", "Cancellation"],
    ],
  },
  {
    type: "placement_location",
    system: false,
    values: [
      ["domestic", "Dalam Negeri"],
      ["overseas", "Luar Negeri"],
    ],
  },
  {
    // Status siklus hidup klaim, sesuai koreksi Harry 5 Okt 2026. Tahapan
    // dokumennya dipisah ke lookup claim_stage di bawah.
    type: "claim_status",
    system: true,
    values: [
      ["outstanding", "Outstanding"],
      ["settled", "Settled"],
      ["closed", "Closed"],
      ["rejected", "Rejected"],
    ],
  },
  {
    // Tahapan dokumen klaim, dipilih terpisah dari status.
    type: "claim_stage",
    system: true,
    values: [
      ["waiting_document", "Tunggu Dokumen"],
      ["document_incomplete", "Dokumen Belum Lengkap"],
      ["document_complete", "Dokumen Lengkap"],
      ["adjuster", "Proses Adjuster"],
      ["spk", "SPK / SPGR terbit"],
    ],
  },
  {
    type: "payment_model",
    system: true,
    values: [
      ["via_lch", "Via rekening LCH"],
      ["direct", "Langsung ke asuransi"],
    ],
  },
  {
    type: "payment_type",
    system: true,
    values: [
      ["premium_in", "Terima premi"],
      ["premium_out", "Setor premi"],
      ["brokerage_in", "Terima brokerage"],
      ["claim_in", "Terima klaim"],
      ["claim_out", "Bayar klaim"],
    ],
  },
  {
    type: "bank",
    system: false,
    values: [
      ["bca", "BCA"],
      ["ocbc", "OCBC NISP"],
      ["mandiri", "Mandiri"],
      ["bni", "BNI"],
      ["bri", "BRI"],
    ],
  },
  {
    type: "account_type",
    system: true,
    values: [
      ["asset", "Asset"],
      ["liability", "Liability"],
      ["equity", "Equity"],
      ["revenue", "Revenue"],
      ["expense", "Expense"],
    ],
  },
]

async function seedLookups() {
  let n = 0
  let retired = 0
  for (const group of LOOKUPS) {
    for (const [i, [code, name]] of group.values.entries()) {
      await prisma.lookupValue.upsert({
        where: { lookupType_code: { lookupType: group.type, code } },
        create: {
          lookupType: group.type,
          code,
          name,
          sortOrder: i,
          isSystem: group.system,
        },
        // Label sengaja tidak ditimpa, supaya perubahan dari LCH tidak hilang
        // saat seed dijalankan lagi.
        update: { sortOrder: i, isSystem: group.system },
      })
      n++
    }

    // Kode pada lookup is_system dimiliki program, bukan LCH. Kalau sebuah kode
    // dihapus dari daftar di atas, barisnya tidak ikut dihapus supaya data lama
    // yang menunjuk ke sana tetap bisa ditelusuri, tapi dinonaktifkan supaya
    // berhenti muncul di dropdown. Tanpa ini, memecah claim_status menjadi
    // claim_status dan claim_stage menyisakan sepuluh pilihan lama di database.
    if (group.system) {
      const { count } = await prisma.lookupValue.updateMany({
        where: {
          lookupType: group.type,
          isActive: true,
          code: { notIn: group.values.map(([code]) => code) },
        },
        data: { isActive: false },
      })
      retired += count
    }
  }
  return { n, retired }
}

const lookupId = async (lookupType: string, code: string) => {
  const row = await prisma.lookupValue.findUniqueOrThrow({
    where: { lookupType_code: { lookupType, code } },
  })
  return row.id
}

// ---------------------------------------------------------------------------
// Referensi lain
// ---------------------------------------------------------------------------

async function seedCurrencies() {
  const list = [
    ["IDR", "Rupiah"],
    ["USD", "US Dollar"],
    ["SGD", "Singapore Dollar"],
    ["EUR", "Euro"],
  ]
  for (const [code, name] of list) {
    await prisma.currency.upsert({
      where: { code },
      create: { code, name },
      update: {},
    })
  }
  return list.length
}

async function seedDocumentTypes() {
  // Periode reset masih menunggu jawaban LCH, sementara dipasang bulanan
  // mengikuti contoh nomor Debit Note dan Credit Note yang sudah ada.
  const monthly = await lookupId("reset_period", "monthly")
  const list: [code: string, name: string, pattern: string][] = [
    ["PS", "Placing Slip", "{seq:3}/LCH-PLCMT/PS-{COVER}/{MMROMAN}/{YYYY}"],
    ["QS", "Quotation Slip", "{seq:3}/LCH-PLCMT/QS-{COVER}/{MMROMAN}/{YYYY}"],
    ["CVN", "Cover Note", "{seq:3}/LCH-PLCMT/CVN-{COVER}/{MMROMAN}/{YYYY}"],
    [
      "CI",
      "Closing Instruction",
      "{seq:3}/LCH-PLCMT/CI-{COVER}/{MMROMAN}/{YYYY}",
    ],
    ["DN", "Debit Note", "{seq:4}/DNLCH/{MM}/{YYYY}"],
    ["CN", "Credit Note", "{seq:4}/CNLCH/{MM}/{YYYY}"],
    ["CLM", "Klaim", "CLM-LCH{seq:3}/{COVER}/{MMROMAN}/{YYYY}"],
    ["JV", "Jurnal", "{seq:4}/JV/{MM}/{YYYY}"],
  ]
  for (const [code, name, numberPattern] of list) {
    await prisma.documentType.upsert({
      where: { code },
      create: { code, name, numberPattern, resetPeriodId: monthly },
      update: { name, numberPattern },
    })
  }
  return list.length
}

async function seedCompanyProfile() {
  const name = "PT. LCH Insurance Brokers"
  const existing = await prisma.companyProfile.findFirst({ where: { name } })
  const data = {
    name,
    address:
      "Springhill Office Tower 11th Floor Unit H, Jl. Benyamin Suaeb Block D6, Kemayoran, Jakarta Utara 14410",
    skojkNo: "KEP-46/NB.1/2016",
    apparindoNo: "237-2016",
  }
  if (existing) {
    await prisma.companyProfile.update({ where: { id: existing.id }, data })
  } else {
    await prisma.companyProfile.create({ data })
  }
  return 1
}

/**
 * Sumber penempatan / bisnis awal (PRD A-04, ERD sources).
 */
async function seedSources() {
  const sources = [
    { code: "LCH-ID", name: "PT. LCH Insurance Brokers" },
    { code: "LCH-SG", name: "LCH Insurance Brokers Pte Ltd" },
    { code: "DIRECT", name: "Direct Client / Nasabah Langsung" },
  ]
  for (const s of sources) {
    await prisma.source.upsert({
      where: { code: s.code },
      create: { code: s.code, name: s.name },
      update: { name: s.name },
    })
  }
  return sources.length
}

/**
 * COB dan type of cover dari sheet FIX milik LCH. Kode COB adalah dua digit
 * pertama kode type of cover.
 *
 * Satuan rate dan tampilan form mengikuti SE OJK: harta benda per mil,
 * kendaraan bermotor persen, sisanya per mil dengan form standar.
 */
const COB_FORM: Record<string, { rateMode: string; formVariant: string }> = {
  "01": { rateMode: "permil", formVariant: "property" },
  "02": { rateMode: "percent", formVariant: "motor" },
}

/**
 * Singkatan type of cover untuk token {COVER}, diambil dari kode di
 * TYPE_OF_COVER (lib/data/reference.ts). Yang belum ada menunggu daftar LCH.
 */
const COVER_ABBREVIATIONS: Record<string, string> = {
  "0103": "BI",
  "0109": "PAR",
  "0110": "IAR",
  "0311": "MC",
  "0312": "MC",
  "0323": "MC",
  "0401": "MH",
  "0801": "CAR",
  "0802": "EAR",
  "0803": "MB",
  "0804": "EEI",
  "0901": "PL",
  "0905": "PRL",
  "0906": "PI",
  "0913": "DNO",
  "1004": "PA",
}

async function seedCobAndCoverTypes() {
  const rows = readCsv("cob-toc.csv")
  const permil = await lookupId("rate_mode", "permil")
  const percent = await lookupId("rate_mode", "percent")
  const variants = {
    property: await lookupId("form_variant", "property"),
    motor: await lookupId("form_variant", "motor"),
    standard: await lookupId("form_variant", "standard"),
  }

  const cobs = new Map<string, string>()
  for (const r of rows) {
    if (cobs.has(r.kode_cob)) continue
    const form = COB_FORM[r.kode_cob] ?? {
      rateMode: "permil",
      formVariant: "standard",
    }
    const cob = await prisma.classOfBusiness.upsert({
      where: { code: r.kode_cob },
      create: {
        code: r.kode_cob,
        name: r.cob,
        rateModeId: form.rateMode === "percent" ? percent : permil,
        formVariantId: variants[form.formVariant as keyof typeof variants],
      },
      update: { name: r.cob },
    })
    cobs.set(r.kode_cob, cob.id)
  }

  for (const r of rows) {
    const abbreviation = COVER_ABBREVIATIONS[r.kode_toc]
    const priority = r.prioritas?.trim() || null
    await prisma.coverType.upsert({
      where: { code: r.kode_toc },
      create: {
        code: r.kode_toc,
        name: r.toc,
        cobId: cobs.get(r.kode_cob)!,
        abbreviation,
        priority,
      },
      // Leave abbreviations/priorities set from master data alone when the seed has none.
      update: {
        name: r.toc,
        cobId: cobs.get(r.kode_cob)!,
        ...(abbreviation ? { abbreviation } : {}),
        ...(priority ? { priority } : {}),
      },
    })
  }
  return { cobs: cobs.size, coverTypes: rows.length }
}

/**
 * Master jenis berkas klaim awal per COB (PRD A-04, A-18, ERD claim_document_types).
 */
async function seedClaimDocumentTypes() {
  const cobs = await prisma.classOfBusiness.findMany({
    select: { id: true, code: true },
  })
  const cobMap = new Map(cobs.map((c) => [c.code, c.id]))

  const list: {
    cobCode: string
    name: string
    isRequired: boolean
    sortOrder: number
  }[] = [
    // Property (01)
    { cobCode: "01", name: "Surat Laporan Klaim Tertulis", isRequired: true, sortOrder: 1 },
    { cobCode: "01", name: "Kronologi Kejadian Kerugian", isRequired: true, sortOrder: 2 },
    { cobCode: "01", name: "Foto Kerusakan Objek Pertanggungan", isRequired: true, sortOrder: 3 },
    { cobCode: "01", name: "Rincian Estimasi Biaya Perbaikan (RAB)", isRequired: true, sortOrder: 4 },
    { cobCode: "01", name: "Salinan Polis Asuransi & Bukti Bayar Premi", isRequired: false, sortOrder: 5 },
    // Motor Vehicle (02)
    { cobCode: "02", name: "Formulir Klaim Bermaterai", isRequired: true, sortOrder: 1 },
    { cobCode: "02", name: "Salinan SIM Pengemudi", isRequired: true, sortOrder: 2 },
    { cobCode: "02", name: "Salinan STNK Kendaraan", isRequired: true, sortOrder: 3 },
    { cobCode: "02", name: "Foto Kerusakan Fisik Kendaraan", isRequired: true, sortOrder: 4 },
    { cobCode: "02", name: "Surat Keterangan Polisi (jika ada pihak ketiga / hilang)", isRequired: false, sortOrder: 5 },
    // Marine Cargo (03)
    { cobCode: "03", name: "Bill of Lading / Airway Bill", isRequired: true, sortOrder: 1 },
    { cobCode: "03", name: "Commercial Invoice & Packing List", isRequired: true, sortOrder: 2 },
    { cobCode: "03", name: "Berita Acara Kerusakan / BA Bongkar", isRequired: true, sortOrder: 3 },
    { cobCode: "03", name: "Delivery Order (DO)", isRequired: true, sortOrder: 4 },
    { cobCode: "03", name: "Surat Tuntutan ke Pihak Pengangkut (Carrier Claim)", isRequired: false, sortOrder: 5 },
    // Engineering (08)
    { cobCode: "08", name: "Laporan Kerusakan & Kronologi Teknis", isRequired: true, sortOrder: 1 },
    { cobCode: "08", name: "Penawaran Perbaikan / Suku Cadang Mesin", isRequired: true, sortOrder: 2 },
    { cobCode: "08", name: "Foto Kerusakan Mesin / Proyek", isRequired: true, sortOrder: 3 },
  ]

  let count = 0
  for (const item of list) {
    const cobId = cobMap.get(item.cobCode)
    if (!cobId) continue
    const existing = await prisma.claimDocumentType.findFirst({
      where: { cobId, name: item.name },
    })
    if (!existing) {
      await prisma.claimDocumentType.create({
        data: {
          cobId,
          name: item.name,
          isRequired: item.isRequired,
          sortOrder: item.sortOrder,
        },
      })
      count++
    }
  }
  return count
}

/**
 * Baris rate bawaan per COB, dipakai membuat tabel rate saat slip baru.
 * Mengikuti tampilan prototipe yang sudah disetujui LCH.
 */
async function seedCobRateLines() {
  const rateKind = await lookupId("rate_line_kind", "rate")
  const tplKind = await lookupId("rate_line_kind", "tpl")
  const paKind = await lookupId("rate_line_kind", "pa")

  const perCob: Record<string, [kind: string, label: string][]> = {
    "01": [
      [rateKind, "FLEXAS"],
      [rateKind, "FWTWD"],
      [rateKind, "RSMDCC"],
      [rateKind, "Other Losses"],
      [rateKind, "BI PAR (FLEXAS + FWTWD + RSMDCC + Others)"],
      [rateKind, "EQVET"],
      [rateKind, "BI EQVET"],
    ],
    "02": [
      [rateKind, "Comprehensive Casco"],
      [rateKind, "Loading Rate Comprehensive"],
      [rateKind, "Flood, Windstorm, Tempest & Water Damage"],
      [rateKind, "Earthquake, Volcanic Eruption & Tsunami"],
      [rateKind, "Strike, Riot, Civil Commotion"],
      [rateKind, "Terrorism & Sabotage"],
      [rateKind, "Authorized Workshop"],
      [rateKind, "Theft by Driver"],
      [tplKind, "Third Party Liability"],
      [paKind, "Driver"],
      [paKind, "Passenger"],
    ],
  }

  let n = 0
  for (const [cobCode, lines] of Object.entries(perCob)) {
    const cob = await prisma.classOfBusiness.findUnique({
      where: { code: cobCode },
    })
    if (!cob) continue
    // Baris default ditulis ulang seluruhnya supaya urutannya tidak kacau.
    await prisma.cobRateLine.deleteMany({ where: { cobId: cob.id } })
    await prisma.cobRateLine.createMany({
      data: lines.map(([kindId, label], i) => ({
        cobId: cob.id,
        kindId,
        label,
        sortOrder: i,
      })),
    })
    n += lines.length
  }
  return n
}

// ---------------------------------------------------------------------------
// Tarif OJK
// ---------------------------------------------------------------------------

async function seedOccupations() {
  const rows = readCsv("tarif-ojk-okupasi.csv")
  let occ = 0
  let tariffs = 0
  const seen = new Map<string, string>()
  const conflicts: string[] = []

  for (const r of rows) {
    const code = r.kode_okupasi
    if (!code) continue

    // Hasil ekstraksi PDF pernah memberi kode sama ke dua okupasi berbeda.
    // Yang belakangan dilewat supaya tarifnya tidak menimpa yang pertama,
    // lalu dilaporkan untuk dicek ulang ke LCH.
    const previous = seen.get(code)
    if (previous !== undefined) {
      if (previous !== r.keterangan) {
        conflicts.push(`${code}: "${previous}" vs "${r.keterangan}"`)
      }
      continue
    }
    seen.set(code, r.keterangan)
    const occupation = await prisma.occupation.upsert({
      where: { code },
      create: { code, name: r.keterangan || code },
      update: { name: r.keterangan || code },
    })
    occ++

    for (const [cls, lo, hi] of [
      ["K1", r.k1_bawah, r.k1_atas],
      ["K2", r.k2_bawah, r.k2_atas],
      ["K3", r.k3_bawah, r.k3_atas],
    ] as const) {
      const rateMin = dec(lo)
      const rateMax = dec(hi)
      // Sebagian okupasi di lampiran tidak punya angka untuk kelas tertentu.
      if (rateMin === null || rateMax === null) continue
      await prisma.tariffOccupation.upsert({
        where: {
          occupationId_constructionClass: {
            occupationId: occupation.id,
            constructionClass: cls,
          },
        },
        create: {
          occupationId: occupation.id,
          constructionClass: cls,
          rateMin,
          rateMax,
        },
        update: { rateMin, rateMax },
      })
      tariffs++
    }
  }
  return { occ, tariffs, conflicts }
}

async function seedEqZones() {
  const rows = readCsv("zona-gempa-ojk.csv")
  for (const r of rows) {
    await prisma.eqZone.upsert({
      where: {
        province_regency: { province: r.provinsi, regency: r.kabupaten_kota },
      },
      create: {
        province: r.provinsi,
        regency: r.kabupaten_kota,
        zone: `Zona ${r.zona}`,
      },
      update: { zone: `Zona ${r.zona}` },
    })
  }
  return rows.length
}

async function seedEqPropertyTariffs() {
  const rows = readCsv("tarif-ojk-gempa-properti.csv")
  let n = 0
  for (const r of rows) {
    for (const z of [1, 2, 3, 4, 5]) {
      const rate = dec(r[`zona_${z}`])
      if (rate === null) continue
      const key = {
        constructionCategory: r.kategori_konstruksi,
        zone: `Zona ${z}`,
      }
      await prisma.tariffEqProperty.upsert({
        where: { constructionCategory_zone: key },
        create: { ...key, rate },
        update: { rate },
      })
      n++
    }
  }
  return n
}

/** Nama jenis pertanggungan di CSV dipetakan ke enum CoverageType. */
const coverageType = (v: string) => {
  const s = (v ?? "").trim().toLowerCase()
  if (s === "comprehensive") return "Comprehensive" as const
  if (s === "total loss only") return "TotalLossOnly" as const
  return null
}

async function seedFloodTariffs() {
  const rows = readCsv("tarif-ojk-banjir.csv")
  // Ditulis ulang tiap seed, karena tabel ini tidak punya kunci alami: harta
  // benda dibedakan zona, kendaraan bermotor dibedakan jenis pertanggungan.
  await prisma.tariffFlood.deleteMany()
  await prisma.tariffFlood.createMany({
    data: rows.map((r) => ({
      line: r.lini,
      region: r.wilayah,
      zone: r.zona,
      coverageType: coverageType(r.jenis_pertanggungan),
      rateMin: dec(r.batas_bawah),
      rateMax: dec(r.batas_atas),
      note: r.catatan || null,
    })),
  })
  return rows.length
}

/** "0 sampai Rp125.000.000" dan "Di atas Rp800.000.000" jadi batas angka. */
function parseSumInsuredBand(label: string) {
  const numbers = [...label.matchAll(/Rp([\d.]+)/g)].map((m) =>
    Number(m[1].replace(/\./g, ""))
  )
  if (/^di atas/i.test(label)) {
    return { siMin: numbers[0] ?? null, siMax: numbers[1] ?? null }
  }
  if (numbers.length) return { siMin: 0, siMax: numbers[0] }
  return { siMin: null, siMax: null }
}

async function seedMotorTariffs() {
  const rows = readCsv("tarif-ojk-kbm.csv")
  for (const r of rows) {
    const cover = coverageType(r.jenis_pertanggungan)
    if (!cover) continue
    const band = parseSumInsuredBand(r.uang_pertanggungan)
    const key = {
      category: r.kategori,
      region: r.wilayah,
      coverageType: cover,
    }
    const data = {
      vehicleType: r.jenis_kendaraan,
      siMin: band.siMin === null ? null : new Prisma.Decimal(band.siMin),
      siMax: band.siMax === null ? null : new Prisma.Decimal(band.siMax),
      rateMin: dec(r.batas_bawah)!,
      rateMax: dec(r.batas_atas)!,
    }
    await prisma.tariffMotor.upsert({
      where: { category_region_coverageType: key },
      create: { ...key, ...data },
      update: data,
    })
  }
  return rows.length
}

async function seedMotorExtensions() {
  const rows = readCsv("tarif-ojk-kbm-perluasan.csv")
  // Tabel ini tidak punya kunci alami yang rapi, jadi ditulis ulang tiap seed.
  await prisma.tariffMotorExtension.deleteMany()
  await prisma.tariffMotorExtension.createMany({
    data: rows.map((r) => ({
      cover: r.jaminan,
      coverageType: coverageType(r.jenis_pertanggungan),
      basis: r.dasar,
      rateMin: dec(r.batas_bawah),
      rateMax: dec(r.batas_atas),
      note: r.catatan || null,
    })),
  })
  return rows.length
}

async function seedBiScales() {
  const rows = readCsv("skala-bi-ojk.csv")
  for (const r of rows) {
    const months = Number(r.indemnity_period_bulan)
    const percentage = dec(r.persentase_tarif)!
    await prisma.biScale.upsert({
      where: { indemnityMonths: months },
      create: { indemnityMonths: months, percentage },
      update: { percentage },
    })
  }
  return rows.length
}

// ---------------------------------------------------------------------------
// Klausula
// ---------------------------------------------------------------------------

/** Plain text jadi HTML, supaya rich text editor menampilkan paragrafnya. */
function toHtml(text: string) {
  if (/<\/?[a-z][\s\S]*>/i.test(text)) return text
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${p.trim().replace(/\n/g, "<br>")}</p>`)
    .join("")
}

/**
 * 607 klausul dari pustaka LCH. Dikelompokkan per produk (PAR, EQVET, Cargo,
 * dan seterusnya), tapi pemetaan kelompok itu ke COB dan type of cover masih
 * ditunggu dari LCH. Sampai itu datang, semua klausul berlaku untuk semua COB.
 */
async function seedClauses() {
  const rows = readCsv("clause-wording-lch.csv")
  let skipped = 0
  const data: { title: string; sourceGroup: string; wordingHtml: string }[] = []

  for (const r of rows) {
    const title = r.judul_klausul?.trim()
    if (!title) continue
    if (!r.wording?.trim()) {
      // 12 klausul wordingnya kosong di file LCH, ditanyakan ke Harry.
      skipped++
      continue
    }
    data.push({
      title,
      sourceGroup: r.produk?.trim() ?? "",
      wordingHtml: toHtml(r.wording.trim()),
    })
  }

  // Satu INSERT ... ON CONFLICT DO NOTHING, bukan upsert per baris. Hasilnya
  // sama: wording yang sudah ada sengaja tidak ditimpa, karena klausul bisa
  // diedit LCH lewat Master Clauses. Upsert per baris butuh satu perjalanan
  // ke database per klausul, dan ke database cloud itu memakan menit.
  const { count } = await prisma.clause.createMany({
    data,
    skipDuplicates: true,
  })
  return { n: data.length, created: count, skipped }
}

/**
 * Akun awal, satu per role, supaya sistem bisa dicoba sebelum LCH mengirim
 * daftar pengguna sungguhan. Ini data contoh dan harus diganti.
 *
 * Kata sandinya tidak ditulis di repo. Isi SEED_USER_PASSWORD kalau mau
 * menentukan sendiri; kalau kosong, seed membuat kata sandi acak dan
 * menampilkannya sekali di akhir. Hash-nya dibuat memakai fungsi milik Better
 * Auth supaya cocok dengan yang dipakai saat login.
 */
/**
 * Definisi akun pengguna awal untuk pengujian dan operasional LCH.
 */
interface SeedUserRecord {
  email: string
  name: string
  roles: RoleCode[]
  jobTitle?: string
  mustChangePassword?: boolean
}

/**
 * 1. Akun contoh pengujian (dipertahankan agar alur pengujian tidak terputus).
 */
const PRESERVED_MOCK_USERS: SeedUserRecord[] = [
  {
    email: "admin@lch.example",
    name: "Admin LCH",
    roles: ["admin"],
    jobTitle: "Administrator",
    mustChangePassword: false,
  },
  {
    email: "marketing@lch.example",
    name: "Marketing LCH",
    roles: ["marketing"],
    jobTitle: "Staff Marketing",
    mustChangePassword: false,
  },
  {
    email: "teknik@lch.example",
    name: "Teknik LCH",
    roles: ["placement"],
    jobTitle: "Staff Teknik",
    mustChangePassword: false,
  },
  {
    email: "klaim@lch.example",
    name: "Klaim LCH",
    roles: ["claim"],
    jobTitle: "Staff Klaim",
    mustChangePassword: false,
  },
  {
    email: "finance@lch.example",
    name: "Finance LCH",
    roles: ["finance"],
    jobTitle: "Staff Finance",
    mustChangePassword: false,
  },
]

/**
 * 2. Akun operasional LCH sesuai lembar referensi:
 *    - Unifikasi akun multi-role untuk orang yang sama.
 *    - Akun tanpa konflik identitas di-seed langsung.
 */
const OPERATIONAL_USERS: SeedUserRecord[] = [
  // Super Admin ditunjuk LCH 29 Oktober 2026: Harry dan Tresna. Role bidangnya
  // tetap dipertahankan supaya daftar ini tetap menggambarkan pekerjaan asli
  // orangnya, walaupun admin sendiri sudah Kelola di seluruh menu.
  {
    email: "harry@lch.co.id",
    name: "HARRY SETIAWAN",
    roles: ["admin", "marketing", "placement"],
    jobTitle: "SPV",
    mustChangePassword: true,
  },
  // Unifikasi multi-role (Marketing & Placement)
  {
    email: "aziz@lch.co.id",
    name: "AZIZ SURYA",
    roles: ["marketing", "placement"],
    jobTitle: "Marketing & Teknik",
    mustChangePassword: true,
  },
  // Klaim, Accounting, Finance
  // LCH menyebut PIC klaim adalah Yusuf dan Tejo (29 Oktober 2026). Tejo sudah
  // punya akun sendiri di bawah; akun generik "CLAIM LCH" diberi nama Yusuf.
  // Emailnya masih claim@lch.co.id karena alamat pribadinya belum diberitahu,
  // tinggal diganti Admin dari /users kalau sudah ada.
  {
    email: "claim@lch.co.id",
    name: "YUSUF",
    roles: ["claim"],
    jobTitle: "Staff Klaim",
    mustChangePassword: true,
  },
  {
    email: "sutejo@lch.co.id",
    name: "SUTEJO",
    roles: ["claim"],
    jobTitle: "Klaim",
    mustChangePassword: true,
  },
  {
    email: "tresna@lch.co.id",
    name: "TRESNA",
    roles: ["admin", "claim"],
    jobTitle: "Klaim",
    mustChangePassword: true,
  },
  {
    email: "accounting@lch.co.id",
    name: "ACCOUNTING LCH",
    roles: ["accounting"],
    jobTitle: "Staff Accounting",
    mustChangePassword: true,
  },
  {
    email: "finance02@lch.co.id",
    name: "FITRI",
    roles: ["finance"],
    jobTitle: "Finance",
    mustChangePassword: true,
  },
  // LCH memastikan 29 Oktober 2026 bahwa adminfin@lch.co.id milik Yenie, bukan
  // akun Super Admin bersama, jadi konflik identitas pada email ini selesai.
  // Lembar referensi menulis perannya "finance / admin", tetapi di sini baru
  // diberi finance saja: admin membuka Pengguna dan Audit Trail serta Kelola di
  // seluruh menu, jadi lebih aman kurang dulu lalu ditambah Admin dari /users
  // kalau LCH memang meminta. Menunggu jawaban.
  {
    email: "adminfin@lch.co.id",
    name: "YENIE YUSTIKA",
    roles: ["finance"],
    jobTitle: "Finance & Admin",
    mustChangePassword: true,
  },
]

/**
 * 3. Deteksi konflik identitas akun pada lembar referensi LCH:
 *    Dilewati secara terencana demi keamanan agar tidak terjadi account takeover
 *    atau duplikasi akun berbeda orang pada 1 alamat email.
 */
const IDENTITY_CONFLICTS = [
  {
    sharedEmail: "policyadmin@lch.co.id",
    candidates: [
      { name: "MUHAMAD YAHYA MUHAIMIN", role: "placement" },
      { name: "FARAH SABINA HADIYANI", role: "placement" },
    ],
    resolution:
      "Dilewati otomatis untuk mencegah akun bersama antar staf teknik yang berbeda. Administrator disarankan membuat akun terpisah individual di menu /users (misal: muhaimin@lch.co.id dan farah@lch.co.id).",
  },
]

async function seedUsers() {
  const password =
    process.env.SEED_USER_PASSWORD ||
    randomBytes(12).toString("base64url").slice(0, 16)
  const passwordHash = await hashPassword(password)
  let created = 0
  let updated = 0

  const allToSeed = [...PRESERVED_MOCK_USERS, ...OPERATIONAL_USERS]

  for (const item of allToSeed) {
    const existing = await prisma.user.findUnique({
      where: { email: item.email },
    })

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          // Nama ikut diperbarui supaya koreksi dari LCH benar-benar terpasang
          // saat seed dijalankan ulang, bukan cuma berlaku di database kosong.
          name: item.name,
          roles: item.roles,
          jobTitle: item.jobTitle ?? existing.jobTitle,
        },
      })
      const acc = await prisma.account.findFirst({
        where: { userId: existing.id, providerId: "credential" },
      })
      if (!acc) {
        await prisma.account.create({
          data: {
            userId: existing.id,
            providerId: "credential",
            accountId: existing.id,
            password: passwordHash,
          },
        })
      }
      updated++
      continue
    }

    const legacyRoleId = await lookupId("role", item.roles[0])
    const user = await prisma.user.create({
      data: {
        email: item.email,
        name: item.name,
        roles: item.roles,
        jobTitle: item.jobTitle || null,
        roleId: legacyRoleId,
        mustChangePassword: item.mustChangePassword ?? false,
        emailVerified: true,
      },
    })

    await prisma.account.create({
      data: {
        userId: user.id,
        providerId: "credential",
        accountId: user.id,
        password: passwordHash,
      },
    })
    created++
  }

  return { created, updated, password: created ? password : null }
}

/**
 * Pembenihan data klien awal (12 klien mock LCH) ke tabel clients,
 * client_addresses, dan client_documents di PostgreSQL.
 */
async function seedClients() {
  const cache = await prisma.lookupValue.findMany({
    where: {
      lookupType: {
        in: [
          "client_type",
          "client_status",
          "id_type",
          "income_source",
          "insurance_purpose",
          "address_type",
          "client_document_type",
        ],
      },
    },
    select: { id: true, lookupType: true, code: true, name: true },
  })

  const lookupByName = new Map<string, string>()
  const lookupByCode = new Map<string, string>()
  for (const l of cache) {
    lookupByName.set(`${l.lookupType}:${l.name.toLowerCase()}`, l.id)
    lookupByCode.set(`${l.lookupType}:${l.code.toLowerCase()}`, l.id)
  }

  const cobs = await prisma.classOfBusiness.findMany({
    select: { id: true, code: true, name: true },
  })
  const cobMap = new Map<string, string>()
  for (const c of cobs) {
    cobMap.set(c.name.toLowerCase(), c.id)
    cobMap.set(c.code.toLowerCase(), c.id)
  }

  const user = await prisma.user.findFirst({ select: { id: true } })
  const defaultUserId = user?.id

  let created = 0
  let updated = 0

  for (const item of CLIENTS) {
    const clientTypeId =
      lookupByName.get(`client_type:${item.clientType.toLowerCase()}`) ||
      lookupByCode.get("client_type:corporate")!
    const statusId =
      lookupByName.get(`client_status:${item.status.toLowerCase()}`) ||
      lookupByCode.get("client_status:active")!
    const idTypeId = item.idType
      ? lookupByName.get(`id_type:${item.idType.toLowerCase()}`) ||
        lookupByCode.get(`id_type:${item.idType.toLowerCase()}`)
      : null
    const incomeSourceId = item.incomeSource
      ? lookupByName.get(`income_source:${item.incomeSource.toLowerCase()}`)
      : null
    const insurancePurposeId = item.insurancePurpose
      ? lookupByName.get(`insurance_purpose:${item.insurancePurpose.toLowerCase()}`)
      : null
    const cobId = item.cob
      ? cobMap.get(item.cob.toLowerCase()) ?? cobs[0]?.id
      : null

    const existing = await prisma.client.findFirst({
      where: { name: { equals: item.name.trim(), mode: "insensitive" } },
    })

    let clientId: string

    if (existing) {
      clientId = existing.id
      await prisma.client.update({
        where: { id: existing.id },
        data: {
          clientTypeId,
          npwp: item.npwp || null,
          idTypeId,
          idNumber: item.idNumber || null,
          birthPlace: item.birthPlace || null,
          birthDate: item.birthDate ? new Date(item.birthDate) : null,
          contactPerson: item.contactPerson || null,
          contactPersonIdNumber: item.contactPersonIdNumber || null,
          email: item.email || null,
          phone: item.phone || null,
          incomeSourceId,
          insurancePurposeId,
          insurancePurposeNote: item.insurancePurposeNote || null,
          kycDate: item.kycDate ? new Date(item.kycDate) : null,
          cobId,
          statusId,
          notes: item.notes || null,
        },
      })
      updated++
    } else {
      const rec = await prisma.client.create({
        data: {
          clientTypeId,
          name: item.name.trim(),
          npwp: item.npwp || null,
          idTypeId,
          idNumber: item.idNumber || null,
          birthPlace: item.birthPlace || null,
          birthDate: item.birthDate ? new Date(item.birthDate) : null,
          contactPerson: item.contactPerson || null,
          contactPersonIdNumber: item.contactPersonIdNumber || null,
          email: item.email || null,
          phone: item.phone || null,
          incomeSourceId,
          insurancePurposeId,
          insurancePurposeNote: item.insurancePurposeNote || null,
          kycDate: item.kycDate ? new Date(item.kycDate) : null,
          cobId,
          statusId,
          notes: item.notes || null,
        },
      })
      clientId = rec.id
      created++
    }

    if (item.addresses && item.addresses.length > 0) {
      await prisma.clientAddress.deleteMany({ where: { clientId } })
      for (const [idx, addr] of item.addresses.entries()) {
        const addressTypeId =
          lookupByName.get(`address_type:${addr.label.toLowerCase()}`) ||
          lookupByCode.get("address_type:correspondence")!
        await prisma.clientAddress.create({
          data: {
            clientId,
            addressTypeId,
            address: addr.value,
            isPrimary: addr.isPrimary ?? idx === 0,
          },
        })
      }
    }

    if (defaultUserId && item.documents && item.documents.length > 0) {
      for (const doc of item.documents) {
        const docTypeId =
          lookupByName.get(`client_document_type:${doc.type.toLowerCase()}`) ||
          lookupByCode.get("client_document_type:other")!
        const existingDoc = await prisma.clientDocument.findFirst({
          where: { clientId, fileName: doc.fileName },
        })
        if (!existingDoc) {
          await prisma.clientDocument.create({
            data: {
              clientId,
              documentTypeId: docTypeId,
              fileName: doc.fileName,
              filePath: doc.url || `/mock/docs/${doc.fileName}`,
              uploadedBy: defaultUserId,
              uploadedAt: doc.uploadedAt ? new Date(doc.uploadedAt) : new Date(),
            },
          })
        }
      }
    }
  }

  return { created, updated, total: CLIENTS.length }
}

/**
 * Pembenihan data awal 3 mock SPPA LCH ke tabel sppa di PostgreSQL.
 */
async function seedSppa() {
  const [cobs, coverTypes, occupations, currencies, clients, user] = await Promise.all([
    prisma.classOfBusiness.findMany({ select: { id: true, code: true, name: true } }),
    prisma.coverType.findMany({ select: { id: true, cobId: true, code: true, name: true } }),
    prisma.occupation.findMany({ select: { id: true, code: true, name: true } }),
    prisma.currency.findMany({ select: { code: true } }),
    prisma.client.findMany({ select: { id: true, name: true } }),
    prisma.user.findFirst({ select: { id: true } }),
  ])

  const cobMap = new Map<string, { id: string; name: string }>()
  for (const c of cobs) {
    cobMap.set(c.name.toLowerCase(), c)
    cobMap.set(c.code.toLowerCase(), c)
  }

  const coverTypeMap = new Map<string, string>()
  for (const ct of coverTypes) {
    coverTypeMap.set(`${ct.cobId}:${ct.name.toLowerCase()}`, ct.id)
    coverTypeMap.set(`${ct.cobId}:${ct.code.toLowerCase()}`, ct.id)
    coverTypeMap.set(ct.name.toLowerCase(), ct.id)
  }

  const occMap = new Map<string, string>()
  for (const o of occupations) {
    occMap.set(o.code.toLowerCase(), o.id)
  }

  const currSet = new Set(currencies.map((c) => c.code.toUpperCase()))
  const defaultUserId = user?.id

  let created = 0
  let updated = 0

  for (const item of SPPA) {
    const mockClient = CLIENTS.find((c) => c.id === item.clientId)
    let clientId = clients[0]?.id
    if (mockClient) {
      const match = clients.find(
        (c) => c.name.trim().toLowerCase() === mockClient.name.trim().toLowerCase()
      )
      if (match) clientId = match.id
    }

    const cob = cobMap.get(item.cob.toLowerCase()) || cobs[0]
    if (!cob || !clientId || !defaultUserId) continue

    const coverTypeId =
      coverTypeMap.get(`${cob.id}:${item.typeOfCover.toLowerCase()}`) ||
      coverTypeMap.get(item.typeOfCover.toLowerCase()) ||
      null

    const occMatch = item.occupation?.match(/^(\d+)/)
    const occupationId = occMatch ? occMap.get(occMatch[1].toLowerCase()) ?? null : null

    const currencyCode = currSet.has(item.currency.toUpperCase())
      ? item.currency.toUpperCase()
      : "IDR"

    const answers = {
      ...(item.answers ?? {}),
      _typeOfCover: item.typeOfCover,
      ...(item.occupation ? { _occupationText: item.occupation } : {}),
    }

    const existing = await prisma.sppa.findFirst({
      where: {
        insuredName: { equals: item.insuredName.trim(), mode: "insensitive" },
      },
    })

    if (existing) {
      await prisma.sppa.update({
        where: { id: existing.id },
        data: {
          clientId,
          cobId: cob.id,
          coverTypeId,
          riskLocation: item.riskLocation || null,
          occupationId,
          currencyCode,
          sumInsured: new Prisma.Decimal(item.sumInsured || 0),
          periodStart: item.periodStart ? new Date(item.periodStart) : null,
          periodEnd: item.periodEnd ? new Date(item.periodEnd) : null,
          answers,
          status: item.status,
        },
      })
      updated++
    } else {
      await prisma.sppa.create({
        data: {
          clientId,
          cobId: cob.id,
          coverTypeId,
          insuredName: item.insuredName.trim(),
          riskLocation: item.riskLocation || null,
          occupationId,
          currencyCode,
          sumInsured: new Prisma.Decimal(item.sumInsured || 0),
          periodStart: item.periodStart ? new Date(item.periodStart) : null,
          periodEnd: item.periodEnd ? new Date(item.periodEnd) : null,
          answers,
          status: item.status,
          createdBy: defaultUserId,
          createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
          updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
        },
      })
      created++
    }
  }

  return { created, updated, total: SPPA.length }
}

/** Merek dan tipe kendaraan awal. Baris yang sudah ada tidak diubah, jadi edit LCH aman. */
async function seedVehicles() {
  const rows = readCsv("kendaraan.csv")
  const brands = [...new Set(rows.map((r) => r.merek))]
  let created = 0
  for (const [i, name] of brands.entries()) {
    const brand = await prisma.vehicleBrand.upsert({
      where: { name },
      update: {},
      create: { name, sortOrder: i },
    })
    for (const r of rows.filter((row) => row.merek === name)) {
      const existing = await prisma.vehicleType.findUnique({
        where: { brandId_name: { brandId: brand.id, name: r.tipe } },
        select: { id: true },
      })
      if (existing) continue
      await prisma.vehicleType.create({ data: { brandId: brand.id, name: r.tipe } })
      created++
    }
  }
  return { brands: brands.length, types: rows.length, created }
}

// ---------------------------------------------------------------------------

/**
 * Bagian seed yang bisa dipilih: `npm run db:seed -- clauses tariffs`.
 * Tanpa argumen semua bagian dijalankan. Berguna untuk melanjutkan seed ke
 * database cloud tanpa mengulang bagian yang sudah lengkap.
 */
const SECTIONS = [
  "system",
  "cob",
  "occupations",
  "tariffs",
  "clauses",
  "clients",
  "sppa",
  "vehicles",
] as const

let seededUsers: {
  created: number
  updated: number
  password: string | null
} | null = null

async function main() {
  const args = process.argv.slice(2)
  const unknown = args.filter(
    (a) => !SECTIONS.includes(a as (typeof SECTIONS)[number])
  )
  if (unknown.length) {
    throw new Error(
      `Bagian seed tidak dikenal: ${unknown.join(", ")}. Pilihan: ${SECTIONS.join(", ")}`
    )
  }
  const want = (section: (typeof SECTIONS)[number]) =>
    args.length === 0 || args.includes(section)

  console.log(
    `Seed master data LCH${args.length ? ` (${args.join(", ")})` : ""}\n`
  )

  if (want("system")) {
    const lookups = await seedLookups()
    console.log(
      `  lookup_values        ${lookups.n}` +
        (lookups.retired ? ` (${lookups.retired} kode lama dinonaktifkan)` : "")
    )
    console.log(`  currencies           ${await seedCurrencies()}`)
    console.log(`  document_types       ${await seedDocumentTypes()}`)
    seededUsers = await seedUsers()
    console.log(
      `  users                ${seededUsers.created} baru` +
        (seededUsers.updated ? `, ${seededUsers.updated} diperbarui` : "")
    )
    console.log(`  company_profile      ${await seedCompanyProfile()}`)
    console.log(`  sources              ${await seedSources()}`)
  }

  if (want("cob")) {
    const cob = await seedCobAndCoverTypes()
    console.log(`  classes_of_business  ${cob.cobs}`)
    console.log(`  cover_types          ${cob.coverTypes}`)
    console.log(`  cob_rate_lines       ${await seedCobRateLines()}`)
    console.log(`  claim_doc_types      ${await seedClaimDocumentTypes()}`)
  }

  const occ = want("occupations") ? await seedOccupations() : null
  if (occ) {
    console.log(`  occupations          ${occ.occ}`)
    console.log(`  tariff_occupation    ${occ.tariffs}`)
  }

  if (want("tariffs")) {
    console.log(`  eq_zones             ${await seedEqZones()}`)
    console.log(`  tariff_eq_property   ${await seedEqPropertyTariffs()}`)
    console.log(`  tariff_flood         ${await seedFloodTariffs()}`)
    console.log(`  tariff_motor         ${await seedMotorTariffs()}`)
    console.log(`  tariff_motor_ext     ${await seedMotorExtensions()}`)
    console.log(`  bi_scales            ${await seedBiScales()}`)
  }

  const clauses = want("clauses") ? await seedClauses() : null
  if (clauses) {
    console.log(
      `  clauses              ${clauses.n} (${clauses.created} baru, sisanya sudah ada)`
    )
  }

  if (want("clients")) {
    const clients = await seedClients()
    console.log(
      `  clients              ${clients.total} (${clients.created} baru, ${clients.updated} diperbarui)`
    )
  }

  if (want("sppa")) {
    const sppa = await seedSppa()
    console.log(
      `  sppa                 ${sppa.total} (${sppa.created} baru, ${sppa.updated} diperbarui)`
    )
  }

  if (want("vehicles")) {
    const v = await seedVehicles()
    console.log(`  kendaraan            ${v.brands} merek, ${v.types} tipe (${v.created} baru)`)
  }

  if (clauses?.skipped || occ?.conflicts.length) {
    console.log("\nPerlu dicek ke LCH:")
    if (clauses?.skipped) {
      console.log(
        `  ${clauses.skipped} klausul dilewat karena wordingnya kosong di file LCH`
      )
    }
    for (const c of occ?.conflicts ?? []) {
      console.log(`  kode okupasi dipakai dua okupasi berbeda, ${c}`)
    }
  }

  if (IDENTITY_CONFLICTS.length) {
    console.log("\n[Konflik Identitas Akun pada Referensi LCH (Dilewati Otomatis)]:")
    for (const conf of IDENTITY_CONFLICTS) {
      console.log(`  - Email bersama: ${conf.sharedEmail}`)
      console.log(
        `    Kandidat: ${conf.candidates.map((c) => `${c.name} (${c.role})`).join(" vs ")}`
      )
      console.log(`    Penanganan: ${conf.resolution}`)
    }
  }

  console.log("\nBelum di-seed, menunggu data dari LCH:")
  console.log(
    "  insurers, adjusters, wording_forms, coa_accounts, bank_accounts"
  )

  if (seededUsers?.created) {
    console.log(
      `\nDibuat ${seededUsers.created} akun pengguna baru.` +
        `\nKata sandi awal untuk semua akun baru: ${seededUsers.password}` +
        "\nPengguna operasional LCH diwajibkan mengganti kata sandi pada saat pertama kali login (mustChangePassword: true)." +
        "\nCatat sekarang, kata sandi ini tidak ditampilkan lagi. Ganti sebelum dipakai LCH."
    )
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
