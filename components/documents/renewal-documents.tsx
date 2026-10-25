import { DocumentShell } from "@/components/documents/document-shell"
import { DocTitle, InfoTable } from "@/components/documents/doc-blocks"
import { Letterhead } from "@/components/documents/letterhead"
import { PrintedAt } from "@/components/documents/printed-at"
import { premiumIdr, type Client, type Policy } from "@/lib/data"
import { daysBetween } from "@/lib/date"
import { dateLong, dateShort, money, rupiah } from "@/lib/format"
import { renewalBackHref } from "@/lib/renewal"

export function RenewalListDocument({
  rows,
  today,
  days,
  cob,
}: {
  rows: Policy[]
  today: string
  days: string
  cob: string
}) {
  const total = rows.reduce((sum, p) => sum + premiumIdr(p), 0)

  return (
    <DocumentShell backHref={renewalBackHref(days, cob)}>
      <Letterhead />
      <DocTitle
        title="DAFTAR RENEWAL NOTICE"
        number={`Jatuh tempo dalam ${days} hari · ${cob === "all" ? "Semua COB" : cob} · per ${dateLong(today)}`}
        muted
      />

      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-y border-primary text-left">
            <th className="py-2 pr-2 font-semibold">No.</th>
            <th className="py-2 pr-2 font-semibold">No. Polis</th>
            <th className="py-2 pr-2 font-semibold">Tertanggung</th>
            <th className="py-2 pr-2 font-semibold">COB</th>
            <th className="py-2 pr-2 font-semibold">Asuransi</th>
            <th className="py-2 pr-2 font-semibold">Berakhir</th>
            <th className="py-2 pr-2 text-right font-semibold whitespace-nowrap">
              Sisa Hari
            </th>
            <th className="py-2 text-right font-semibold">Premium (IDR)</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                className="py-6 text-center text-muted-foreground"
              >
                Tidak ada polis jatuh tempo pada periode ini
              </td>
            </tr>
          ) : (
            rows.map((p, i) => (
              <tr key={p.id} className="avoid-break border-b align-top">
                <td className="tabular py-1.5 pr-2">{i + 1}</td>
                <td className="tabular py-1.5 pr-2 font-medium">
                  {p.policyNo}
                </td>
                <td className="py-1.5 pr-2">{p.insuredName}</td>
                <td className="py-1.5 pr-2">{p.cob}</td>
                <td className="py-1.5 pr-2">{p.insurer}</td>
                <td className="tabular py-1.5 pr-2 whitespace-nowrap">
                  {dateShort(p.expiryDate)}
                </td>
                <td className="tabular py-1.5 pr-2 text-right">
                  {daysBetween(today, p.expiryDate)}
                </td>
                <td className="tabular py-1.5 text-right whitespace-nowrap">
                  {rupiah(premiumIdr(p))}
                </td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-primary">
            <td colSpan={7} className="py-2 font-bold">
              Total {rows.length} polis
            </td>
            <td className="tabular py-2 text-right font-bold whitespace-nowrap">
              {rupiah(total)}
            </td>
          </tr>
        </tfoot>
      </table>

      <PrintedAt />
    </DocumentShell>
  )
}

/** Alamat surat: alamat utama klien, kalau tidak ada pakai alamat pertama. */
function mailingAddress(client: Client | null) {
  const addresses = client?.addresses ?? []
  return (addresses.find((a) => a.isPrimary) ?? addresses[0])?.value ?? ""
}

export function RenewalLetterDocument({
  policy,
  client,
  today,
  backHref,
}: {
  policy: Policy
  client: Client | null
  today: string
  backHref: string
}) {
  const days = daysBetween(today, policy.expiryDate)
  const address = mailingAddress(client)
  const attention =
    client?.clientType === "Korporasi" ? client.contactPerson : ""
  const expiryPhrase =
    days >= 0
      ? `akan berakhir pada ${dateLong(policy.expiryDate)} (${days} hari lagi)`
      : `telah berakhir pada ${dateLong(policy.expiryDate)}`

  return (
    <DocumentShell backHref={backHref}>
      <Letterhead />

      <div className="text-[13px] leading-relaxed">
        <p className="text-right">Jakarta, {dateLong(today)}</p>

        <div className="mt-4">
          <p>Kepada Yth.</p>
          <p className="font-semibold">{client?.name || policy.insuredName}</p>
          {address ? (
            <p className="max-w-[60%] whitespace-pre-line">{address}</p>
          ) : null}
          {attention ? <p>Up. {attention}</p> : null}
        </div>

        <table className="mt-4">
          <tbody>
            <tr className="align-top">
              <td className="w-20">Perihal</td>
              <td className="w-3">:</td>
              <td className="font-semibold">
                Pemberitahuan Perpanjangan Polis No. {policy.policyNo}
              </td>
            </tr>
          </tbody>
        </table>

        <p className="mt-4">Dengan hormat,</p>
        <p className="mt-3">
          Bersama surat ini kami sampaikan bahwa polis asuransi dengan rincian
          berikut {expiryPhrase}:
        </p>

        <div className="mt-2">
          <InfoTable
            dense
            rows={[
              ["No. Polis", policy.policyNo],
              ["Nama Tertanggung", policy.insuredName],
              ["Class of Business", policy.cob],
              ["Jenis Pertanggungan", policy.typeOfCover ?? ""],
              ["Asuransi", policy.insurer],
              [
                "Periode Asuransi",
                `${dateLong(policy.inceptionDate)} s.d. ${dateLong(policy.expiryDate)}`,
              ],
              [
                "Nilai Pertanggungan",
                money(policy.sumInsured, policy.currency),
              ],
              [
                "Premi Periode Berjalan",
                money(policy.premium, policy.currency),
              ],
              ["Lokasi Risiko", policy.riskLocation],
            ]}
          />
        </div>

        <p>
          Agar perlindungan asuransi tetap berjalan tanpa jeda, kami mohon
          konfirmasi perpanjangan polis sebelum tanggal berakhir tersebut.
          Apabila terdapat perubahan data tertanggung, nilai pertanggungan, atau
          lokasi risiko, mohon informasikan kepada kami agar dapat kami teruskan
          kepada pihak asuransi.
        </p>
        <p className="mt-3">
          Atas perhatian dan kerja samanya, kami ucapkan terima kasih.
        </p>

        <div className="avoid-break mt-6 w-64">
          <p>Hormat kami,</p>
          <p className="mb-12 font-semibold">PT. LCH Insurance Brokers</p>
          <p className="border-t pt-1 text-xs text-muted-foreground">
            Authorized Signatory
          </p>
        </div>
      </div>

      <PrintedAt />
    </DocumentShell>
  )
}
