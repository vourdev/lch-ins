/**
 * Motor vehicle statutory tariffs (SE OJK No. 6/SEOJK.05/2017 Appendix IV).
 */

/** Maximum acquisition cost / brokerage cap for motor vehicle business (SEOJK No. 6/SEOJK.05/2017) */
export const MOTOR_ACQUISITION_CAP_PCT = 25

export interface MotorTariff {
  category: string
  vehicle: string
  sumInsuredBand: string
  region: string
  cover: string
  /** persen dari uang pertanggungan */
  min: number
  max: number
}

export const MOTOR_TARIFFS: MotorTariff[] = [
  { category: "Kategori 1", vehicle: "Non bus dan non truk", sumInsuredBand: "0 sampai Rp125.000.000", region: "Wilayah 1: Sumatera dan kepulauannya", cover: "Comprehensive", min: 3.82, max: 4.2 },
  { category: "Kategori 1", vehicle: "Non bus dan non truk", sumInsuredBand: "0 sampai Rp125.000.000", region: "Wilayah 1: Sumatera dan kepulauannya", cover: "Total Loss Only", min: 0.47, max: 0.56 },
  { category: "Kategori 1", vehicle: "Non bus dan non truk", sumInsuredBand: "0 sampai Rp125.000.000", region: "Wilayah 2: DKI Jakarta, Jawa Barat, Banten", cover: "Comprehensive", min: 3.26, max: 3.59 },
  { category: "Kategori 1", vehicle: "Non bus dan non truk", sumInsuredBand: "0 sampai Rp125.000.000", region: "Wilayah 2: DKI Jakarta, Jawa Barat, Banten", cover: "Total Loss Only", min: 0.65, max: 0.78 },
  { category: "Kategori 1", vehicle: "Non bus dan non truk", sumInsuredBand: "0 sampai Rp125.000.000", region: "Wilayah 3: selain Wilayah 1 dan 2", cover: "Comprehensive", min: 2.53, max: 2.78 },
  { category: "Kategori 1", vehicle: "Non bus dan non truk", sumInsuredBand: "0 sampai Rp125.000.000", region: "Wilayah 3: selain Wilayah 1 dan 2", cover: "Total Loss Only", min: 0.51, max: 0.56 },
  { category: "Kategori 2", vehicle: "Non bus dan non truk", sumInsuredBand: "Di atas Rp125.000.000 sampai Rp200.000.000", region: "Wilayah 1: Sumatera dan kepulauannya", cover: "Comprehensive", min: 2.67, max: 2.94 },
  { category: "Kategori 2", vehicle: "Non bus dan non truk", sumInsuredBand: "Di atas Rp125.000.000 sampai Rp200.000.000", region: "Wilayah 1: Sumatera dan kepulauannya", cover: "Total Loss Only", min: 0.63, max: 0.69 },
  { category: "Kategori 2", vehicle: "Non bus dan non truk", sumInsuredBand: "Di atas Rp125.000.000 sampai Rp200.000.000", region: "Wilayah 2: DKI Jakarta, Jawa Barat, Banten", cover: "Comprehensive", min: 2.47, max: 2.72 },
  { category: "Kategori 2", vehicle: "Non bus dan non truk", sumInsuredBand: "Di atas Rp125.000.000 sampai Rp200.000.000", region: "Wilayah 2: DKI Jakarta, Jawa Barat, Banten", cover: "Total Loss Only", min: 0.44, max: 0.53 },
  { category: "Kategori 2", vehicle: "Non bus dan non truk", sumInsuredBand: "Di atas Rp125.000.000 sampai Rp200.000.000", region: "Wilayah 3: selain Wilayah 1 dan 2", cover: "Comprehensive", min: 2.69, max: 2.96 },
  { category: "Kategori 2", vehicle: "Non bus dan non truk", sumInsuredBand: "Di atas Rp125.000.000 sampai Rp200.000.000", region: "Wilayah 3: selain Wilayah 1 dan 2", cover: "Total Loss Only", min: 0.44, max: 0.48 },
  { category: "Kategori 3", vehicle: "Non bus dan non truk", sumInsuredBand: "Di atas Rp200.000.000 sampai Rp400.000.000", region: "Wilayah 1: Sumatera dan kepulauannya", cover: "Comprehensive", min: 2.18, max: 2.4 },
  { category: "Kategori 3", vehicle: "Non bus dan non truk", sumInsuredBand: "Di atas Rp200.000.000 sampai Rp400.000.000", region: "Wilayah 1: Sumatera dan kepulauannya", cover: "Total Loss Only", min: 0.41, max: 0.46 },
  { category: "Kategori 3", vehicle: "Non bus dan non truk", sumInsuredBand: "Di atas Rp200.000.000 sampai Rp400.000.000", region: "Wilayah 2: DKI Jakarta, Jawa Barat, Banten", cover: "Comprehensive", min: 2.08, max: 2.29 },
  { category: "Kategori 3", vehicle: "Non bus dan non truk", sumInsuredBand: "Di atas Rp200.000.000 sampai Rp400.000.000", region: "Wilayah 2: DKI Jakarta, Jawa Barat, Banten", cover: "Total Loss Only", min: 0.38, max: 0.42 },
  { category: "Kategori 3", vehicle: "Non bus dan non truk", sumInsuredBand: "Di atas Rp200.000.000 sampai Rp400.000.000", region: "Wilayah 3: selain Wilayah 1 dan 2", cover: "Comprehensive", min: 1.79, max: 1.97 },
  { category: "Kategori 3", vehicle: "Non bus dan non truk", sumInsuredBand: "Di atas Rp200.000.000 sampai Rp400.000.000", region: "Wilayah 3: selain Wilayah 1 dan 2", cover: "Total Loss Only", min: 0.29, max: 0.35 },
  { category: "Kategori 4", vehicle: "Non bus dan non truk", sumInsuredBand: "Di atas Rp400.000.000 sampai Rp800.000.000", region: "Wilayah 1: Sumatera dan kepulauannya", cover: "Comprehensive", min: 1.2, max: 1.32 },
  { category: "Kategori 4", vehicle: "Non bus dan non truk", sumInsuredBand: "Di atas Rp400.000.000 sampai Rp800.000.000", region: "Wilayah 1: Sumatera dan kepulauannya", cover: "Total Loss Only", min: 0.25, max: 0.3 },
  { category: "Kategori 4", vehicle: "Non bus dan non truk", sumInsuredBand: "Di atas Rp400.000.000 sampai Rp800.000.000", region: "Wilayah 2: DKI Jakarta, Jawa Barat, Banten", cover: "Comprehensive", min: 1.2, max: 1.32 },
  { category: "Kategori 4", vehicle: "Non bus dan non truk", sumInsuredBand: "Di atas Rp400.000.000 sampai Rp800.000.000", region: "Wilayah 2: DKI Jakarta, Jawa Barat, Banten", cover: "Total Loss Only", min: 0.25, max: 0.3 },
  { category: "Kategori 4", vehicle: "Non bus dan non truk", sumInsuredBand: "Di atas Rp400.000.000 sampai Rp800.000.000", region: "Wilayah 3: selain Wilayah 1 dan 2", cover: "Comprehensive", min: 1.14, max: 1.25 },
  { category: "Kategori 4", vehicle: "Non bus dan non truk", sumInsuredBand: "Di atas Rp400.000.000 sampai Rp800.000.000", region: "Wilayah 3: selain Wilayah 1 dan 2", cover: "Total Loss Only", min: 0.23, max: 0.27 },
  { category: "Kategori 5", vehicle: "Non bus dan non truk", sumInsuredBand: "Di atas Rp800.000.000", region: "Wilayah 1: Sumatera dan kepulauannya", cover: "Comprehensive", min: 1.05, max: 1.16 },
  { category: "Kategori 5", vehicle: "Non bus dan non truk", sumInsuredBand: "Di atas Rp800.000.000", region: "Wilayah 1: Sumatera dan kepulauannya", cover: "Total Loss Only", min: 0.2, max: 0.24 },
  { category: "Kategori 5", vehicle: "Non bus dan non truk", sumInsuredBand: "Di atas Rp800.000.000", region: "Wilayah 2: DKI Jakarta, Jawa Barat, Banten", cover: "Comprehensive", min: 1.05, max: 1.16 },
  { category: "Kategori 5", vehicle: "Non bus dan non truk", sumInsuredBand: "Di atas Rp800.000.000", region: "Wilayah 2: DKI Jakarta, Jawa Barat, Banten", cover: "Total Loss Only", min: 0.2, max: 0.24 },
  { category: "Kategori 5", vehicle: "Non bus dan non truk", sumInsuredBand: "Di atas Rp800.000.000", region: "Wilayah 3: selain Wilayah 1 dan 2", cover: "Comprehensive", min: 1.05, max: 1.16 },
  { category: "Kategori 5", vehicle: "Non bus dan non truk", sumInsuredBand: "Di atas Rp800.000.000", region: "Wilayah 3: selain Wilayah 1 dan 2", cover: "Total Loss Only", min: 0.2, max: 0.24 },
  { category: "Kategori 6", vehicle: "Truk dan pickup", sumInsuredBand: "Semua uang pertanggungan", region: "Wilayah 1: Sumatera dan kepulauannya", cover: "Comprehensive", min: 2.42, max: 2.67 },
  { category: "Kategori 6", vehicle: "Truk dan pickup", sumInsuredBand: "Semua uang pertanggungan", region: "Wilayah 1: Sumatera dan kepulauannya", cover: "Total Loss Only", min: 0.88, max: 1.07 },
  { category: "Kategori 6", vehicle: "Truk dan pickup", sumInsuredBand: "Semua uang pertanggungan", region: "Wilayah 2: DKI Jakarta, Jawa Barat, Banten", cover: "Comprehensive", min: 2.39, max: 2.63 },
  { category: "Kategori 6", vehicle: "Truk dan pickup", sumInsuredBand: "Semua uang pertanggungan", region: "Wilayah 2: DKI Jakarta, Jawa Barat, Banten", cover: "Total Loss Only", min: 1.68, max: 2.02 },
  { category: "Kategori 6", vehicle: "Truk dan pickup", sumInsuredBand: "Semua uang pertanggungan", region: "Wilayah 3: selain Wilayah 1 dan 2", cover: "Comprehensive", min: 2.23, max: 2.46 },
  { category: "Kategori 6", vehicle: "Truk dan pickup", sumInsuredBand: "Semua uang pertanggungan", region: "Wilayah 3: selain Wilayah 1 dan 2", cover: "Total Loss Only", min: 0.81, max: 0.98 },
  { category: "Kategori 7", vehicle: "Bus", sumInsuredBand: "Semua uang pertanggungan", region: "Wilayah 1: Sumatera dan kepulauannya", cover: "Comprehensive", min: 1.04, max: 1.14 },
  { category: "Kategori 7", vehicle: "Bus", sumInsuredBand: "Semua uang pertanggungan", region: "Wilayah 1: Sumatera dan kepulauannya", cover: "Total Loss Only", min: 0.23, max: 0.29 },
  { category: "Kategori 7", vehicle: "Bus", sumInsuredBand: "Semua uang pertanggungan", region: "Wilayah 2: DKI Jakarta, Jawa Barat, Banten", cover: "Comprehensive", min: 1.04, max: 1.14 },
  { category: "Kategori 7", vehicle: "Bus", sumInsuredBand: "Semua uang pertanggungan", region: "Wilayah 2: DKI Jakarta, Jawa Barat, Banten", cover: "Total Loss Only", min: 0.23, max: 0.29 },
  { category: "Kategori 7", vehicle: "Bus", sumInsuredBand: "Semua uang pertanggungan", region: "Wilayah 3: selain Wilayah 1 dan 2", cover: "Comprehensive", min: 0.88, max: 0.97 },
  { category: "Kategori 7", vehicle: "Bus", sumInsuredBand: "Semua uang pertanggungan", region: "Wilayah 3: selain Wilayah 1 dan 2", cover: "Total Loss Only", min: 0.18, max: 0.22 },
  { category: "Kategori 8", vehicle: "Roda dua", sumInsuredBand: "Semua uang pertanggungan", region: "Wilayah 1: Sumatera dan kepulauannya", cover: "Comprehensive", min: 3.18, max: 3.5 },
  { category: "Kategori 8", vehicle: "Roda dua", sumInsuredBand: "Semua uang pertanggungan", region: "Wilayah 1: Sumatera dan kepulauannya", cover: "Total Loss Only", min: 1.76, max: 2.11 },
  { category: "Kategori 8", vehicle: "Roda dua", sumInsuredBand: "Semua uang pertanggungan", region: "Wilayah 2: DKI Jakarta, Jawa Barat, Banten", cover: "Comprehensive", min: 3.18, max: 3.5 },
  { category: "Kategori 8", vehicle: "Roda dua", sumInsuredBand: "Semua uang pertanggungan", region: "Wilayah 2: DKI Jakarta, Jawa Barat, Banten", cover: "Total Loss Only", min: 1.8, max: 2.16 },
  { category: "Kategori 8", vehicle: "Roda dua", sumInsuredBand: "Semua uang pertanggungan", region: "Wilayah 3: selain Wilayah 1 dan 2", cover: "Comprehensive", min: 3.18, max: 3.5 },
  { category: "Kategori 8", vehicle: "Roda dua", sumInsuredBand: "Semua uang pertanggungan", region: "Wilayah 3: selain Wilayah 1 dan 2", cover: "Total Loss Only", min: 0.67, max: 0.8 },
]

export interface MotorExtensionTariff {
  cover: string
  basis: string
  /** Kosong untuk jaminan berbasis limit, yang berlaku di Comprehensive maupun TLO. */
  policyType: string
  /** persen, null bila tarifnya ditentukan underwriter */
  min: number | null
  max: number | null
  note: string
}

export const MOTOR_EXTENSION_TARIFFS: MotorExtensionTariff[] = [
  { cover: "Banjir termasuk angin topan", policyType: "Comprehensive", basis: "Uang pertanggungan", min: 0.075, max: 0.125, note: "Merujuk Lampiran II Tabel II.B, tergantung wilayah" },
  { cover: "Banjir termasuk angin topan", policyType: "Total Loss Only", basis: "Uang pertanggungan", min: 0.05, max: 0.1, note: "Merujuk Lampiran II Tabel II.B, tergantung wilayah" },
  { cover: "Gempa bumi dan tsunami", policyType: "Comprehensive", basis: "Uang pertanggungan", min: 0.075, max: 0.135, note: "Lampiran III Tabel III.E, tergantung wilayah" },
  { cover: "Gempa bumi dan tsunami", policyType: "Total Loss Only", basis: "Uang pertanggungan", min: 0.05, max: 0.11, note: "Lampiran III Tabel III.E, tergantung wilayah" },
  { cover: "Huru-hara dan kerusuhan (SRCC)", policyType: "Comprehensive", basis: "Uang pertanggungan", min: 0.05, max: 0.05, note: "" },
  { cover: "Huru-hara dan kerusuhan (SRCC)", policyType: "Total Loss Only", basis: "Uang pertanggungan", min: 0.035, max: 0.035, note: "" },
  { cover: "Terorisme dan sabotase", policyType: "Comprehensive", basis: "Uang pertanggungan", min: 0.05, max: 0.05, note: "" },
  { cover: "Terorisme dan sabotase", policyType: "Total Loss Only", basis: "Uang pertanggungan", min: 0.035, max: 0.035, note: "" },
  { cover: "TJH pihak ketiga, kendaraan penumpang dan sepeda motor", policyType: "", basis: "Limit sampai Rp25 juta", min: 1.0, max: 1.0, note: "Dihitung progresif per lapisan" },
  { cover: "TJH pihak ketiga, kendaraan penumpang dan sepeda motor", policyType: "", basis: "Limit di atas Rp25 juta sampai Rp50 juta", min: 0.5, max: 0.5, note: "Dihitung progresif per lapisan" },
  { cover: "TJH pihak ketiga, kendaraan penumpang dan sepeda motor", policyType: "", basis: "Limit di atas Rp50 juta sampai Rp100 juta", min: 0.25, max: 0.25, note: "Dihitung progresif per lapisan" },
  { cover: "TJH pihak ketiga, kendaraan penumpang dan sepeda motor", policyType: "", basis: "Limit di atas Rp100 juta", min: null, max: null, note: "Ditentukan underwriter" },
  { cover: "TJH pihak ketiga, kendaraan niaga, truk, dan bus", policyType: "", basis: "Limit sampai Rp25 juta", min: 1.5, max: 1.5, note: "Dihitung progresif per lapisan" },
  { cover: "TJH pihak ketiga, kendaraan niaga, truk, dan bus", policyType: "", basis: "Limit di atas Rp25 juta sampai Rp50 juta", min: 0.75, max: 0.75, note: "Dihitung progresif per lapisan" },
  { cover: "TJH pihak ketiga, kendaraan niaga, truk, dan bus", policyType: "", basis: "Limit di atas Rp50 juta sampai Rp100 juta", min: 0.375, max: 0.375, note: "Dihitung progresif per lapisan" },
  { cover: "TJH pihak ketiga, kendaraan niaga, truk, dan bus", policyType: "", basis: "Limit di atas Rp100 juta", min: null, max: null, note: "Ditentukan underwriter" },
  { cover: "Kecelakaan diri pengemudi", policyType: "", basis: "Uang pertanggungan kecelakaan diri", min: 0.5, max: 0.5, note: "" },
  { cover: "Kecelakaan diri penumpang", policyType: "", basis: "Uang pertanggungan per tempat duduk", min: 0.1, max: 0.1, note: "" },
  { cover: "TJH terhadap penumpang", policyType: "", basis: "Limit sampai Rp25 juta", min: 0.5, max: 0.5, note: "Dihitung progresif per lapisan" },
  { cover: "TJH terhadap penumpang", policyType: "", basis: "Limit di atas Rp25 juta sampai Rp50 juta", min: 0.25, max: 0.25, note: "Dihitung progresif per lapisan" },
  { cover: "TJH terhadap penumpang", policyType: "", basis: "Limit di atas Rp50 juta sampai Rp100 juta", min: 0.125, max: 0.125, note: "Dihitung progresif per lapisan" },
  { cover: "TJH terhadap penumpang", policyType: "", basis: "Limit di atas Rp100 juta", min: null, max: null, note: "Ditentukan underwriter" },
]

export const MOTOR_REGIONS = [
  "Wilayah 1: Sumatera dan kepulauannya",
  "Wilayah 2: DKI Jakarta, Jawa Barat, Banten",
  "Wilayah 3: selain Wilayah 1 dan 2",
] as const

const MOTOR_REGION_1 = [
  "Aceh", "Sumatera Utara", "Sumatra Utara", "Sumatera Barat", "Sumatra Barat",
  "Riau", "Kepulauan Riau", "Jambi", "Bengkulu", "Sumatera Selatan",
  "Sumatra Selatan", "Lampung", "Bangka", "Belitung", "Medan", "Palembang",
  "Pekanbaru", "Batam", "Padang", "Bandar Lampung",
]
const MOTOR_REGION_2 = [
  "Dki Jakarta", "Jakarta", "Jawa Barat", "Banten", "Bandung", "Bekasi",
  "Bogor", "Depok", "Tangerang", "Serang", "Cilegon", "Karawang", "Cikarang",
]

const PLATES_REGION_1 = new Set([
  "BA", "BB", "BD", "BE", "BG", "BH", "BK", "BL", "BM", "BN", "BP",
])
const PLATES_REGION_2 = new Set(["A", "B", "D", "E", "F", "T", "Z"])

export function matchMotorRegion(locationOrPlate: string): string | null {
  const text = (locationOrPlate || "").trim()
  if (!text) return null

  const plateMatch = text.toUpperCase().match(/\b([A-Z]{1,2})\s*\d{1,4}\b/)
  if (plateMatch) {
    const code = plateMatch[1]
    if (PLATES_REGION_2.has(code)) return MOTOR_REGIONS[1]
    if (PLATES_REGION_1.has(code)) return MOTOR_REGIONS[0]
    return MOTOR_REGIONS[2]
  }

  const hay = text.toLowerCase()
  if (MOTOR_REGION_2.some((k) => hay.includes(k.toLowerCase()))) {
    return MOTOR_REGIONS[1]
  }
  if (MOTOR_REGION_1.some((k) => hay.includes(k.toLowerCase()))) {
    return MOTOR_REGIONS[0]
  }
  return MOTOR_REGIONS[2]
}

export function resolveMotorTsiBand(tsi: number): string {
  if (tsi <= 125_000_000) return "0 sampai Rp125.000.000"
  if (tsi <= 200_000_000) return "Di atas Rp125.000.000 sampai Rp200.000.000"
  if (tsi <= 400_000_000) return "Di atas Rp200.000.000 sampai Rp400.000.000"
  if (tsi <= 800_000_000) return "Di atas Rp400.000.000 sampai Rp800.000.000"
  return "Di atas Rp800.000.000"
}

export function detectVehicleCategory(desc: string, tsi: number): string {
  const hay = (desc || "").toLowerCase()
  if (
    hay.includes("roda dua") ||
    hay.includes("motorcycle") ||
    hay.includes("motor cycle") ||
    hay.includes("sepeda motor") ||
    hay.includes("scooter") ||
    hay.includes("vespa") ||
    hay.includes("vario") ||
    hay.includes("beat") ||
    hay.includes("nmax") ||
    hay.includes("pcx") ||
    hay.includes("aerox") ||
    hay.includes("mio")
  ) {
    return "Kategori 8"
  }
  if (hay.includes("bus") || hay.includes("microbus")) {
    return "Kategori 7"
  }
  if (
    hay.includes("truk") ||
    hay.includes("truck") ||
    hay.includes("pickup") ||
    hay.includes("pick up") ||
    hay.includes("box") ||
    hay.includes("derek") ||
    hay.includes("tangki") ||
    hay.includes("trailer")
  ) {
    return "Kategori 6"
  }

  if (tsi <= 125_000_000) return "Kategori 1"
  if (tsi <= 200_000_000) return "Kategori 2"
  if (tsi <= 400_000_000) return "Kategori 3"
  if (tsi <= 800_000_000) return "Kategori 4"
  return "Kategori 5"
}

export function findMotorTariffBounds(params: {
  category?: string
  vehicleDesc?: string
  tsi: number
  locationOrPlate: string
  coverType?: string
}): { min: number; max: number; source: string } | null {
  const { tsi, vehicleDesc = "", locationOrPlate, coverType = "" } = params
  const category = params.category || detectVehicleCategory(vehicleDesc, tsi)
  const isComprehensive =
    coverType.toLowerCase().includes("comprehensive") ||
    coverType.toLowerCase().includes("all risk") ||
    coverType.toLowerCase().includes("casco") ||
    !coverType.toLowerCase().includes("total loss")
  const coverKey = isComprehensive ? "Comprehensive" : "Total Loss Only"
  const region = matchMotorRegion(locationOrPlate) ?? MOTOR_REGIONS[1]

  const band =
    category === "Kategori 6" ||
    category === "Kategori 7" ||
    category === "Kategori 8"
      ? "Semua uang pertanggungan"
      : resolveMotorTsiBand(tsi)

  const match = MOTOR_TARIFFS.find(
    (t) =>
      t.category === category &&
      t.region === region &&
      t.cover === coverKey &&
      t.sumInsuredBand === band
  )

  if (!match) return null

  const regionShort = region.startsWith("Wilayah 1")
    ? "Wilayah 1"
    : region.startsWith("Wilayah 2")
      ? "Wilayah 2"
      : "Wilayah 3"

  return {
    min: match.min,
    max: match.max,
    source: `${match.category} ${regionShort} ${match.cover}`,
  }
}

export function findMotorExtensionBounds(
  extensionLabel: string,
  coverType: string = "Comprehensive"
): { min: number; max: number; source: string } | null {
  const hay = extensionLabel.toLowerCase()
  const isComprehensive =
    !coverType.toLowerCase().includes("total loss") &&
    !coverType.toLowerCase().includes("tlo")
  const policyType = isComprehensive ? "Comprehensive" : "Total Loss Only"

  if (
    hay.includes("banjir") ||
    hay.includes("flood") ||
    hay.includes("windstorm") ||
    hay.includes("fwtwd")
  ) {
    const entry = MOTOR_EXTENSION_TARIFFS.find(
      (e) => e.cover.startsWith("Banjir") && e.policyType === policyType
    )
    if (entry && entry.min != null && entry.max != null) {
      return {
        min: entry.min,
        max: entry.max,
        source: `Perluasan Banjir KBM ${policyType}`,
      }
    }
  }

  if (
    hay.includes("gempa") ||
    hay.includes("earthquake") ||
    hay.includes("tsunami") ||
    hay.includes("eqvet")
  ) {
    const entry = MOTOR_EXTENSION_TARIFFS.find(
      (e) => e.cover.startsWith("Gempa") && e.policyType === policyType
    )
    if (entry && entry.min != null && entry.max != null) {
      return {
        min: entry.min,
        max: entry.max,
        source: `Perluasan Gempa KBM ${policyType}`,
      }
    }
  }

  if (
    hay.includes("srcc") ||
    hay.includes("huru-hara") ||
    hay.includes("kerusuhan") ||
    hay.includes("riot") ||
    hay.includes("strike")
  ) {
    const entry = MOTOR_EXTENSION_TARIFFS.find(
      (e) => e.cover.startsWith("Huru-hara") && e.policyType === policyType
    )
    if (entry && entry.min != null && entry.max != null) {
      return {
        min: entry.min,
        max: entry.max,
        source: `Perluasan SRCC KBM ${policyType}`,
      }
    }
  }

  if (
    hay.includes("terorisme") ||
    hay.includes("sabotase") ||
    hay.includes("terrorism") ||
    hay.includes("sabotage")
  ) {
    const entry = MOTOR_EXTENSION_TARIFFS.find(
      (e) => e.cover.startsWith("Terorisme") && e.policyType === policyType
    )
    if (entry && entry.min != null && entry.max != null) {
      return {
        min: entry.min,
        max: entry.max,
        source: `Perluasan Terorisme KBM ${policyType}`,
      }
    }
  }

  if (
    hay.includes("third party") ||
    hay.includes("tpl") ||
    hay.includes("tjh") ||
    hay.includes("tanggung jawab hukum")
  ) {
    return {
      min: 0.25,
      max: 1.0,
      source: "TJH Pihak Ketiga OJK (0.25% - 1.00%)",
    }
  }

  if (
    hay.includes("pengemudi") ||
    hay.includes("driver") ||
    hay.includes("pa pengemudi") ||
    hay.includes("pa driver")
  ) {
    const entry = MOTOR_EXTENSION_TARIFFS.find((e) =>
      e.cover.startsWith("Kecelakaan diri pengemudi")
    )
    return {
      min: entry?.min ?? 0.5,
      max: entry?.max ?? 0.5,
      source: "PA Pengemudi KBM (0.50%)",
    }
  }

  if (
    hay.includes("penumpang") ||
    hay.includes("passenger") ||
    hay.includes("pa penumpang") ||
    hay.includes("pa passenger")
  ) {
    const entry = MOTOR_EXTENSION_TARIFFS.find((e) =>
      e.cover.startsWith("Kecelakaan diri penumpang")
    )
    return {
      min: entry?.min ?? 0.1,
      max: entry?.max ?? 0.1,
      source: "PA Penumpang KBM (0.10%)",
    }
  }

  return null
}

export interface ParsedVehicleInfo {
  licensePlate?: string | null
  chassisNumber?: string | null
  engineNumber?: string | null
  year?: string | null
  color?: string | null
  vehicleModel?: string | null
}

export function parseVehicleDescription(desc?: string | null): ParsedVehicleInfo {
  if (!desc) return {}
  const res: ParsedVehicleInfo = {}
  const term =
    "(?=\\s*[·|,]\\s*|\\s*/\\s*(?:[A-Za-z\\s.]+:)|\\s*(?:PLAT|Plat|YEARS?|Thn|Tahun|No\\.?\\s*Rangka|Rangka|No\\.?\\s*Mesin|Mesin|Warna|Color|TYPE|Type|Model|Jenis)\\s*[:=]|$)"

  const plateMatch = desc.match(
    new RegExp(
      `(?:PLAT\\s*NO\\.?|No\\.?\\s*Pol(?:isi)?|Plat)\\s*[:=]\\s*([A-Za-z0-9\\s]+?)${term}`,
      "i"
    )
  )
  if (plateMatch) res.licensePlate = plateMatch[1].trim()

  const yearMatch = desc.match(/(?:YEARS?|Tahun|Thn)\s*[:=]?\s*(\d{4})/i)
  if (yearMatch) res.year = yearMatch[1]

  const chassisMatch = desc.match(
    new RegExp(
      `(?:No\\.?\\s*Rangka|Rangka|Chassis|VIN)\\s*[:=]\\s*([A-Za-z0-9]+)${term}`,
      "i"
    )
  )
  if (chassisMatch) res.chassisNumber = chassisMatch[1].trim()

  const engineMatch = desc.match(
    new RegExp(
      `(?:No\\.?\\s*Mesin|Mesin|Engine)\\s*[:=]\\s*([A-Za-z0-9-]+)${term}`,
      "i"
    )
  )
  if (engineMatch) res.engineNumber = engineMatch[1].trim()

  const colorMatch = desc.match(
    new RegExp(`(?:Warna|Color)\\s*[:=]\\s*([^·|,]+?)${term}`, "i")
  )
  if (colorMatch) res.color = colorMatch[1].trim()

  const modelMatch = desc.match(
    new RegExp(`(?:TYPE|Type|Model|Jenis)\\s*[:=]\\s*([^·|,]+?)${term}`, "i")
  )
  if (modelMatch) res.vehicleModel = modelMatch[1].trim()

  return res
}

export function buildVehicleDescription(item: {
  vehicleModel?: string | null
  year?: number | string | null
  licensePlate?: string | null
  chassisNumber?: string | null
  engineNumber?: string | null
  color?: string | null
  description?: string
}): string {
  const parts: string[] = []
  if (item.vehicleModel?.trim()) parts.push(`Model: ${item.vehicleModel.trim()}`)
  if (item.year) parts.push(`Thn: ${item.year}`)
  if (item.licensePlate?.trim()) parts.push(`Plat: ${item.licensePlate.trim().toUpperCase()}`)
  if (item.chassisNumber?.trim()) parts.push(`Rangka: ${item.chassisNumber.trim()}`)
  if (item.engineNumber?.trim()) parts.push(`Mesin: ${item.engineNumber.trim()}`)
  if (item.color?.trim()) parts.push(`Warna: ${item.color.trim()}`)

  if (parts.length === 0 && item.description?.trim()) {
    return item.description.trim()
  }

  return parts.join(" · ")
}

