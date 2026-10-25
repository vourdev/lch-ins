"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { DocumentShell } from "@/components/documents/document-shell"
import {
  ClauseWordingAppendix,
  ClausesBlock,
  DeductibleBlock,
  DetailTable,
  DocTitle,
  InterestBlock,
  PayableTable,
  PremiumTable,
  SectionHeading,
  SecurityPanelBlock,
  SignatureGrid,
  SignedBlock,
  premiumRows,
  type PremiumRow,
} from "@/components/documents/doc-blocks"
import { Letterhead } from "@/components/documents/letterhead"
import { PrintedAt } from "@/components/documents/printed-at"
import { derivedDocNumber } from "@/components/underwriting/slip-model"
import { Button } from "@/components/ui/button"
import { brokerageAmount, netPremium } from "@/lib/calc"
import type { PlacingSlip } from "@/lib/data"
import { dateLong, num } from "@/lib/format"
import { useRecord } from "@/lib/store"

/*
 * Dokumen penutupan dirender dari store sesi, jadi perubahan yang disimpan di
 * form langsung terlihat di dokumen. Data server dipakai sebagai cadangan.
 */

type DocProps = { id: string; initial: PlacingSlip | null }

function useSlip({ id, initial }: DocProps) {
  return useRecord("slips", id) ?? initial
}

function Missing() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-lg font-semibold">Dokumen tidak ditemukan</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Placing slip untuk dokumen ini tidak ada atau belum disimpan.
      </p>
      <Button render={<Link href="/underwriting" />} nativeButton={false}>
        <ArrowLeft data-icon="inline-start" />
        Kembali ke Underwriting
      </Button>
    </div>
  )
}

const unitOf = (slip: PlacingSlip) => (slip.cob === "Motor Vehicle" ? "%" : "‰")

export function PlacingSlipDocument(props: DocProps) {
  const slip = useSlip(props)
  if (!slip) return <Missing />
  return (
    <DocumentShell backHref={`/underwriting/edit/${slip.id}`}>
      <Letterhead withAddress />
      <DocTitle
        title="PLACING SLIP"
        number={
          slip.status === "Cancelled"
            ? `No. ${slip.slipNo} — DIBATALKAN`
            : slip.slipNo
              ? `No. ${slip.slipNo}`
              : "DRAFT — belum di-release"
        }
        muted={!slip.slipNo || slip.status === "Cancelled"}
      />
      <DetailTable slip={slip} />
      <InterestBlock slip={slip} />
      <DeductibleBlock slip={slip} />
      <ClausesBlock slip={slip} />

      <SectionHeading>RATE &amp; PREMIUM</SectionHeading>
      <PremiumTable
        slip={slip}
        rows={premiumRows(slip)}
        unitLabel={unitOf(slip)}
      />
      <PayableTable slip={slip} />

      <SecurityPanelBlock slip={slip} />

      <SignatureGrid
        place={`Jakarta, ${dateLong(slip.updatedAt)}`}
        confirmationTitle="KONFIRMASI PENANGGUNG / INSURER CONFIRMATION"
        confirmationParty="Nama Perusahaan Asuransi & Authorized Signatory"
      />

      <ClauseWordingAppendix slip={slip} />
    </DocumentShell>
  )
}

export function QuotationSlipDocument(props: DocProps) {
  const slip = useSlip(props)
  if (!slip) return <Missing />
  return (
    <DocumentShell backHref={`/underwriting/quotation/edit/${slip.id}`}>
      <Letterhead />
      <DocTitle
        title="QUOTATION SLIP"
        number={slip.slipNo ? `No. ${slip.slipNo}` : "DRAFT"}
        muted={!slip.slipNo}
      />
      <DetailTable slip={slip} />
      <InterestBlock slip={slip} />
      <DeductibleBlock slip={slip} />

      {slip.subjectivity ? (
        <>
          <SectionHeading>SUBJECTIVITY</SectionHeading>
          <p className="text-[12.5px] leading-relaxed whitespace-pre-line text-muted-foreground">
            {slip.subjectivity}
          </p>
        </>
      ) : null}

      <ClausesBlock slip={slip} inline />

      <SectionHeading>RATE &amp; PREMIUM CALCULATION</SectionHeading>
      <PremiumTable
        slip={slip}
        rows={premiumRows(slip)}
        unitLabel={unitOf(slip)}
      />
      <PayableTable slip={slip} />

      <SignatureGrid
        place={`Jakarta, ${dateLong(slip.updatedAt)}`}
        confirmationTitle="KONFIRMASI TERTANGGUNG / INSURED CONFIRMATION"
      />

      <PrintedAt />
    </DocumentShell>
  )
}

export function CoverNoteDocument(props: DocProps) {
  const slip = useSlip(props)
  if (!slip) return <Missing />
  // Format nomor cover note masih usulan, menunggu contoh dari LCH.
  const number = derivedDocNumber(slip.slipNo, "CN")
  return (
    <DocumentShell backHref={`/underwriting/quotation/edit/${slip.id}`}>
      <Letterhead />
      <DocTitle
        title="COVER NOTE"
        number={
          number
            ? `No. ${number}`
            : "No. ................................................"
        }
        muted={!number}
      />
      <DetailTable slip={slip} />
      <InterestBlock slip={slip} />
      <DeductibleBlock slip={slip} />
      <ClausesBlock slip={slip} inline />

      <SectionHeading>RATE &amp; PREMIUM</SectionHeading>
      <PremiumTable
        slip={slip}
        rows={premiumRows(slip)}
        unitLabel={unitOf(slip)}
      />
      <PayableTable slip={slip} />

      <SecurityPanelBlock slip={slip} />

      {slip.coverNoteRemarks ? (
        <>
          <SectionHeading>REMARKS</SectionHeading>
          <p className="text-[12.5px] leading-relaxed whitespace-pre-line text-muted-foreground">
            {slip.coverNoteRemarks}
          </p>
        </>
      ) : null}

      <SignedBlock label="Nama Perusahaan Asuransi" />
      <p className="mt-8 text-[13px]">Jakarta, {dateLong(slip.updatedAt)}</p>

      <PrintedAt />
    </DocumentShell>
  )
}

export function ClosingInstructionDocument(props: DocProps) {
  const slip = useSlip(props)
  if (!slip) return <Missing />
  const number = derivedDocNumber(slip.slipNo, "CI")
  const rows: PremiumRow[] = [
    ...premiumRows(slip),
    {
      label: `Brokerage ${num(slip.brokeragePct, 2)}%`,
      rate: "",
      premium: brokerageAmount(slip),
      emphasis: "brokerage",
    },
    {
      label: "Net Premium (after Brokerage)",
      rate: "",
      premium: netPremium(slip),
      emphasis: "net",
    },
  ]

  return (
    <DocumentShell backHref={`/underwriting/quotation/edit/${slip.id}`}>
      <Letterhead />
      <DocTitle
        title="CLOSING INSTRUCTION"
        number={number ? `No. ${number}` : "DRAFT"}
        muted={!number}
      />
      <DetailTable slip={slip} />
      <InterestBlock slip={slip} />
      <DeductibleBlock slip={slip} />
      <ClausesBlock slip={slip} inline />

      <SectionHeading>RATE &amp; PREMIUM</SectionHeading>
      <PremiumTable slip={slip} rows={rows} unitLabel={unitOf(slip)} />
      <p className="mt-2 text-[11px] text-muted-foreground">
        Net Premium = Total Premium − (Total Premium × brokerage %) — dihitung
        dari Total Premium, bukan Total Payable.
      </p>
      <PayableTable slip={slip} />

      <SecurityPanelBlock slip={slip} />

      {slip.closingInstruction ? (
        <>
          <SectionHeading>INSTRUCTION</SectionHeading>
          <p className="text-[12.5px] leading-relaxed whitespace-pre-line text-muted-foreground">
            {slip.closingInstruction}
          </p>
        </>
      ) : null}

      <SignedBlock label="Nama Perusahaan Asuransi" />

      <p className="mt-8 mb-1 text-[13px]">
        Jakarta, {dateLong(slip.updatedAt)}
      </p>
      <div className="avoid-break mt-4 grid grid-cols-1 gap-8 text-[13px] sm:grid-cols-2">
        <div>
          <p className="mb-14 text-muted-foreground">
            Disiapkan oleh / Prepared by,
          </p>
          <p className="border-t pt-1 font-bold">PT. LCH Insurance Brokers</p>
          <p className="text-xs text-muted-foreground">Authorized Signatory</p>
        </div>
        <div>
          <p className="mb-14 text-muted-foreground">
            Diterima &amp; Ditandatangani / Accepted &amp; Signed by,
          </p>
          <p className="border-t pt-1 font-bold">Nama Perusahaan Asuransi</p>
          <p className="text-xs text-muted-foreground">Authorized Signatory</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Tanggal: ...................
          </p>
        </div>
      </div>

      <PrintedAt />
    </DocumentShell>
  )
}
