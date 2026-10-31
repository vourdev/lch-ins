/** Nama COB yang dipakai data contoh dan logika khusus (Property, Motor Vehicle). */
export type KnownClassOfBusiness =
  | "Property"
  | "Motor Vehicle"
  | "Marine Cargo"
  | "Engineering"
  | "Liability"
  | "Personal Accident"
  | "Surety Bond"
  | "Terrorism"

/**
 * Class of business. Daftar pilihannya dari master data, jadi COB baru yang
 * ditambah LCH juga sah; tipe ini tetap menyarankan nama yang dikenal.
 */
export type ClassOfBusiness = KnownClassOfBusiness | (string & {})

/** Cancelled dipakai untuk slip bernomor yang dibatalkan, supaya nomor tidak bolong. */
export type SlipStatus =
  "Draft" | "Released" | "Quoted" | "Closed" | "Cancelled"
/** Dihitung dari tanggal berakhir polis, tidak disimpan (PRD A-17). */
export type PolicyStatus = "Active" | "Expiring" | "Expired"
export type PolicyType = "Baru" | "Renewal" | "Endorsement" | "Cancellation"
/** Sesuai daftar status klaim di ERD (lookup claim_status). */
/** Status siklus hidup klaim. Tahapan dokumennya dicatat terpisah di ClaimStage. */
export type ClaimStatus = "Outstanding" | "Settled" | "Closed" | "Rejected"

/** Tahapan dokumen dan proses klaim, berjalan sendiri di samping status. */
export type ClaimStage =
  | "Tunggu Dokumen"
  | "Dokumen Belum Lengkap"
  | "Dokumen Lengkap"
  | "Proses Adjuster"
  | "SPK / SPGR terbit"
export type ClientStatus = "Active" | "Prospect" | "Inactive"
export type ClientType = "Korporasi" | "Perorangan"

/** Satu klien bisa punya beberapa alamat, misalnya alamat perusahaan dan korespondensi. */
export interface ClientAddress {
  id: string
  /** Jenis alamat dari daftar pilihan address_type. */
  label: string
  value: string
  phone?: string
  isPrimary?: boolean
}

/** Berkas KYC yang diupload, misalnya copy KTP atau NPWP. */
export interface ClientDocument {
  id: string
  type: string
  fileName: string
  uploadedAt: string
  /**
   * Alamat untuk membuka isi berkas dari server. Kosong untuk data contoh dan
   * berkas dari masa prototipe yang isinya tidak pernah terunggah.
   */
  url?: string
  /** Id isi berkas yang baru diunggah dari form, belum tertaut ke klien. */
  fileId?: string
}

/** Data klien mengikuti form KYC LCH (ERD tabel clients). */
export interface Client {
  id: string
  clientType: ClientType
  /** Nama lengkap (perorangan) atau nama perusahaan (korporasi). */
  name: string
  npwp: string
  /** Perorangan: jenis dan nomor identitas tertanggung. */
  idType?: string
  idNumber?: string
  birthPlace?: string
  birthDate?: string
  /** Korporasi: PIC perusahaan beserta nomor KTP-nya. */
  contactPerson: string
  contactPersonIdNumber?: string
  email: string
  phone: string
  incomeSource?: string
  insurancePurpose?: string
  insurancePurposeNote?: string
  kycDate?: string
  cob: ClassOfBusiness
  status: ClientStatus
  addresses: ClientAddress[]
  documents: ClientDocument[]
  notes?: string
  createdAt: string
}

export type SppaStatus = "Draft" | "Submitted"

/** Surat Permintaan Penutupan Asuransi yang diisi Marketing per klien (PRD A-07). */
export interface Sppa {
  id: string
  clientId: string
  cob: ClassOfBusiness
  typeOfCover: string
  insuredName: string
  riskLocation: string
  occupation?: string
  currency: string
  sumInsured: number
  periodStart: string | null
  periodEnd: string | null
  /** Isian khusus per COB, disimpan sebagai jsonb sampai form SPPA LCH final. */
  answers: Record<string, string>
  /** Motor Vehicle: merek dan tipe dari master data. Nama hanya untuk tampilan. */
  vehicleBrandId?: string | null
  vehicleTypeId?: string | null
  vehicleBrandName?: string | null
  vehicleTypeName?: string | null
  status: SppaStatus
  createdAt: string
  updatedAt: string
}

export interface VehicleTypeOption {
  id: string
  name: string
  isActive: boolean
}

export interface VehicleBrandOption {
  id: string
  name: string
  isActive: boolean
  types: VehicleTypeOption[]
}

export interface LineItem {
  id: string
  description: string
  amount: number
  /** Baris Interest slip Motor Vehicle: merek dan tipe dari master data. */
  vehicleBrandId?: string | null
  vehicleTypeId?: string | null
  vehicleBrandName?: string | null
  vehicleTypeName?: string | null
  /** Rincian terstruktur kendaraan bermotor (SE OJK KBM) */
  licensePlate?: string | null
  chassisNumber?: string | null
  engineNumber?: string | null
  year?: number | string | null
  color?: string | null
  vehicleModel?: string | null
}

export interface RateLine {
  id: string
  label: string
  rate: number | null
  premium: number
  basis?: string
  /** Batas bawah dan atas tarif OJK yang berlaku saat rate diisi. */
  min?: number | null
  max?: number | null
  boundSource?: string
  /** Deductible untuk cover ini, teks bebas. */
  deductible?: string
}

export const RATE_EXCEPTION_REASONS = [
  "Potongan sesuai nilai pertanggungan",
  "Perluasan jaminan",
] as const
export type RateExceptionReason = (typeof RATE_EXCEPTION_REASONS)[number]

/** Alasan rate di luar batas OJK, wajib dicatat sebelum release (PRD A-11). */
export interface RateException {
  reason: RateExceptionReason
  note: string
}

export interface SecurityPanelRow {
  id: string
  insurer: string
  share: number
  role: "As Leader" | "As Member"
}

export interface PlacingSlip {
  id: string
  slipNo: string | null
  seq: number
  cob: ClassOfBusiness
  typeOfCover: string
  coverCode: string | null
  /** Klien asal tertanggung. Null bila nama diketik manual (data lama). */
  clientId: string | null
  /** SPPA sumber data slip, bila slip dibuat dari SPPA. */
  sppaId?: string | null
  /** Disalin dari klien saat dipilih, jadi perubahan data klien tidak mengubah slip. */
  insuredName: string
  correspondenceAddress: string
  currency: string
  status: SlipStatus
  periodTba: boolean
  inceptionDate: string | null
  expiryDate: string | null
  occupation?: string
  riskLocation?: string
  wordingForms: string[]
  coverage?: string
  constructionClass?: string
  indemnityPeriod?: string
  interestSection1?: string
  interestSection2?: string
  interestItems: LineItem[]
  sumInsuredSection1: LineItem[]
  sumInsuredSection2: LineItem[]
  deductiblesSection1: string[]
  deductiblesSection2: string[]
  specialConditions?: string
  clauseIds: string[]
  /**
   * Judul dan wording klausula yang diedit khusus slip ini, dikunci per id
   * klausula. Master clause tidak ikut berubah.
   */
  clauseOverrides?: Record<string, ClauseOverride>
  /**
   * Salinan judul dan wording setiap clause saat dipilih (tabel slip_clauses).
   * Dokumen cetak memakai salinan ini, jadi perubahan master clause sesudahnya
   * tidak mengubah slip yang sudah ada.
   */
  clauseCopies?: Record<string, ClauseOverride>
  rateLines: RateLine[]
  tplLines: RateLine[]
  paLines: RateLine[]
  /** Alasan per id baris rate yang berada di luar batas OJK. */
  rateExceptions?: Record<string, RateException>
  discountPct: number
  adminCost: number
  stampDuty: number
  brokeragePct: number
  includeVat: boolean
  createdAt: string
  updatedAt: string
  /* pasca-release */
  subjectivity?: string
  securityPanel?: SecurityPanelRow[]
  closingInstruction?: string
  coverNoteRemarks?: string
}

/** Softcopy polis. Versi naik setiap upload, file lama tetap tersimpan. */
export interface PolicyFile {
  id: string
  version: number
  fileName: string
  uploadedAt: string
  /** Object URL selama sesi prototipe. */
  url?: string
}

export interface Policy {
  id: string
  policyNo: string
  clientId: string | null
  placingSlipId: string | null
  placingSlipNo?: string | null
  /** Polis induk untuk renewal, endorsement, dan pembatalan. */
  parentPolicyId: string | null
  insuredName: string
  /** Asuransi leader. Pembagian share lengkap ada di `insurers`. */
  insurer: string
  insurers: SecurityPanelRow[]
  cob: ClassOfBusiness
  typeOfCover?: string
  inceptionDate: string
  expiryDate: string
  currency: string
  sumInsured: number
  /** Tambahan premi positif, pengembalian premi negatif (endorsement dan pembatalan). */
  premium: number
  brokeragePct: number
  type: PolicyType
  riskLocation: string
  /** Nomor urut endorsement pada polis induk, ditentukan server. */
  endorsementSeq?: number | null
  cobOjkClassId?: string | null
  placementLocationId?: string | null
  groupingInsured?: string
  files: PolicyFile[]
}

export interface Claim {
  id: string
  claimNo: string
  policyId: string | null
  policyNo: string
  insuredName: string
  insurer: string
  cob: ClassOfBusiness
  currency: string
  lossDate: string
  reportedDate: string | null
  documentCompleteDate: string | null
  spkDate: string | null
  location: string
  lossDescription: string
  assetDescription: string
  estimatedLoss: number
  claimedAmount: number
  paidAmount: number
  adjuster: string
  status: ClaimStatus
  stage: ClaimStage
  notes?: string
}

export interface Clause {
  id: string
  title: string
  cob: ClassOfBusiness | "All"
  typeOfCover: string | null
  wording: string
}

/** Isi klausula yang dipakai satu slip saja, menimpa master untuk slip itu. */
export interface ClauseOverride {
  title: string
  /** HTML hasil rich text editor, disanitasi sebelum dirender. */
  wording: string
}
