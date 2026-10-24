import { recalcSlip, totalSumInsured } from "@/lib/calc"
import {
  correspondenceAddress,
  MOTOR_RATE_LINES,
  PROPERTY_RATE_LINES,
  TYPE_OF_COVER,
  type ClassOfBusiness,
  type Client,
  type LineItem,
  type PlacingSlip,
  type RateLine,
  type Sppa,
} from "@/lib/data"
import { OCCUPATION_TARIFFS } from "@/lib/data/ojk-tariff"
import { todayIso, yearMonth } from "@/lib/date"
import { normalizeCob, romanMonth } from "@/lib/format"

let seq = 0
export const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${seq++}`

export function makeRateLines(cob: ClassOfBusiness): RateLine[] {
  if (cob === "Property") {
    return PROPERTY_RATE_LINES.map((label, i) => ({
      id: `r${i + 1}`,
      label,
      rate: null,
      premium: 0,
    }))
  }
  if (cob === "Motor Vehicle") {
    return MOTOR_RATE_LINES.map((label, i) => ({
      id: `r${i + 1}`,
      label,
      rate: null,
      premium: 0,
    }))
  }
  return [{ id: "r1", label: "Rate (‰)", rate: null, premium: 0 }]
}

export function makeMotorSubLines(): {
  tplLines: RateLine[]
  paLines: RateLine[]
} {
  return {
    tplLines: [
      {
        id: "t1",
        label: "Third Party Liability",
        rate: null,
        premium: 0,
        basis: "0",
      },
      {
        id: "t2",
        label: "Third Party Liability",
        rate: null,
        premium: 0,
        basis: "0",
      },
    ],
    paLines: [
      { id: "p1", label: "Driver", rate: null, premium: 0, basis: "0" },
      { id: "p2", label: "Passenger", rate: null, premium: 0, basis: "0" },
    ],
  }
}

export function emptySlip(): PlacingSlip {
  return {
    id: "new",
    slipNo: null,
    seq: 0,
    cob: "Property",
    typeOfCover: "",
    coverCode: null,
    clientId: null,
    insuredName: "",
    correspondenceAddress: "",
    currency: "IDR",
    status: "Draft",
    periodTba: false,
    inceptionDate: null,
    expiryDate: null,
    occupation: "",
    riskLocation: "",
    wordingForms: [""],
    coverage: "",
    constructionClass: "",
    indemnityPeriod: "",
    interestSection1: "",
    interestSection2: "",
    interestItems: [{ id: uid("i"), description: "", amount: 0 }],
    sumInsuredSection1: [{ id: uid("m"), description: "", amount: 0 }],
    sumInsuredSection2: [{ id: uid("b"), description: "", amount: 0 }],
    deductiblesSection1: [],
    deductiblesSection2: [],
    specialConditions: "",
    clauseIds: [],
    rateLines: makeRateLines("Property"),
    tplLines: [],
    paLines: [],
    discountPct: 0,
    adminCost: 0,
    stampDuty: 0,
    brokeragePct: 0,
    includeVat: false,
    createdAt: todayIso(),
    updatedAt: todayIso(),
  }
}

/** Hitung ulang seluruh premium dari rate + sum insured. */
export const recalc = recalcSlip

/** Ganti COB → reset struktur rate & type of cover. */
export function switchCob(
  slip: PlacingSlip,
  cob: ClassOfBusiness
): PlacingSlip {
  const normCob = normalizeCob(cob)
  const motor = normCob === "Motor Vehicle"
  const sub = motor ? makeMotorSubLines() : { tplLines: [], paLines: [] }
  return recalc({
    ...slip,
    cob: normCob,
    typeOfCover: "",
    coverCode: null,
    rateLines: makeRateLines(normCob),
    ...sub,
  })
}

export function coverCodeFor(cob: ClassOfBusiness, typeOfCover: string) {
  return TYPE_OF_COVER[cob]?.find((t) => t.label === typeOfCover)?.code ?? null
}

/** Property punya blok Okupasi, Risk Location, Wording Form, dan Detail Coverage. */
export function usesPropertyBlocks(cob: ClassOfBusiness) {
  return cob !== "Motor Vehicle"
}

export function usesSectionSumInsured(cob: ClassOfBusiness) {
  return cob === "Property"
}

/* ---------------------------------------------------------------- */
/* Batas tarif OJK dan validasi release                               */
/* ---------------------------------------------------------------- */

/** Batas FLEXAS dari tabel okupasi OJK untuk okupasi dan kelas konstruksi slip. */
export function occupationBounds(
  occupation: string | undefined,
  constructionClass: string | undefined
) {
  const code = (occupation ?? "").trim().split(/[^0-9A-Za-z]/)[0]
  const klas = (constructionClass ?? "").toLowerCase() as "k1" | "k2" | "k3"
  if (!code || !["k1", "k2", "k3"].includes(klas)) return null
  const tariff = OCCUPATION_TARIFFS.find((o) => o.code === code)
  const range = tariff?.[klas]
  if (!range) return null
  return {
    min: range[0],
    max: range[1],
    source: `FLEXAS okupasi ${code} ${klas.toUpperCase()}`,
  }
}

/**
 * Baris rate beserta batas OJK yang berlaku. Batas yang dipilih dari panel
 * referensi dipakai lebih dulu; bila belum ada, FLEXAS memakai batas okupasi
 * dan kelas konstruksi slip, jadi rate yang diketik manual tetap tervalidasi.
 */
export function rateLinesWithBounds(slip: PlacingSlip): RateLine[] {
  const auto =
    slip.cob === "Property"
      ? occupationBounds(slip.occupation, slip.constructionClass)
      : null
  return slip.rateLines.map((l) => {
    if (l.min != null || l.max != null) return l
    if (auto && l.label === "FLEXAS") {
      return { ...l, min: auto.min, max: auto.max, boundSource: auto.source }
    }
    return l
  })
}

export function isOutOfBounds(line: RateLine) {
  if (line.rate == null) return false
  return (
    (line.min != null && line.rate < line.min) ||
    (line.max != null && line.rate > line.max)
  )
}

/** Hal yang harus dibereskan sebelum slip boleh di-release (PRD A-08 sampai A-12). */
export function releaseIssues(slip: PlacingSlip) {
  const issues: string[] = []
  if (!slip.clientId) issues.push("Pilih nama tertanggung dari data klien.")
  if (!slip.typeOfCover) issues.push("Pilih type of cover.")
  if (!slip.correspondenceAddress.trim())
    issues.push("Isi correspondence address.")
  if (!slip.periodTba) {
    if (!slip.inceptionDate || !slip.expiryDate) {
      issues.push("Isi periode asuransi atau aktifkan Period TBA.")
    } else if (slip.expiryDate <= slip.inceptionDate) {
      issues.push("Expiry date harus setelah inception date.")
    }
  }
  if (slip.cob === "Property") {
    if (!slip.occupation) issues.push("Pilih okupasi OJK.")
    if (!slip.constructionClass) issues.push("Pilih kelas konstruksi.")
    if (!slip.riskLocation?.trim()) issues.push("Isi risk location.")
  }
  if (totalSumInsured(slip) <= 0) issues.push("Isi sum insured.")
  if (!slip.rateLines.some((l) => (l.rate ?? 0) > 0)) {
    issues.push("Isi minimal satu rate.")
  }
  for (const line of rateLinesWithBounds(slip)) {
    if (isOutOfBounds(line) && !slip.rateExceptions?.[line.id]?.note.trim()) {
      issues.push(
        `Rate ${line.label} di luar batas OJK dan belum ada alasannya.`
      )
    }
  }
  return issues
}

/* ---------------------------------------------------------------- */
/* Penomoran                                                          */
/* ---------------------------------------------------------------- */

/**
 * Nomor urut slip berikutnya untuk bulan berjalan. Pola sekarang direset per
 * bulan; di backend diambil dari number_counters dengan SELECT ... FOR UPDATE.
 */
export function nextSlipSeq(slips: PlacingSlip[], today: string) {
  const { year, month } = yearMonth(today)
  const suffix = `/${romanMonth(month - 1)}/${year}`
  return (
    slips
      .filter((s) => s.slipNo?.endsWith(suffix))
      .reduce((max, s) => Math.max(max, s.seq), 0) + 1
  )
}

export function buildSlipNo(
  seq: number,
  coverCode: string | null,
  today: string
) {
  const { year, month } = yearMonth(today)
  const kind = coverCode ? `PS-${coverCode}` : "PS"
  return `${String(seq).padStart(3, "0")}/LCH-PLCMT/${kind}/${romanMonth(month - 1)}/${year}`
}

/**
 * Nomor Cover Note dan Closing Instruction diturunkan dari nomor slip supaya
 * tetap sama walau slip diedit: 002/LCH-PLCMT/PS-PAREQ/VIII/2026 menjadi
 * 002/LCH-PLCMT/CN-PAREQ/VIII/2026 dan 002/LCH-PLCMT/CI/VIII/2026. Format final
 * menunggu contoh dokumen dari LCH.
 */
export function derivedDocNumber(slipNo: string | null, kind: "CN" | "CI") {
  if (!slipNo) return null
  const parts = slipNo.split("/")
  if (parts.length < 5) return null
  const code = parts[2].replace(/^PS-?/, "")
  parts[2] = kind === "CN" && code ? `CN-${code}` : kind
  return parts.join("/")
}

/* ---------------------------------------------------------------- */
/* Slip baru dari klien atau SPPA                                     */
/* ---------------------------------------------------------------- */

export function slipForClient(client: Client): PlacingSlip {
  const base = switchCob(emptySlip(), client.cob)
  return {
    ...base,
    clientId: client.id,
    insuredName: client.name,
    correspondenceAddress: correspondenceAddress(client)?.value ?? "",
  }
}

export function slipFromSppa(sppa: Sppa, client: Client | null): PlacingSlip {
  const cob = normalizeCob(sppa.cob)
  const base = switchCob(emptySlip(), cob)
  const property = cob === "Property"
  const motor = cob === "Motor Vehicle"

  const motorDescParts = [
    sppa.answers?.year ? `Tahun ${sppa.answers.year}` : null,
    sppa.answers?.plate ? `No. Pol: ${sppa.answers.plate}` : null,
    sppa.answers?.chassis ? `Rangka/Mesin: ${sppa.answers.chassis}` : null,
    sppa.answers?.usage ? `Penggunaan: ${sppa.answers.usage}` : null,
  ].filter(Boolean)
  const motorDesc =
    motorDescParts.length > 0 ? motorDescParts.join(" · ") : sppa.typeOfCover

  const amount: LineItem = {
    id: uid("m"),
    description: motor ? motorDesc : sppa.typeOfCover,
    amount: sppa.sumInsured,
    ...(motor
      ? {
          vehicleBrandId: sppa.vehicleBrandId ?? null,
          vehicleTypeId: sppa.vehicleTypeId ?? null,
          vehicleBrandName: sppa.vehicleBrandName ?? null,
          vehicleTypeName: sppa.vehicleTypeName ?? null,
        }
      : {}),
  }
  return recalc({
    ...base,
    sppaId: sppa.id,
    clientId: sppa.clientId,
    insuredName: sppa.insuredName,
    correspondenceAddress: client
      ? (correspondenceAddress(client)?.value ?? "")
      : "",
    typeOfCover: sppa.typeOfCover,
    coverCode: coverCodeFor(cob, sppa.typeOfCover),
    currency: sppa.currency,
    inceptionDate: sppa.periodStart,
    expiryDate: sppa.periodEnd,
    occupation: sppa.occupation ?? "",
    riskLocation: sppa.riskLocation,
    sumInsuredSection1: property ? [amount] : base.sumInsuredSection1,
    interestItems: property ? base.interestItems : [amount],
  })
}
