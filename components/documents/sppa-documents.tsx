import { Check } from "lucide-react"

import { DocumentShell } from "@/components/documents/document-shell"
import {
  DocTitle,
  InfoTable,
  SectionHeading,
} from "@/components/documents/doc-blocks"
import {
  LCH_ADDRESS,
  LchLogo,
  Letterhead,
} from "@/components/documents/letterhead"
import { PrintedAt } from "@/components/documents/printed-at"
import { SPPA_QUESTIONS, type Client, type Sppa } from "@/lib/data"
import { dateLong, money } from "@/lib/format"
import { cn } from "@/lib/utils"

/* Warna mengikuti form KYC cetak LCH, jadi sengaja tidak ikut tema aplikasi. */
const KYC_NAVY = "#29166f"

const PURPOSE_OPTIONS = [
  {
    value: "Perlindungan aset",
    label: "Perlindungan terhadap harta kekayaan / Aset Perusahaan",
    en: "Protection of Property / Company's Asset",
  },
  {
    value: "Persyaratan pemberi kredit",
    label:
      "Memenuhi Persyaratan / Perjanjian Pemberi Kredit (Bank, Leasing, dll)",
    en: "Fulfill of Credit Requirements / Agreement (Bank, Leasing, etc)",
  },
  { value: "Lain-lain", label: "Lain-lain", en: "Others" },
]

const INCOME_OPTIONS = [
  { value: "Hasil usaha", label: "Hasil Usaha", en: "Business Income" },
  { value: "Gaji bulanan", label: "Gaji Bulanan", en: "Monthly Salary" },
  { value: "Wirausaha", label: "Wirausaha", en: "Self-employed" },
  { value: "Lain-lain", label: "Lain-lain", en: "Others" },
]

/** Data KYC yang dibutuhkan form; klien yang sudah dihapus hanya punya nama. */
type KycClient = Pick<Client, "name" | "addresses" | "documents"> &
  Partial<Omit<Client, "name" | "addresses" | "documents">>

function same(a: string | undefined, b: string) {
  return a?.trim().toLowerCase() === b.toLowerCase()
}

function KycBand({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mt-6 mb-3 px-3 py-1.5 text-[12px] font-bold tracking-wide text-white"
      style={{ backgroundColor: KYC_NAVY }}
    >
      {children}
    </div>
  )
}

function KycCheckbox({
  checked,
  label,
  en,
  note,
}: {
  checked: boolean
  label: string
  en: string
  note?: string
}) {
  return (
    <div className="flex items-start gap-2">
      <span
        aria-hidden
        className="mt-0.5 flex size-3.5 shrink-0 items-center justify-center border border-foreground/70"
      >
        {checked ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>
      <span className="sr-only">{checked ? "Dipilih:" : "Tidak dipilih:"}</span>
      <span>
        {label} <span className="text-muted-foreground italic">({en})</span>
        {note ? <span className="ml-1 font-medium">: {note}</span> : null}
      </span>
    </div>
  )
}

function KycRow({
  no,
  label,
  en,
  children,
}: {
  no: number
  label: string
  en: string
  children: React.ReactNode
}) {
  return (
    <div className="avoid-break grid grid-cols-[1.5rem_13rem_0.75rem_1fr] items-start py-1.5">
      <span>{no}.</span>
      <span>
        {label}
        <span className="block text-[11px] text-muted-foreground italic">
          {en}
        </span>
      </span>
      <span>:</span>
      {children}
    </div>
  )
}

/** Isian kosong tetap punya garis titik-titik supaya bisa diisi tangan. */
function KycValue({ value }: { value?: string }) {
  return (
    <span
      className={cn(
        "min-h-5 border-b border-dotted border-foreground/40 whitespace-pre-line",
        !value && "h-5"
      )}
    >
      {value}
    </span>
  )
}

function findAddress(client: KycClient, pattern: RegExp) {
  return client.addresses.find((a) => pattern.test(a.label))
}

function KycCorporateRows({ client }: { client: KycClient }) {
  const company =
    findAddress(client, /perusahaan/i) ??
    client.addresses.find((a) => a.isPrimary) ??
    client.addresses[0]
  const other =
    findAddress(client, /korespondensi/i) ??
    client.addresses.find((a) => a !== company)

  return (
    <>
      <KycRow
        no={1}
        label="Nama Perusahaan / Lembaga"
        en="Company / Institution Name"
      >
        <KycValue value={client.name} />
      </KycRow>
      <KycRow no={2} label="Alamat Perusahaan" en="Company Address">
        <KycValue value={company?.value} />
      </KycRow>
      <KycRow no={3} label="No. NPWP" en="Tax Register Number">
        <KycValue value={client.npwp} />
      </KycRow>
      <KycRow no={4} label="Alamat" en="Address">
        <KycValue value={other && other !== company ? other.value : ""} />
      </KycRow>
      <KycRow no={5} label="Nama PIC Perusahaan" en="Company PIC Name">
        <KycValue value={client.contactPerson} />
      </KycRow>
      <KycRow no={6} label="No. KTP PIC Perusahaan" en="Company PIC ID Number">
        <KycValue value={client.contactPersonIdNumber} />
      </KycRow>
      <PurposeRow no={7} client={client} />
    </>
  )
}

function KycIndividualRows({ client }: { client: KycClient }) {
  const address =
    client.addresses.find((a) => a.isPrimary) ?? client.addresses[0]
  const birth = [
    client.birthPlace,
    client.birthDate ? dateLong(client.birthDate) : "",
  ]
    .filter(Boolean)
    .join(", ")
  const idNumber = client.idNumber
    ? `${client.idNumber}${client.idType ? ` (${client.idType})` : ""}`
    : ""

  return (
    <>
      <KycRow no={1} label="Nama Lengkap" en="Full Name">
        <KycValue value={client.name} />
      </KycRow>
      <KycRow no={2} label="Tempat & Tanggal Lahir" en="Place & Date of Birth">
        <KycValue value={birth} />
      </KycRow>
      <KycRow
        no={3}
        label="No. KTP / SIM / Passport"
        en="ID Card / Driving License / Passport No."
      >
        <KycValue value={idNumber} />
      </KycRow>
      <KycRow no={4} label="Alamat" en="Address">
        <KycValue value={address?.value} />
      </KycRow>
      <KycRow no={5} label="No. Telpon" en="Phone Number">
        <KycValue value={client.phone || address?.phone} />
      </KycRow>
      <KycRow no={6} label="Sumber Penghasilan" en="Source of Income">
        <div className="flex flex-col gap-1">
          {INCOME_OPTIONS.map((o) => (
            <KycCheckbox
              key={o.value}
              checked={same(client.incomeSource, o.value)}
              label={o.label}
              en={o.en}
            />
          ))}
        </div>
      </KycRow>
      <PurposeRow no={7} client={client} />
    </>
  )
}

function PurposeRow({ no, client }: { no: number; client: KycClient }) {
  return (
    <KycRow no={no} label="Tujuan Menutup Asuransi" en="Purpose of Insurance">
      <div className="flex flex-col gap-1">
        {PURPOSE_OPTIONS.map((o) => {
          const checked = same(client.insurancePurpose, o.value)
          return (
            <KycCheckbox
              key={o.value}
              checked={checked}
              label={o.label}
              en={o.en}
              note={
                checked && o.value === "Lain-lain"
                  ? client.insurancePurposeNote
                  : undefined
              }
            />
          )
        })}
      </div>
    </KycRow>
  )
}

function KycFooter() {
  return (
    <footer
      className="avoid-break mt-10 flex items-center justify-between gap-6 px-4 py-3 text-[10px] leading-relaxed text-white"
      style={{ backgroundColor: KYC_NAVY }}
    >
      <p>
        {LCH_ADDRESS.line1}
        <br />
        {LCH_ADDRESS.line2}
        <br />
        {LCH_ADDRESS.phone}
      </p>
      <div className="shrink-0 text-right">
        <p>Terdaftar &amp; diawasi oleh</p>
        <p className="font-bold">Otoritas Jasa Keuangan</p>
        <p className="mt-1">Anggota APPARINDO No. 237-2016</p>
      </div>
    </footer>
  )
}

function KycForm({
  client,
  fallbackName,
  today,
}: {
  client: Client | null
  fallbackName: string
  today: string
}) {
  // Tanpa data klien, form tetap dicetak kosong supaya bisa diisi tangan.
  const data: KycClient = client ?? {
    name: fallbackName,
    addresses: [],
    documents: [],
  }
  const corporate = data.clientType !== "Perorangan"
  const hasId = data.documents.some((d) =>
    /ktp|sim|paspor|passport/i.test(d.type)
  )
  const hasNpwp = data.documents.some((d) => /npwp/i.test(d.type))
  const signer = corporate ? data.contactPerson || data.name : data.name

  return (
    <section className="text-[12px]">
      <header className="flex items-center justify-between gap-6">
        <LchLogo className="h-14 w-auto" />
        <div className="text-right">
          <p className="text-[17px] font-bold italic">
            Know Your Customer Form:
          </p>
          <p className="italic">
            {corporate
              ? "Nasabah Korporasi / Corporate Client"
              : "Nasabah Individu / Individual Client"}
          </p>
        </div>
      </header>

      <KycBand>INFORMASI KLIEN / CLIENT INFORMATION</KycBand>
      {corporate ? (
        <KycCorporateRows client={data} />
      ) : (
        <KycIndividualRows client={data} />
      )}

      <KycBand>DOKUMEN PENDUKUNG / SUPPORTING DOCUMENT</KycBand>
      <div className="flex flex-col gap-1.5 pl-6">
        <KycCheckbox
          checked={hasId}
          label="Copy KTP / SIM / Passport"
          en="ID Card / Driving License / Passport"
        />
        <KycCheckbox checked={hasNpwp} label="Copy NPWP" en="Tax Register" />
      </div>

      <div className="avoid-break mt-10 ml-auto w-64 text-center">
        <p>Jakarta, {dateLong(data.kycDate || today)}</p>
        <p className="mt-20">
          ( {signer || "...................................."} )
        </p>
      </div>

      <KycFooter />
    </section>
  )
}

/**
 * Jawaban kuesioner berlabel. Kunci berawalan "_" adalah data internal form,
 * dan `vehicle` (SPPA lama) sudah tampil di baris Merek / Tipe Kendaraan.
 */
function answerRows(sppa: Sppa): [string, string][] {
  const questions = SPPA_QUESTIONS[sppa.cob] ?? []
  const known = new Set([...questions.map((q) => q.key), "vehicle"])
  const labeled = questions.map((q): [string, string] => [
    q.label,
    sppa.answers[q.key] ?? "",
  ])
  const extra = Object.entries(sppa.answers).filter(
    ([k, v]) => !k.startsWith("_") && !known.has(k) && v
  )
  return [...labeled, ...extra]
}

function SppaDetail({
  sppa,
  clientName,
  today,
}: {
  sppa: Sppa
  clientName: string
  today: string
}) {
  const period =
    sppa.periodStart && sppa.periodEnd
      ? `${dateLong(sppa.periodStart)} s.d. ${dateLong(sppa.periodEnd)}`
      : "To Be Advised"
  const rows: [string, string][] = []
  if (clientName !== sppa.insuredName) rows.push(["Nama Klien", clientName])
  rows.push(
    ["Nama Tertanggung", sppa.insuredName],
    ["Class of Business", sppa.cob],
    ["Jenis Pertanggungan", sppa.typeOfCover],
    ["Okupasi", sppa.occupation ?? ""],
    ["Lokasi Risiko", sppa.riskLocation]
  )
  if (sppa.cob === "Motor Vehicle")
    rows.push([
      "Merek / Tipe Kendaraan",
      [sppa.vehicleBrandName, sppa.vehicleTypeName]
        .filter(Boolean)
        .join(" / ") ||
        sppa.answers.vehicle ||
        "",
    ])
  rows.push(
    ["Mata Uang", sppa.currency],
    ["Nilai Pertanggungan", money(sppa.sumInsured, sppa.currency)],
    ["Periode Asuransi", period]
  )
  const answers = answerRows(sppa)

  return (
    <section className="print-break pt-10 print:pt-0">
      <Letterhead />
      <DocTitle
        title="SURAT PERMINTAAN PENUTUPAN ASURANSI"
        number="(SPPA)"
        muted
      />
      <SectionHeading>DATA PERTANGGUNGAN</SectionHeading>
      <InfoTable rows={rows} />
      {answers.length ? (
        <>
          <SectionHeading>KETERANGAN TAMBAHAN</SectionHeading>
          <InfoTable rows={answers} />
        </>
      ) : null}
      <div className="avoid-break mt-8 ml-auto w-64 text-center text-[13px]">
        <p>Jakarta, {dateLong(today)}</p>
        <p className="text-muted-foreground">Tertanggung / The Insured,</p>
        <p className="mt-16">( {sppa.insuredName} )</p>
      </div>
      <PrintedAt />
    </section>
  )
}

export function SppaKycDocument({
  sppa,
  client,
  clientName,
  today,
}: {
  sppa: Sppa
  client: Client | null
  clientName: string
  today: string
}) {
  return (
    <DocumentShell backHref="/marketing?tab=sppa">
      <KycForm client={client} fallbackName={clientName} today={today} />
      <SppaDetail sppa={sppa} clientName={clientName} today={today} />
    </DocumentShell>
  )
}
