import { sumItems, totalPremium, totalSumInsured } from "@/lib/calc"
import { sanitizeHtml } from "@/lib/sanitize"
import {
  constructionClassLabel,
  resolveSlipClauses,
  type PlacingSlip,
} from "@/lib/data"
import { dateEn, money, num } from "@/lib/format"
import { cn } from "@/lib/utils"

export function DocTitle({
  title,
  number,
  muted,
}: {
  title: string
  number: string
  muted?: boolean
}) {
  return (
    <div className="mb-8 text-center">
      <h1 className="text-[17px] font-bold tracking-[0.18em]">{title}</h1>
      <p
        className={cn(
          "mt-1 text-sm font-semibold",
          muted ? "font-normal text-muted-foreground" : "text-primary"
        )}
      >
        {number}
      </p>
    </div>
  )
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="avoid-break mt-8 mb-3 border-b border-primary pb-1.5 text-[13px] font-bold tracking-wide text-primary first:mt-0">
      {children}
    </h2>
  )
}

export function DetailTable({ slip }: { slip: PlacingSlip }) {
  const period = slip.periodTba
    ? "To Be Advised"
    : `${dateEn(slip.inceptionDate)} to ${dateEn(slip.expiryDate)}`

  const rows: [string, string][] = [
    ["Type of Cover", slip.typeOfCover || "—"],
    ["Insured Name", slip.insuredName.toUpperCase() || "—"],
    ["Correspondence Address", slip.correspondenceAddress || "—"],
    ["Period of Insurance", period],
  ]
  if (slip.occupation) rows.push(["Occupation", slip.occupation])
  if (slip.riskLocation) rows.push(["Risk Location", slip.riskLocation])
  if (slip.cob === "Property" && slip.constructionClass)
    rows.push([
      "Construction Class",
      constructionClassLabel(slip.constructionClass),
    ])
  if (slip.cob === "Property" && slip.indemnityPeriod)
    rows.push(["Indemnity Period", slip.indemnityPeriod])
  if (slip.wordingForms.filter(Boolean).length)
    rows.push(["Wording Form", slip.wordingForms.filter(Boolean).join("; ")])

  return (
    <table className="mb-6 w-full text-[13px]">
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k} className="align-top">
            <td className="w-[190px] py-1.5 text-muted-foreground">{k}</td>
            <td className="w-3 py-1.5">:</td>
            <td className="py-1.5">{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function InterestBlock({ slip }: { slip: PlacingSlip }) {
  const isProperty = slip.cob === "Property"

  return (
    <>
      <SectionHeading>INTEREST INSURED</SectionHeading>
      {isProperty ? (
        <div className="flex flex-col gap-4 text-[13px]">
          {slip.interestSection1 ? (
            <div>
              <p className="font-semibold">Section 1 — Material Damage</p>
              <p className="mt-1 leading-relaxed text-muted-foreground">
                {slip.interestSection1}
              </p>
              <ul className="mt-2 flex flex-col gap-1">
                {slip.sumInsuredSection1.map((i) => (
                  <li
                    key={i.id}
                    className="flex justify-between gap-6 border-b border-dashed py-1"
                  >
                    <span>{i.description}</span>
                    <span className="tabular whitespace-nowrap">
                      {money(i.amount, slip.currency)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-1 flex justify-between text-xs font-medium">
                <span>Subtotal Section 1</span>
                <span className="tabular">
                  {money(sumItems(slip.sumInsuredSection1), slip.currency)}
                </span>
              </p>
            </div>
          ) : null}

          {slip.interestSection2 ? (
            <div>
              <p className="font-semibold">Section 2 — Business Interruption</p>
              <p className="mt-1 leading-relaxed text-muted-foreground">
                {slip.interestSection2}
              </p>
              <ul className="mt-2 flex flex-col gap-1">
                {slip.sumInsuredSection2.map((i) => (
                  <li
                    key={i.id}
                    className="flex justify-between gap-6 border-b border-dashed py-1"
                  >
                    <span>{i.description}</span>
                    <span className="tabular whitespace-nowrap">
                      {money(i.amount, slip.currency)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-1 flex justify-between text-xs font-medium">
                <span>Subtotal Section 2</span>
                <span className="tabular">
                  {money(sumItems(slip.sumInsuredSection2), slip.currency)}
                </span>
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <ul className="flex flex-col gap-2 text-[13px]">
          {slip.interestItems.map((i) => {
            const vehicleLabel = [i.vehicleBrandName, i.vehicleTypeName]
              .filter(Boolean)
              .join(" ")
            return (
              <li
                key={i.id}
                className="flex justify-between gap-6 border-b border-dashed py-1"
              >
                <span className="leading-relaxed">
                  {vehicleLabel ? (
                    <span className="font-semibold text-foreground mr-1.5">
                      {vehicleLabel}
                      {i.description ? " —" : ""}
                    </span>
                  ) : null}
                  {i.description}
                </span>
                <span className="tabular whitespace-nowrap">
                  {money(i.amount, slip.currency)}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      <p className="mt-3 flex justify-between rounded bg-primary/8 px-3 py-2 text-[13px] font-semibold text-primary">
        <span>Total Sum Insured</span>
        <span className="tabular">
          {money(totalSumInsured(slip), slip.currency)}
        </span>
      </p>
    </>
  )
}

export function DeductibleBlock({ slip }: { slip: PlacingSlip }) {
  const s1 = slip.deductiblesSection1.filter(Boolean)
  const s2 = slip.deductiblesSection2.filter(Boolean)
  if (!s1.length && !s2.length && !slip.specialConditions) return null

  return (
    <>
      <SectionHeading>DEDUCTIBLE &amp; CONDITIONS</SectionHeading>
      <div className="flex flex-col gap-3 text-[13px]">
        {s1.length ? (
          <div>
            <p className="font-semibold">
              {slip.cob === "Property"
                ? "Section 1 — Material Damage"
                : "Deductible"}
            </p>
            <ul className="mt-1 list-disc pl-5 text-muted-foreground">
              {s1.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {s2.length ? (
          <div>
            <p className="font-semibold">Section 2 — Business Interruption</p>
            <ul className="mt-1 list-disc pl-5 text-muted-foreground">
              {s2.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {slip.specialConditions ? (
          <div>
            <p className="font-semibold">Special Conditions</p>
            <p className="mt-1 leading-relaxed text-muted-foreground">
              {slip.specialConditions}
            </p>
          </div>
        ) : null}
      </div>
    </>
  )
}

/** inline = wording penuh langsung di daftar (Quotation/Cover Note/CI). */
export function ClausesBlock({
  slip,
  inline,
}: {
  slip: PlacingSlip
  inline?: boolean
}) {
  const clauses = resolveSlipClauses(slip)
  if (!clauses.length) return null

  return (
    <>
      <SectionHeading>CLAUSES</SectionHeading>
      <ol className="flex flex-col gap-2 text-[12px]">
        {slip.wordingForms.filter(Boolean).map((w, i) => (
          <li key={w} className="avoid-break">
            <p className="font-semibold">
              {i + 1}. {w}
            </p>
            <p className="ml-4 text-muted-foreground">As Attached</p>
          </li>
        ))}
        {clauses.map((c, i) => (
          <li key={c.id} className="avoid-break">
            <p className="font-semibold">
              {slip.wordingForms.filter(Boolean).length + i + 1}. {c.title}
            </p>
            {inline ? (
              <div
                className="rte-prose mt-0.5 ml-4 text-[12px] text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.wording) }}
              />
            ) : null}
          </li>
        ))}
      </ol>
    </>
  )
}

/** Wording lengkap di akhir dokumen — dipakai Placing Slip. */
export function ClauseWordingAppendix({ slip }: { slip: PlacingSlip }) {
  const clauses = resolveSlipClauses(slip)
  if (!clauses.length) return null

  return (
    <section className="print-break">
      <SectionHeading>CLAUSE WORDING</SectionHeading>
      <div className="flex flex-col gap-3 text-[12px]">
        {clauses.map((c, i) => (
          <div key={c.id} className="avoid-break">
            <p className="font-semibold">
              {i + 1}. {c.title}
            </p>
            <div
              className="rte-prose mt-0.5 text-[12px] text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.wording) }}
            />
          </div>
        ))}
      </div>
    </section>
  )
}

export interface PremiumRow {
  label: string
  rate: string
  premium: number
  emphasis?: "total" | "brokerage" | "net"
}

export function premiumRows(slip: PlacingSlip): PremiumRow[] {
  const rows: PremiumRow[] = slip.rateLines
    .filter((l) => l.rate !== null || l.premium > 0)
    .map((l) => ({
      label: l.label,
      rate: l.rate !== null ? num(l.rate, 6) : "—",
      premium: l.premium,
    }))

  slip.tplLines.forEach((l) => {
    rows.push({
      label: `Third Party Liability (Limit ${money(Number(l.basis ?? 0), slip.currency)})`,
      rate: l.rate !== null ? num(l.rate, 6) : "—",
      premium: l.premium,
    })
  })
  slip.paLines.forEach((l) => {
    rows.push({
      label: `Personal Accident — ${l.label} (Limit ${money(Number(l.basis ?? 0), slip.currency)})`,
      rate: l.rate !== null ? num(l.rate, 6) : "—",
      premium: l.premium,
    })
  })

  return rows.concat([
    {
      label: "Total Premium",
      rate: "",
      premium: totalPremium(slip),
      emphasis: "total",
    },
  ])
}

export function PremiumTable({
  slip,
  rows,
  unitLabel,
}: {
  slip: PlacingSlip
  rows: PremiumRow[]
  unitLabel: string
}) {
  return (
    <table className="w-full text-[12.5px]">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-2 font-semibold">Peril / Cover</th>
          <th className="w-28 py-2 text-right font-semibold">
            Rate ({unitLabel})
          </th>
          <th className="w-40 py-2 text-right font-semibold">Premium</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr
            key={`${r.label}-${i}`}
            className={cn(
              "border-b",
              r.emphasis === "total" && "bg-muted/60 font-bold",
              r.emphasis === "brokerage" && "text-warning",
              r.emphasis === "net" && "font-bold text-warning"
            )}
          >
            <td className="py-2 pr-2">{r.label}</td>
            <td className="tabular py-2 text-right">{r.rate}</td>
            <td className="tabular py-2 text-right whitespace-nowrap">
              {r.emphasis === "brokerage"
                ? `(${money(r.premium, slip.currency)})`
                : money(r.premium, slip.currency)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function PayableTable({ slip }: { slip: PlacingSlip }) {
  const premium = totalPremium(slip)
  const discount = (premium * slip.discountPct) / 100
  const payable = premium - discount + slip.adminCost + slip.stampDuty

  return (
    <table className="mt-4 w-full text-[12.5px]">
      <tbody>
        {slip.discountPct ? (
          <tr className="border-b">
            <td className="py-2">Discount ({num(slip.discountPct, 2)}%)</td>
            <td className="tabular py-2 text-right">
              ({money(discount, slip.currency)})
            </td>
          </tr>
        ) : null}
        {slip.adminCost ? (
          <tr className="border-b">
            <td className="py-2">Admin Cost</td>
            <td className="tabular py-2 text-right">
              {money(slip.adminCost, slip.currency)}
            </td>
          </tr>
        ) : null}
        {slip.stampDuty ? (
          <tr className="border-b">
            <td className="py-2">Stamp Duty</td>
            <td className="tabular py-2 text-right">
              {money(slip.stampDuty, slip.currency)}
            </td>
          </tr>
        ) : null}
        <tr className="bg-primary/8 text-primary">
          <td className="px-2 py-2.5 font-bold">Total Payable</td>
          <td className="tabular px-2 py-2.5 text-right font-bold">
            {money(payable, slip.currency)}
          </td>
        </tr>
      </tbody>
    </table>
  )
}

export function SignatureGrid({
  place,
  confirmationTitle,
  confirmationParty,
}: {
  place: string
  confirmationTitle?: string
  confirmationParty?: string
}) {
  return (
    <div className="avoid-break mt-10 grid grid-cols-1 gap-8 text-[13px] sm:grid-cols-2">
      <div>
        <p className="mb-1">{place}</p>
        <p className="mb-14 text-muted-foreground">
          Disiapkan oleh / Prepared by,
        </p>
        <p className="border-t pt-1 font-bold">PT. LCH Insurance Brokers</p>
        <p className="text-xs text-muted-foreground">Authorized Signatory</p>
      </div>
      {confirmationTitle ? (
        <div className="rounded border border-dashed p-4">
          <p className="mb-3 text-[11px] font-bold tracking-wide">
            {confirmationTitle}
          </p>
          <p className="mb-3 border-b pb-8 text-xs text-muted-foreground">
            Nama:
          </p>
          <p className="mb-3 border-b pb-8 text-xs text-muted-foreground">
            Tanda Tangan / Signature:
          </p>
          <p className="text-xs text-muted-foreground">
            Tanggal / Date: ___________________
          </p>
          {confirmationParty ? (
            <p className="mt-3 text-[11px] text-muted-foreground">
              {confirmationParty}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function SignedBlock({ label }: { label: string }) {
  return (
    <>
      <SectionHeading>SIGNED</SectionHeading>
      <div className="flex flex-col gap-5 text-[13px]">
        <p>
          {label}:{" "}
          <span className="text-muted-foreground">
            ___________________________
          </span>
        </p>
        <p>
          Tanda Tangan:{" "}
          <span className="text-muted-foreground">
            ___________________________
          </span>
        </p>
        <p>
          Tanggal:{" "}
          <span className="text-muted-foreground">
            ___________________________
          </span>
        </p>
      </div>
    </>
  )
}

export function SecurityPanelBlock({ slip }: { slip: PlacingSlip }) {
  if (!slip.securityPanel?.length) return null
  return (
    <>
      <SectionHeading>SECURITY</SectionHeading>
      <table className="w-full text-[12.5px]">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 font-semibold">Insurer</th>
            <th className="w-24 py-2 pr-6 text-right font-semibold">Share</th>
            <th className="w-28 py-2 font-semibold">Role</th>
          </tr>
        </thead>
        <tbody>
          {slip.securityPanel.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="py-2">{p.insurer}</td>
              <td className="tabular py-2 pr-6 text-right">
                {num(p.share, 2)}%
              </td>
              <td className="py-2">{p.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
