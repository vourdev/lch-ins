/**
 * Pilihan dropdown form yang diambil dari master data.
 *
 * Datanya dimuat di server (`lib/server/form-options.ts`) lalu dibagikan ke
 * form lewat `FormOptionsProvider`, supaya isian yang ditambah atau
 * dinonaktifkan di Master Data langsung berlaku tanpa ubah kode. File ini
 * hanya berisi tipe dan helper, jadi aman dipakai di client maupun server.
 */

export interface CoverOption {
  id: string
  /** Kode 4 digit dari master, contoh 0109. */
  code: string
  name: string
  /** Token {COVER} di nomor slip, contoh PAR. Kosong berarti tanpa segmen cover. */
  abbreviation: string | null
}

export interface CobOption {
  id: string
  code: string
  /** Nama tampilan, hasil `normalizeCob` dari nama di master. */
  label: string
  covers: CoverOption[]
}

export interface NamedOption {
  id: string
  name: string
}

export interface CurrencyOption {
  code: string
  name: string
}

/** Jenis lookup yang dipakai sebagai pilihan di form klien. */
export const FORM_LOOKUP_TYPES = [
  "id_type",
  "income_source",
  "insurance_purpose",
  "address_type",
  "client_document_type",
] as const

export type FormLookupType = (typeof FORM_LOOKUP_TYPES)[number]

export interface FormOptions {
  cobs: CobOption[]
  insurers: NamedOption[]
  currencies: CurrencyOption[]
  wordingForms: NamedOption[]
  /** Nama nilai lookup per jenis, sudah urut sesuai sort order di master. */
  lookups: Record<FormLookupType, string[]>
}

export const EMPTY_FORM_OPTIONS: FormOptions = {
  cobs: [],
  insurers: [],
  currencies: [],
  wordingForms: [],
  lookups: {
    id_type: [],
    income_source: [],
    insurance_purpose: [],
    address_type: [],
    client_document_type: [],
  },
}

/**
 * Daftar pilihan ditambah nilai yang sedang tersimpan bila nilai itu sudah
 * tidak ada di master (dinonaktifkan atau data lama). Tanpa ini, membuka
 * data lama untuk diedit akan mengosongkan isiannya.
 */
export function withCurrent(values: string[], current?: string | null) {
  if (!current || values.includes(current)) return values
  return [current, ...values]
}

export function cobLabels(options: FormOptions) {
  return options.cobs.map((c) => c.label)
}

export function coversFor(options: FormOptions, cob: string): CoverOption[] {
  return options.cobs.find((c) => c.label === cob)?.covers ?? []
}

/** Singkatan cover dari master untuk nomor slip, atau null bila tidak ada. */
export function coverAbbreviation(
  options: FormOptions,
  cob: string,
  typeOfCover: string
) {
  const cover = coversFor(options, cob).find((c) => c.name === typeOfCover)
  return cover?.abbreviation || null
}
