import type { ClassOfBusiness, Sppa } from "./types"

/**
 * Pertanyaan tambahan SPPA per COB. Masih usulan sampai contoh form SPPA LCH
 * (Kebakaran, IAR, Gempa Bumi, Kecelakaan Diri, Kendaraan Bermotor) dipetakan.
 */
export const SPPA_QUESTIONS: Partial<
  Record<
    ClassOfBusiness,
    {
      key: string
      label: string
      placeholder?: string
      digitsOnly?: boolean
      numericOnly?: boolean
    }[]
  >
> = {
  Property: [
    {
      key: "construction",
      label: "Konstruksi bangunan",
      placeholder: "Beton bertulang, atap baja ringan",
    },
    {
      key: "floors",
      label: "Jumlah lantai",
      placeholder: "4",
      digitsOnly: true,
    },
    {
      key: "protection",
      label: "Proteksi kebakaran",
      placeholder: "Hydrant, sprinkler, APAR",
    },
    {
      key: "lossHistory",
      label: "Riwayat kerugian 3 tahun terakhir",
      placeholder: "Tidak ada",
    },
  ],
  "Motor Vehicle": [
    {
      key: "vehicle",
      label: "Merk, tipe, dan tahun",
      placeholder: "Toyota Innova Zenix 2023",
    },
    { key: "plate", label: "Nomor polisi", placeholder: "B 1234 XYZ" },
    { key: "chassis", label: "Nomor rangka dan mesin" },
    { key: "usage", label: "Penggunaan", placeholder: "Pribadi" },
  ],
  "Marine Cargo": [
    { key: "goods", label: "Jenis barang", placeholder: "Suku cadang mesin" },
    {
      key: "voyage",
      label: "Rute pengiriman",
      placeholder: "Surabaya ke Makassar",
    },
    { key: "conveyance", label: "Alat angkut", placeholder: "Kapal kontainer" },
    { key: "packing", label: "Pengepakan", placeholder: "Kontainer 20 ft" },
  ],
  "Personal Accident": [
    {
      key: "insuredPersons",
      label: "Jumlah tertanggung",
      placeholder: "120",
      digitsOnly: true,
    },
    {
      key: "occupationClass",
      label: "Kelas pekerjaan",
      placeholder: "Kelas 1, pekerja kantor",
    },
    {
      key: "benefit",
      label: "Manfaat per orang",
      placeholder: "Meninggal dunia IDR 100 juta",
    },
  ],
  Engineering: [
    { key: "project", label: "Nama dan nilai proyek" },
    { key: "contractor", label: "Kontraktor utama" },
    { key: "duration", label: "Masa konstruksi", placeholder: "18 bulan" },
  ],
}

export const SPPA: Sppa[] = [
  {
    id: "sp-001",
    clientId: "c-012",
    cob: "Property",
    typeOfCover: "Property All Risks (PAR)",
    insuredName: "PT Delta Manufaktur Indonesia",
    riskLocation: "Kawasan Industri Jababeka II Blok C-7, Kab. Bekasi",
    occupation: "2142 - Factories with other kiln Glass works, Glass",
    currency: "IDR",
    sumInsured: 86_500_000_000,
    periodStart: "2026-10-01",
    periodEnd: "2027-10-01",
    answers: {
      construction: "Beton bertulang, atap baja ringan",
      floors: "2",
      protection: "Hydrant, sprinkler, APAR, detektor asap",
      lossHistory: "Tidak ada",
    },
    status: "Submitted",
    createdAt: "2026-08-26",
    updatedAt: "2026-08-28",
  },
  {
    id: "sp-002",
    clientId: "c-005",
    cob: "Motor Vehicle",
    typeOfCover: "Comprehensive Casco + Perluasan",
    insuredName: "Mr. Harry Mulyono",
    riskLocation: "Jl. Nanas No. 25, Jakarta Selatan 12440",
    currency: "IDR",
    sumInsured: 585_000_000,
    periodStart: "2026-09-21",
    periodEnd: "2027-09-21",
    answers: {
      vehicle: "Toyota Innova Zenix Hybrid 2023",
      plate: "B 1872 HMY",
      usage: "Pribadi",
    },
    status: "Draft",
    createdAt: "2026-09-03",
    updatedAt: "2026-09-03",
  },
  {
    id: "sp-003",
    clientId: "c-007",
    cob: "Marine Cargo",
    typeOfCover: "Marine Cargo — Institute Cargo Clauses (A)",
    insuredName: "PT Bahtera Samudra Line",
    riskLocation: "Pelabuhan Tanjung Perak, Kota Surabaya",
    currency: "USD",
    sumInsured: 1_250_000,
    periodStart: "2026-09-15",
    periodEnd: "2027-09-15",
    answers: {
      goods: "Suku cadang alat berat",
      voyage: "Surabaya ke Balikpapan",
      conveyance: "Kapal kontainer",
      packing: "Kontainer 40 ft",
    },
    status: "Submitted",
    createdAt: "2026-09-05",
    updatedAt: "2026-09-08",
  },
]
