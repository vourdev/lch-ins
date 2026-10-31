"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  CircleCheck,
  FileCheck2,
  FileText,
  Plus,
  Save,
  ScrollText,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { PageShell } from "@/components/layout/page-header"
import { useFormOptions } from "@/components/shared/form-options-provider"
import { SectionCard } from "@/components/shared/section-card"
import {
  SlipFormActions,
  SlipFormBody,
  SlipFormToolbar,
} from "@/components/underwriting/slip-form-chrome"
import { useToday } from "@/components/layout/today-provider"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { NumberInput } from "@/components/ui/number-input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { sumPercent, totalPremium, totalSumInsured } from "@/lib/calc"
import type { PlacingSlip, SecurityPanelRow } from "@/lib/data"
import { withCurrent } from "@/lib/form-options"
import { money, num } from "@/lib/format"
import { newId, store, useRecord } from "@/lib/store"

const ROLE_ITEMS = [
  { label: "As Leader", value: "As Leader" },
  { label: "As Member", value: "As Member" },
]

const SECTION_KEYS = [
  "subjectivity",
  "security",
  "closing",
  "coverNote",
] as const

function emptyRow(
  role: SecurityPanelRow["role"] = "As Member"
): SecurityPanelRow {
  return { id: newId("sp"), insurer: "", share: 0, role }
}

/** Masalah panel co-insurance yang menghalangi penerbitan dokumen (PRD A-13). */
export function panelIssues(panel: SecurityPanelRow[]) {
  const issues: string[] = []
  const filled = panel.filter((r) => r.insurer)
  if (!filled.length) issues.push("Isi minimal satu asuransi di panel.")
  if (panel.some((r) => !r.insurer && r.share > 0)) {
    issues.push("Ada baris share tanpa nama asuransi.")
  }
  if (panel.some((r) => r.insurer && r.share <= 0)) {
    issues.push("Setiap asuransi di panel harus punya share lebih dari 0%.")
  }
  const names = filled.map((r) => r.insurer)
  if (new Set(names).size !== names.length) {
    issues.push("Asuransi yang sama tercantum lebih dari sekali.")
  }
  const leaders = filled.filter((r) => r.role === "As Leader").length
  if (leaders !== 1) issues.push("Panel wajib punya tepat satu leader.")
  const total = sumPercent(panel.map((r) => r.share))
  if (total !== 100)
    issues.push(`Total share ${num(total, 2)}%, harus tepat 100%.`)
  return issues
}

export function QuotationDraftForm({
  id,
  initial,
}: {
  id: string
  initial: PlacingSlip | null
}) {
  const stored = useRecord("slips", id)
  const slip = stored ?? initial
  if (!slip) {
    return (
      <PageShell>
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <h1 className="text-lg font-semibold">
            Placing slip tidak ditemukan
          </h1>
          <Button render={<Link href="/underwriting" />} nativeButton={false}>
            <ArrowLeft data-icon="inline-start" />
            Kembali ke Placement
          </Button>
        </div>
      </PageShell>
    )
  }
  return <QuotationEditor key={slip.id} slip={slip} />
}

function QuotationEditor({ slip }: { slip: PlacingSlip }) {
  const router = useRouter()
  const today = useToday()
  const insurerNames = useFormOptions().insurers.map((i) => i.name)
  const [subjectivity, setSubjectivity] = React.useState(
    slip.subjectivity ?? ""
  )
  const [closing, setClosing] = React.useState(slip.closingInstruction ?? "")
  const [coverNote, setCoverNote] = React.useState(slip.coverNoteRemarks ?? "")
  const [panel, setPanel] = React.useState<SecurityPanelRow[]>(() =>
    slip.securityPanel?.length
      ? slip.securityPanel
      : [emptyRow("As Leader"), emptyRow()]
  )
  const [confirmClose, setConfirmClose] = React.useState(false)

  const [openSections, setOpenSections] = React.useState<
    Record<string, boolean>
  >(() => Object.fromEntries(SECTION_KEYS.map((k) => [k, true])))
  const allOpen = SECTION_KEYS.every((k) => openSections[k])
  const sectionProps = (key: (typeof SECTION_KEYS)[number]) => ({
    collapsible: true as const,
    open: openSections[key],
    onOpenChange: (v: boolean) => setOpenSections((o) => ({ ...o, [key]: v })),
  })

  const totalShare = sumPercent(panel.map((r) => r.share))
  const issues = panelIssues(panel)
  const panelValid = issues.length === 0
  const premium = totalPremium(slip)
  const notReleased = slip.status === "Draft"
  const locked = slip.status === "Closed" || slip.status === "Cancelled"
  const duplicateNames = new Set(
    panel
      .map((r) => r.insurer)
      .filter((name, i, all) => name && all.indexOf(name) !== i)
  )

  function patch(rowId: string, next: Partial<SecurityPanelRow>) {
    setPanel((rows) =>
      rows.map((r) => (r.id === rowId ? { ...r, ...next } : r))
    )
  }

  function setLeader(rowId: string) {
    // Hanya satu leader: memilih leader baru menjadikan yang lain member.
    setPanel((rows) =>
      rows.map((r) => ({
        ...r,
        role: r.id === rowId ? "As Leader" : "As Member",
      }))
    )
  }

  /** Simpan quotation. Slip Released naik ke Quoted begitu panelnya lengkap. */
  function save(extra: Partial<PlacingSlip> = {}) {
    const status =
      slip.status === "Released" && panelValid ? "Quoted" : slip.status
    const record: PlacingSlip = {
      ...slip,
      subjectivity,
      closingInstruction: closing,
      coverNoteRemarks: coverNote,
      securityPanel: panel.filter((r) => r.insurer || r.share),
      status,
      updatedAt: today,
      ...extra,
    }
    store.upsert("slips", record)
    return record
  }

  function openDoc(path: string) {
    save()
    router.push(path)
  }

  return (
    <PageShell className="gap-0 p-0">
      <SlipFormToolbar
        title="Draft Quotation Slip"
        subtitle={slip.insuredName}
        status={slip.status}
        slipNo={slip.slipNo}
        backHref={`/underwriting/edit/${slip.id}`}
        allOpen={allOpen}
        onToggleAll={() =>
          setOpenSections(
            Object.fromEntries(SECTION_KEYS.map((k) => [k, !allOpen]))
          )
        }
        meta={
          <>
            Total Premium{" "}
            <span className="tabular font-semibold text-foreground">
              {money(premium, slip.currency)}
            </span>
          </>
        }
      />

      <SlipFormBody>
        {notReleased ? (
          <p className="flex items-start gap-2 rounded-xl bg-warning/10 px-4 py-3 text-sm text-warning">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            Slip belum di-release. Release dulu di form placing slip supaya
            quotation, cover note, dan closing instruction bernomor.
          </p>
        ) : null}
        {locked ? (
          <p className="rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
            Slip berstatus {slip.status === "Closed" ? "Closed" : "dibatalkan"}.
            Quotation hanya bisa dilihat.
          </p>
        ) : null}

        <Card className="gap-2 px-5 py-4">
          <div className="grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Type of Cover:</span>{" "}
              <span className="font-medium">{slip.typeOfCover || "—"}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Tertanggung:</span>{" "}
              <span className="font-medium">{slip.insuredName}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Total Sum Insured:</span>{" "}
              <span className="tabular font-medium">
                {money(totalSumInsured(slip), slip.currency)}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Total Premium:</span>{" "}
              <span className="tabular font-medium">
                {money(premium, slip.currency)}
              </span>
            </p>
          </div>
        </Card>

        <fieldset disabled={locked} className="contents">
          <SectionCard
            title="Subjectivity"
            description="Syarat yang harus dipenuhi sebelum polis diterbitkan."
            {...sectionProps("subjectivity")}
          >
            <Textarea
              rows={5}
              aria-label="Subjectivity"
              value={subjectivity}
              placeholder="1. …&#10;2. …"
              onChange={(e) => setSubjectivity(e.target.value)}
            />
          </SectionCard>

          <SectionCard
            title="Security (Panel Asuransi)"
            description="Struktur co-insurance — satu risiko dibagi ke beberapa insurer dengan share %."
            {...sectionProps("security")}
            action={
              <span
                className={cn(
                  "tabular rounded-full px-3 py-1 text-xs font-semibold",
                  totalShare === 100
                    ? "bg-success/12 text-success"
                    : "bg-warning/15 text-warning"
                )}
              >
                Total share {num(totalShare, 2)}%
              </span>
            }
          >
            <div className="flex flex-col gap-2">
              {/* Kolom tetap hanya di layar lebar. Di layar sempit tiap panel
                  jadi kartu kecil: asuransi di baris atas, share + role + hapus
                  di bawahnya, supaya tidak ada kolom yang terpotong. */}
              <div className="hidden gap-3 text-xs text-muted-foreground lg:grid lg:grid-cols-[minmax(0,1fr)_120px_150px_40px]">
                <span>Nama Asuransi</span>
                <span>Share (%)</span>
                <span>Role</span>
                <span />
              </div>

              {panel.map((row, index) => {
                // Asuransi yang sudah dinonaktifkan di master tetap tampil di
                // panel lama supaya isiannya tidak hilang.
                const insurerItems = withCurrent(insurerNames, row.insurer).map(
                  (i) => ({ label: i, value: i })
                )
                return (
                <div
                  key={row.id}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-3 rounded-lg border p-3 lg:grid-cols-[minmax(0,1fr)_120px_150px_40px] lg:border-0 lg:p-0"
                >
                  <Select
                    items={[
                      { label: `Panel ${index + 1}`, value: null },
                      ...insurerItems,
                    ]}
                    value={row.insurer || null}
                    onValueChange={(v) =>
                      patch(row.id, { insurer: (v as string) ?? "" })
                    }
                  >
                    <SelectTrigger
                      className="col-span-3 w-full min-w-0 lg:col-span-1"
                      aria-label={`Asuransi panel ${index + 1}`}
                      aria-invalid={
                        duplicateNames.has(row.insurer) || undefined
                      }
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {insurerItems.map((i) => (
                          <SelectItem key={i.value} value={i.value}>
                            {i.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>

                  <NumberInput
                    preset="percent"
                    aria-label={`Share panel ${index + 1}`}
                    min={0}
                    max={100}
                    invalid={row.share < 0 || row.share > 100}
                    value={row.share || null}
                    onValueChange={(v) => patch(row.id, { share: v ?? 0 })}
                  />

                  <Select
                    items={ROLE_ITEMS}
                    value={row.role}
                    onValueChange={(v) =>
                      v === "As Leader"
                        ? setLeader(row.id)
                        : patch(row.id, { role: "As Member" })
                    }
                  >
                    <SelectTrigger
                      className="w-full min-w-0"
                      aria-label={`Role panel ${index + 1}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {ROLE_ITEMS.map((i) => (
                          <SelectItem key={i.value} value={i.value}>
                            {i.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Hapus panel ${index + 1}`}
                    className="text-muted-foreground hover:text-destructive"
                    disabled={panel.length === 1}
                    onClick={() =>
                      setPanel((rows) => rows.filter((r) => r.id !== row.id))
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
                )
              })}

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPanel((rows) => [...rows, emptyRow()])}
                >
                  <Plus data-icon="inline-start" />
                  Tambah panel
                </Button>
                {panelValid ? (
                  <p className="flex items-center gap-1.5 text-xs text-success">
                    <CircleCheck className="size-3.5" />
                    Panel lengkap — siap generate dokumen.
                  </p>
                ) : null}
              </div>

              {!panelValid ? (
                <ul className="mt-1 flex flex-col gap-1 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
                  {issues.map((i) => (
                    <li key={i} className="flex gap-1.5">
                      <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                      {i}
                    </li>
                  ))}
                </ul>
              ) : null}

              {panel.some((r) => r.insurer) ? (
                <div className="mt-2 flex flex-col gap-1.5">
                  {panel
                    .filter((r) => r.insurer)
                    .map((r) => (
                      <div
                        key={`bar-${r.id}`}
                        className="flex items-center gap-3 text-xs"
                      >
                        <span className="w-40 truncate sm:w-64">
                          {r.insurer}
                        </span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <span
                            className={cn(
                              "block h-full rounded-full",
                              r.role === "As Leader"
                                ? "bg-primary"
                                : "bg-primary/45"
                            )}
                            style={{
                              width: `${Math.min(Math.max(r.share, 0), 100)}%`,
                            }}
                          />
                        </span>
                        <span className="tabular w-14 text-right font-medium">
                          {num(r.share, 2)}%
                        </span>
                        <span className="w-16 text-muted-foreground">
                          {r.role.replace("As ", "")}
                        </span>
                      </div>
                    ))}
                </div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard
            title="Closing Instruction"
            description="Instruksi ke insurer saat penutupan."
            {...sectionProps("closing")}
          >
            <Textarea
              rows={4}
              aria-label="Closing instruction"
              value={closing}
              placeholder="Masukkan closing instruction…"
              onChange={(e) => setClosing(e.target.value)}
            />
          </SectionCard>

          <SectionCard
            title="Catatan Draft Cover Note"
            description="Catatan tambahan untuk cover note (tanpa brokerage)."
            {...sectionProps("coverNote")}
          >
            <Textarea
              rows={3}
              aria-label="Catatan cover note"
              value={coverNote}
              placeholder="Catatan cover note…"
              onChange={(e) => setCoverNote(e.target.value)}
            />
          </SectionCard>
        </fieldset>
      </SlipFormBody>

      <SlipFormActions className="justify-end">
        <Button
          variant="ghost"
          render={<Link href="/underwriting" />}
          nativeButton={false}
        >
          Tutup
        </Button>
        {!locked ? (
          <Button
            variant="outline"
            onClick={() => {
              const record = save()
              toast.success("Quotation tersimpan", {
                description:
                  record.status === "Quoted" && slip.status !== "Quoted"
                    ? "Status slip naik menjadi Quoted."
                    : undefined,
              })
            }}
          >
            <Save data-icon="inline-start" />
            Simpan
          </Button>
        ) : null}
        <Button
          variant="outline"
          disabled={!panelValid || notReleased}
          title={!panelValid ? "Lengkapi panel asuransi dulu" : undefined}
          onClick={() => openDoc(`/underwriting/quotation/${slip.id}`)}
        >
          <FileText data-icon="inline-start" />
          Quotation Slip
        </Button>
        <Button
          variant="outline"
          disabled={!panelValid || notReleased}
          onClick={() => openDoc(`/underwriting/cover-note/${slip.id}`)}
        >
          <ScrollText data-icon="inline-start" />
          Draft Cover Note
        </Button>
        {slip.status === "Closed" ? (
          <Button
            onClick={() => router.push(`/underwriting/closing/${slip.id}`)}
          >
            <FileCheck2 data-icon="inline-start" />
            Closing Instruction
          </Button>
        ) : (
          <Button
            disabled={!panelValid || notReleased || locked}
            onClick={() => setConfirmClose(true)}
          >
            <FileCheck2 data-icon="inline-start" />
            Terbitkan Closing Instruction
          </Button>
        )}
      </SlipFormActions>

      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terbitkan closing instruction?</AlertDialogTitle>
            <AlertDialogDescription>
              Status slip menjadi Closed dan slip tidak bisa diubah lagi. Panel
              asuransi ini menjadi dasar pembagian share di polis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                save({ status: "Closed" })
                setConfirmClose(false)
                toast.success("Closing instruction diterbitkan", {
                  description: "Slip berstatus Closed.",
                })
                router.push(`/underwriting/closing/${slip.id}`)
              }}
            >
              Terbitkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  )
}
