"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Check,
  Eye,
  Info,
  Save,
  Send,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { PageShell } from "@/components/layout/page-header"
import { useToday } from "@/components/layout/today-provider"
import { SelectInput } from "@/components/shared/form-fields"
import { useFormOptions } from "@/components/shared/form-options-provider"
import { SectionCard } from "@/components/shared/section-card"
import {
  SlipFormActions,
  SlipFormBody,
  SlipFormToolbar,
} from "@/components/underwriting/slip-form-chrome"
import { ClausePicker } from "@/components/underwriting/clause-picker"
import {
  LineItemList,
  StringList,
  TotalBar,
} from "@/components/underwriting/line-items"
import { InsuredPicker } from "@/components/underwriting/insured-picker"
import { OccupationCombobox } from "@/components/underwriting/occupation-combobox"
import {
  OjkReference,
  type RateBounds,
} from "@/components/underwriting/ojk-reference"
import {
  CoverRateTable,
  LimitRateTable,
} from "@/components/underwriting/rate-tables"
import {
  buildSlipNo,
  coverCodeFor,
  coverLabel,
  isOutOfBounds,
  nextSlipSeq,
  rateLinesWithBounds,
  recalc,
  releaseIssues,
  switchCob,
  usesPropertyBlocks,
  usesSectionSumInsured,
} from "@/components/underwriting/slip-model"
import {
  deletePlacingSlipAction,
  releasePlacingSlipAction,
  savePlacingSlipAction,
  togglePlacingSlipStatusAction,
} from "@/app/(app)/underwriting/actions"
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
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NumberInput } from "@/components/ui/number-input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import {
  BI_BASE_LABELS,
  brokerageAmount,
  brokerageCapFor,
  discountAmount,
  effectiveBrokeragePct,
  sumItems,
  totalPayable,
  totalPremium,
  totalSumInsured,
} from "@/lib/calc"
import {
  CONSTRUCTION_CLASSES,
  type ClassOfBusiness,
  type PlacingSlip,
  type RateException,
  type VehicleBrandOption,
} from "@/lib/data"
import { BI_SCALE_OJK } from "@/lib/data/ojk-tariff"
import { cobLabels, coversFor, withCurrent } from "@/lib/form-options"
import { money, percent } from "@/lib/format"
import { newId, store, useRecord } from "@/lib/store"
import { cn } from "@/lib/utils"

const SECTION_KEYS = [
  "basic",
  "wording",
  "coverage",
  "interest",
  "sumInsured",
  "deductible",
  "rate",
  "brokerage",
] as const
type SectionKey = (typeof SECTION_KEYS)[number]

const toItem = (v: string) => ({ label: v, value: v })
const CONSTRUCTION_ITEMS = CONSTRUCTION_CLASSES.map((c) => ({
  label: `${c.label} — ${c.description}`,
  value: c.code,
}))
const INDEMNITY_ITEMS = BI_SCALE_OJK.map((s) => ({
  label: `${s.months} bulan · ${s.pct}% tarif dasar`,
  value: `${s.months} months`,
}))

/**
 * Form placing slip. Mengambil slip dari store sesi (termasuk slip yang baru
 * dibuat) dan jatuh ke data server bila belum ada di store.
 */
export function PlacingSlipForm({
  id,
  initial,
  mode,
  vehicleOptions,
}: {
  id?: string
  initial: PlacingSlip | null
  mode: "new" | "edit"
  vehicleOptions?: VehicleBrandOption[]
}) {
  const stored = useRecord("slips", id ?? null)
  const source = stored ?? initial

  if (!source) {
    return (
      <PageShell>
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <h1 className="text-lg font-semibold">
            Placing slip tidak ditemukan
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Slip mungkin sudah dihapus, atau dibuat di sesi lain dan belum
            tersimpan ke server.
          </p>
          <Button render={<Link href="/underwriting" />} nativeButton={false}>
            <ArrowLeft data-icon="inline-start" />
            Kembali ke Placement
          </Button>
        </div>
      </PageShell>
    )
  }
  return (
    <SlipEditor
      key={source.id}
      initial={source}
      mode={mode}
      vehicleOptions={vehicleOptions}
    />
  )
}

function SlipEditor({
  initial,
  mode,
  vehicleOptions,
}: {
  initial: PlacingSlip
  mode: "new" | "edit"
  vehicleOptions?: VehicleBrandOption[]
}) {
  const router = useRouter()
  const today = useToday()
  const [isPending, startTransition] = React.useTransition()
  const [slip, setSlip] = React.useState<PlacingSlip>(() => recalc(initial))
  const [savedJson, setSavedJson] = React.useState(() =>
    JSON.stringify(recalc(initial))
  )
  const dirty = JSON.stringify(slip) !== savedJson
  // Slip baru (termasuk yang terisi dari SPPA) selalu bisa disimpan sebagai draft.
  const canSave = dirty || mode === "new"

  const set = React.useCallback((patch: Partial<PlacingSlip>) => {
    setSlip((s) => recalc({ ...s, ...patch }))
  }, [])

  const [openSections, setOpenSections] = React.useState<
    Record<string, boolean>
  >(() => Object.fromEntries(SECTION_KEYS.map((k) => [k, true])))
  const allOpen = SECTION_KEYS.every((k) => openSections[k])
  const sectionProps = (key: SectionKey) => ({
    collapsible: true as const,
    open: openSections[key],
    onOpenChange: (v: boolean) => setOpenSections((o) => ({ ...o, [key]: v })),
  })

  const [issues, setIssues] = React.useState<string[] | null>(null)
  const [confirmRelease, setConfirmRelease] = React.useState(false)
  const [confirmDestroy, setConfirmDestroy] = React.useState(false)

  // Peringatan saat menutup tab dengan perubahan yang belum disimpan.
  React.useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [dirty])

  const locked = slip.status === "Cancelled" || slip.status === "Closed"
  const isProperty = slip.cob === "Property"
  const isMotor = slip.cob === "Motor Vehicle"

  // Pilihan dari master data. Nilai slip yang sudah tidak ada di master tetap
  // ditampilkan supaya slip lama tidak kehilangan isiannya saat diedit.
  const options = useFormOptions()
  const cobItems = withCurrent(cobLabels(options), slip.cob).map(toItem)
  const currencyItems = withCurrent(
    options.currencies.map((c) => c.code),
    slip.currency
  ).map(toItem)
  const covers = coversFor(options, slip.cob)
  const coverItems = withCurrent(
    covers.map((c) => c.name),
    slip.typeOfCover
  ).map(toItem)
  const wordingNames = options.wordingForms.map((w) => w.name)

  const lines = rateLinesWithBounds(slip)
  const md = sumItems(slip.sumInsuredSection1)
  const bi = sumItems(slip.sumInsuredSection2)
  const tsi = totalSumInsured(slip)
  const premium = totalPremium(slip)
  const discount = discountAmount(slip)
  const payable = totalPayable(slip)
  const unresolved = lines.filter(
    (l) => isOutOfBounds(l) && !slip.rateExceptions?.[l.id]
  ).length

  /** Tarif dasar BI: jumlah FLEXAS, FWTWD, RSMDCC, dan Other Losses. */
  const biBaseRate = slip.rateLines
    .filter((l) => BI_BASE_LABELS.includes(l.label))
    .reduce((a, l) => a + (l.rate ?? 0), 0)
  const eqRate = slip.rateLines.find((l) => l.label === "EQVET")?.rate ?? null
  const brokerageCap = brokerageCapFor(slip.cob)
  const editedClauseCount = slip.clauseIds.filter(
    (id) => slip.clauseOverrides?.[id]
  ).length
  const customWording = slip.wordingForms.filter(
    (w) => w && !wordingNames.includes(w)
  )

  /** Isi satu baris rate dari panel referensi OJK, sekaligus catat batasnya. */
  function applyOjkRate(label: string, value: number, bounds?: RateBounds) {
    if (!slip.rateLines.some((l) => l.label.startsWith(label))) return
    // Satu klik BI mengisi dua baris sekaligus, jadi wajib pakai updater agar
    // panggilan kedua tidak menimpa hasil panggilan pertama.
    setSlip((s) =>
      recalc({
        ...s,
        rateLines: s.rateLines.map((l) =>
          l.label.startsWith(label)
            ? {
                ...l,
                rate: value,
                ...(bounds
                  ? {
                      min: bounds.min,
                      max: bounds.max,
                      boundSource: bounds.source,
                    }
                  : {}),
              }
            : l
        ),
      })
    )
    toast.success(`Rate ${label} diisi ${value.toLocaleString("id-ID")}`, {
      description: bounds?.source,
    })
  }

  function setException(lineId: string, exception: RateException | null) {
    const next = { ...(slip.rateExceptions ?? {}) }
    if (exception) next[lineId] = exception
    else delete next[lineId]
    set({ rateExceptions: next })
  }

  /** Simpan ke store lokal. Batas OJK ikut disalin dan alasan yang tidak perlu dibuang. */
  function persistLocal(next: PlacingSlip = slip) {
    const withBounds = rateLinesWithBounds(next)
    const exceptions = Object.fromEntries(
      Object.entries(next.rateExceptions ?? {}).filter(([lineId]) =>
        withBounds.some((l) => l.id === lineId && isOutOfBounds(l))
      )
    )
    const record: PlacingSlip = {
      ...next,
      id: next.id === "new" ? newId("s") : next.id,
      rateLines: withBounds,
      rateExceptions: exceptions,
      updatedAt: today,
    }
    store.upsert("slips", record)
    setSlip(record)
    setSavedJson(JSON.stringify(record))
    return record
  }

  function handleSave() {
    startTransition(async () => {
      const withBounds = rateLinesWithBounds(slip)
      const exceptions = Object.fromEntries(
        Object.entries(slip.rateExceptions ?? {}).filter(([lineId]) =>
          withBounds.some((l) => l.id === lineId && isOutOfBounds(l))
        )
      )
      const toSend: PlacingSlip = {
        ...slip,
        rateLines: withBounds,
        rateExceptions: exceptions,
        updatedAt: today,
      }
      const res = await savePlacingSlipAction(toSend, mode)
      if (!res.ok || !res.data) {
        toast.error("Gagal menyimpan slip", { description: res.error })
        return
      }
      const record = res.data
      store.upsert("slips", record)
      setSlip(record)
      setSavedJson(JSON.stringify(record))
      toast.success("Draft tersimpan", {
        description: record.slipNo ?? record.insuredName ?? undefined,
      })
      if (mode === "new" || slip.id !== record.id) {
        router.replace(`/underwriting/edit/${record.id}`)
      }
    })
  }

  function startRelease() {
    const found = releaseIssues(slip)
    if (found.length) setIssues(found)
    else setConfirmRelease(true)
  }

  function doRelease() {
    startTransition(async () => {
      let targetId = slip.id
      if (dirty || mode === "new" || targetId === "new" || targetId.startsWith("s-")) {
        const withBounds = rateLinesWithBounds(slip)
        const exceptions = Object.fromEntries(
          Object.entries(slip.rateExceptions ?? {}).filter(([lineId]) =>
            withBounds.some((l) => l.id === lineId && isOutOfBounds(l))
          )
        )
        const toSend: PlacingSlip = {
          ...slip,
          rateLines: withBounds,
          rateExceptions: exceptions,
          updatedAt: today,
        }
        const saveRes = await savePlacingSlipAction(toSend, mode)
        if (!saveRes.ok || !saveRes.data) {
          toast.error("Gagal menyimpan slip sebelum rilis", { description: saveRes.error })
          return
        }
        targetId = saveRes.data.id
        store.upsert("slips", saveRes.data)
        setSlip(saveRes.data)
      }

      const relRes = await releasePlacingSlipAction(targetId)
      if (!relRes.ok || !relRes.data) {
        toast.error("Gagal merilis slip", { description: relRes.error })
        return
      }
      const record = relRes.data
      setConfirmRelease(false)
      store.upsert("slips", record)
      setSlip(record)
      setSavedJson(JSON.stringify(record))
      toast.success("Slip di-release", { description: `No. slip ${record.slipNo}` })
      if (mode === "new" || slip.id !== record.id) {
        router.replace(`/underwriting/edit/${record.id}`)
      }
    })
  }

  function doDestroy() {
    setConfirmDestroy(false)
    startTransition(async () => {
      if (slip.status === "Draft") {
        store.remove("slips", slip.id)
        setSavedJson(JSON.stringify(slip))
        const delRes = await deletePlacingSlipAction(slip.id)
        if (!delRes.ok && delRes.error) {
          toast.error("Gagal menghapus draft", { description: delRes.error })
          return
        }
        toast.success("Draft slip dihapus")
        router.push("/underwriting")
        return
      }
      const cancelRes = await togglePlacingSlipStatusAction(slip.id, "Cancelled")
      if (!cancelRes.ok && cancelRes.error) {
        toast.error("Gagal membatalkan slip", { description: cancelRes.error })
        return
      }
      if (cancelRes.data) {
        store.upsert("slips", cancelRes.data)
        setSlip(cancelRes.data)
        setSavedJson(JSON.stringify(cancelRes.data))
      }
      toast.success("Slip dibatalkan", {
        description: `Nomor ${slip.slipNo} tetap tercatat supaya penomoran tidak bolong.`,
      })
    })
  }

  /** Buka dokumen atau quotation; perubahan disimpan dulu supaya dokumen sama dengan form. */
  function goTo(path: (id: string) => string) {
    if (dirty || mode === "new") {
      startTransition(async () => {
        const withBounds = rateLinesWithBounds(slip)
        const exceptions = Object.fromEntries(
          Object.entries(slip.rateExceptions ?? {}).filter(([lineId]) =>
            withBounds.some((l) => l.id === lineId && isOutOfBounds(l))
          )
        )
        const toSend: PlacingSlip = {
          ...slip,
          rateLines: withBounds,
          rateExceptions: exceptions,
          updatedAt: today,
        }
        const res = await savePlacingSlipAction(toSend, mode)
        if (res.ok && res.data) {
          store.upsert("slips", res.data)
          router.push(path(res.data.id))
        } else {
          const fallback = persistLocal()
          router.push(path(fallback.id))
        }
      })
    } else {
      router.push(path(slip.id))
    }
  }

  const destroyLabel = slip.status === "Draft" ? "Hapus Draft" : "Batalkan Slip"
  const canDestroy =
    mode === "edit" && slip.status !== "Cancelled" && slip.status !== "Closed"

  return (
    <PageShell className="gap-0 p-0">
      <SlipFormToolbar
        title={mode === "new" ? "Buat Placing Slip Baru" : "Edit Placing Slip"}
        subtitle={`${slip.cob}${slip.typeOfCover ? ` · ${slip.typeOfCover}` : ""}`}
        status={slip.status}
        slipNo={slip.slipNo}
        backHref="/underwriting"
        allOpen={allOpen}
        onToggleAll={() =>
          setOpenSections(
            Object.fromEntries(SECTION_KEYS.map((k) => [k, !allOpen]))
          )
        }
        meta={
          <>
            Total Sum Insured{" "}
            <span className="tabular font-semibold text-foreground">
              {money(tsi, slip.currency)}
            </span>
            {dirty ? (
              <span className="ml-3 text-warning">· belum disimpan</span>
            ) : null}
          </>
        }
      />

      <SlipFormBody>
        {slip.sppaId ? (
          <p className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
            <Info className="size-4 shrink-0" />
            Dibuat dari SPPA {slip.insuredName}. Data dasar terisi dari SPPA dan
            tetap bisa diubah.
          </p>
        ) : null}
        {slip.status === "Released" || slip.status === "Quoted" ? (
          <p className="flex items-start gap-2 rounded-xl bg-warning/10 px-4 py-3 text-sm text-warning">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            Slip sudah di-release dengan nomor {slip.slipNo}. Perubahan setelah
            release tetap bisa disimpan, sementara aturan revisi menunggu
            keputusan LCH.
          </p>
        ) : null}
        {locked ? (
          <p className="flex items-start gap-2 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
            <Ban className="mt-0.5 size-4 shrink-0" />
            Slip berstatus{" "}
            {slip.status === "Cancelled" ? "dibatalkan" : "Closed"} dan tidak
            bisa diubah lagi.
          </p>
        ) : null}

        <fieldset disabled={locked} className="contents">
          {/* ---------- Informasi Dasar ---------- */}
          <SectionCard
            title="Informasi Dasar"
            {...sectionProps("basic")}
            summary={slip.insuredName || "Belum ada tertanggung"}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel>Class of Business *</FieldLabel>
                <Select
                  items={cobItems}
                  value={slip.cob}
                  onValueChange={(v) =>
                    setSlip((s) => switchCob(s, v as ClassOfBusiness))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {cobItems.map((i) => (
                        <SelectItem key={i.value} value={i.value}>
                          {i.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>Currency</FieldLabel>
                <Select
                  items={currencyItems}
                  value={slip.currency}
                  onValueChange={(v) => set({ currency: v as string })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {currencyItems.map((i) => (
                        <SelectItem key={i.value} value={i.value}>
                          {i.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field className="md:col-span-2">
                <FieldLabel>Type of Cover *</FieldLabel>
                <Select
                  items={[
                    { label: "Pilih type of cover…", value: null },
                    ...coverItems,
                  ]}
                  value={slip.typeOfCover || null}
                  onValueChange={(v) =>
                    set({
                      typeOfCover: (v as string) ?? "",
                      coverCode: coverCodeFor(
                        slip.cob,
                        (v as string) ?? "",
                        covers
                      ),
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {coverItems.map((i) => (
                        <SelectItem key={i.value} value={i.value}>
                          {i.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <InsuredPicker
                clientId={slip.clientId}
                insuredName={slip.insuredName}
                correspondenceAddress={slip.correspondenceAddress}
                onChange={set}
              />

              <Field orientation="horizontal" className="md:col-span-2">
                <Switch
                  id="tba"
                  checked={slip.periodTba}
                  onCheckedChange={(v) => set({ periodTba: Boolean(v) })}
                />
                <FieldLabel htmlFor="tba" className="font-normal">
                  Period TBA (to be advised)
                </FieldLabel>
              </Field>

              {!slip.periodTba ? (
                <>
                  <Field>
                    <FieldLabel htmlFor="inception">Inception Date</FieldLabel>
                    <Input
                      id="inception"
                      type="date"
                      value={slip.inceptionDate ?? ""}
                      onChange={(e) =>
                        set({ inceptionDate: e.target.value || null })
                      }
                    />
                  </Field>
                  <Field
                    data-invalid={
                      slip.inceptionDate &&
                      slip.expiryDate &&
                      slip.expiryDate <= slip.inceptionDate
                        ? true
                        : undefined
                    }
                  >
                    <FieldLabel htmlFor="expiry">Expiry Date</FieldLabel>
                    <Input
                      id="expiry"
                      type="date"
                      min={slip.inceptionDate ?? undefined}
                      value={slip.expiryDate ?? ""}
                      onChange={(e) =>
                        set({ expiryDate: e.target.value || null })
                      }
                    />
                  </Field>
                </>
              ) : null}

              {usesPropertyBlocks(slip.cob) ? (
                <>
                  <Field className="md:col-span-2">
                    <FieldLabel>
                      Okupasi (OJK){isProperty ? " *" : ""}
                    </FieldLabel>
                    <OccupationCombobox
                      value={slip.occupation ?? ""}
                      onValueChange={(v) => set({ occupation: v })}
                    />
                  </Field>
                  <Field className="md:col-span-2">
                    <FieldLabel htmlFor="risk">
                      Risk Location{isProperty ? " *" : ""}
                    </FieldLabel>
                    <Textarea
                      id="risk"
                      rows={2}
                      value={slip.riskLocation ?? ""}
                      placeholder="Alamat lokasi risiko, sertakan kabupaten atau kota"
                      onChange={(e) => set({ riskLocation: e.target.value })}
                    />
                  </Field>
                </>
              ) : (
                <Field className="md:col-span-2">
                  <FieldLabel htmlFor="domicile">Domisili Kendaraan</FieldLabel>
                  <Textarea
                    id="domicile"
                    rows={2}
                    value={slip.riskLocation ?? ""}
                    placeholder="Alamat garasi atau kota domisili, dipakai menentukan wilayah tarif OJK"
                    onChange={(e) => set({ riskLocation: e.target.value })}
                  />
                </Field>
              )}
            </div>
          </SectionCard>

          {/* ---------- Wording Form + Detail Coverage ---------- */}
          {usesPropertyBlocks(slip.cob) ? (
            <>
              <SectionCard
                title="Wording Form"
                {...sectionProps("wording")}
                summary={`${slip.wordingForms.filter(Boolean).length} wording`}
              >
                <div className="flex flex-wrap gap-2">
                  {wordingNames.map((w) => {
                    const active = slip.wordingForms.includes(w)
                    return (
                      <Toggle
                        key={w}
                        size="sm"
                        pressed={active}
                        // Nama wording bisa panjang; biarkan pindah baris daripada terpotong.
                        className="h-auto min-h-8 max-w-full py-1.5 text-left whitespace-normal"
                        onPressedChange={() =>
                          set({
                            wordingForms: active
                              ? slip.wordingForms.filter((x) => x !== w)
                              : [...slip.wordingForms.filter(Boolean), w],
                          })
                        }
                      >
                        {active ? <Check data-icon="inline-start" /> : null}
                        {w}
                      </Toggle>
                    )
                  })}
                </div>
                {customWording.length ? (
                  <div className="mt-3 flex flex-col gap-2">
                    <p className="text-xs text-muted-foreground">
                      Wording di luar master (data lama). Tambahkan ke master
                      data bila masih dipakai.
                    </p>
                    <StringList
                      values={customWording}
                      onChange={(v) =>
                        set({
                          wordingForms: [
                            ...slip.wordingForms.filter((w) =>
                              wordingNames.includes(w)
                            ),
                            ...v,
                          ],
                        })
                      }
                      addLabel="Tambah"
                    />
                  </div>
                ) : null}
              </SectionCard>

              <SectionCard
                title="Detail Coverage & Ketentuan"
                {...sectionProps("coverage")}
                summary={slip.indemnityPeriod || undefined}
              >
                <div className="flex flex-col gap-4">
                  <Field>
                    <FieldLabel htmlFor="coverage">Coverage</FieldLabel>
                    <Textarea
                      id="coverage"
                      rows={3}
                      value={slip.coverage ?? ""}
                      placeholder="Uraian jaminan yang diberikan"
                      onChange={(e) => set({ coverage: e.target.value })}
                    />
                  </Field>
                  {isProperty ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <SelectInput
                        label="Construction Class"
                        required
                        items={CONSTRUCTION_ITEMS}
                        value={slip.constructionClass ?? ""}
                        onValueChange={(v) => set({ constructionClass: v })}
                        placeholder="Pilih kelas konstruksi"
                        description="Dipakai menentukan batas tarif FLEXAS okupasi."
                      />
                      <SelectInput
                        label="Indemnity Period"
                        items={INDEMNITY_ITEMS}
                        value={slip.indemnityPeriod ?? ""}
                        onValueChange={(v) => set({ indemnityPeriod: v })}
                        placeholder="Pilih periode (skala BI OJK)"
                        description="Terisi juga saat memilih skala BI di panel tarif OJK."
                      />
                    </div>
                  ) : null}
                </div>
              </SectionCard>
            </>
          ) : null}

          {/* ---------- Interest Insured ---------- */}
          <SectionCard
            title="Interest Insured"
            {...sectionProps("interest")}
            summary={
              usesSectionSumInsured(slip.cob)
                ? undefined
                : money(sumItems(slip.interestItems), slip.currency)
            }
          >
            {usesSectionSumInsured(slip.cob) ? (
              <div className="flex flex-col gap-4">
                <Field>
                  <FieldLabel htmlFor="int1">
                    Section 1 — Material Damage
                  </FieldLabel>
                  <Textarea
                    id="int1"
                    rows={3}
                    value={slip.interestSection1 ?? ""}
                    onChange={(e) => set({ interestSection1: e.target.value })}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="int2">
                    Section 2 — Business Interruption
                  </FieldLabel>
                  <Textarea
                    id="int2"
                    rows={3}
                    value={slip.interestSection2 ?? ""}
                    onChange={(e) => set({ interestSection2: e.target.value })}
                  />
                </Field>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <LineItemList
                  items={slip.interestItems}
                  onChange={(items) => set({ interestItems: items })}
                  descPlaceholder={
                    isMotor
                      ? "Tahun, No. Polisi, No. Rangka / Mesin, Penggunaan"
                      : "Deskripsi objek pertanggungan"
                  }
                  amountPlaceholder="Nilai"
                  multiline
                  addLabel={isMotor ? "Tambah kendaraan" : "Tambah interest"}
                  vehicleOptions={isMotor ? vehicleOptions : undefined}
                />
                <TotalBar
                  label="Total Interest Insured"
                  value={money(sumItems(slip.interestItems), slip.currency)}
                />
              </div>
            )}
          </SectionCard>

          {/* ---------- Sum Insured (Property) ---------- */}
          {usesSectionSumInsured(slip.cob) ? (
            <SectionCard
              title="Sum Insured"
              {...sectionProps("sumInsured")}
              summary={money(md + bi, slip.currency)}
            >
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium">
                    Section 1 — Material Damage
                  </p>
                  <LineItemList
                    items={slip.sumInsuredSection1}
                    onChange={(items) => set({ sumInsuredSection1: items })}
                    descPlaceholder="Deskripsi"
                    amountPlaceholder="Nilai"
                  />
                  <TotalBar
                    label="Subtotal Material Damage"
                    value={money(md, slip.currency)}
                    tone="muted"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium">
                    Section 2 — Business Interruption
                  </p>
                  <LineItemList
                    items={slip.sumInsuredSection2}
                    onChange={(items) => set({ sumInsuredSection2: items })}
                    descPlaceholder="Deskripsi"
                    amountPlaceholder="Nilai"
                  />
                  <TotalBar
                    label="Subtotal Business Interruption"
                    value={money(bi, slip.currency)}
                    tone="muted"
                  />
                </div>
                <TotalBar
                  label="Total Sum Insured"
                  value={money(md + bi, slip.currency)}
                />
              </div>
            </SectionCard>
          ) : null}

          {/* ---------- Deductible & Clauses ---------- */}
          <SectionCard
            title="Deductible & Clauses"
            {...sectionProps("deductible")}
            summary={`${slip.clauseIds.length} klausula${
              editedClauseCount ? ` · ${editedClauseCount} diedit` : ""
            }`}
          >
            <div className="flex flex-col gap-5">
              {/*
               * Deductible per cover, satu isian untuk tiap baris rate
               * (instruksi LCH 29 Oktober 2026). Baris TPL dan PA tidak ikut:
               * risiko sendiri motor berlaku untuk kendaraan dan perluasannya.
               */}
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Deductible per cover</p>
                <div className="overflow-hidden rounded-xl border">
                  {slip.rateLines.map((line) => (
                    <div
                      key={line.id}
                      className="grid grid-cols-1 items-center gap-x-4 gap-y-1.5 border-b px-3 py-2.5 last:border-0 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]"
                    >
                      <label
                        htmlFor={`deductible-${line.id}`}
                        className="truncate text-sm text-muted-foreground"
                        title={coverLabel(slip, line)}
                      >
                        {coverLabel(slip, line)}
                      </label>
                      <Input
                        id={`deductible-${line.id}`}
                        value={line.deductible ?? ""}
                        onChange={(e) =>
                          set({
                            rateLines: slip.rateLines.map((l) =>
                              l.id === line.id
                                ? { ...l, deductible: e.target.value }
                                : l
                            ),
                          })
                        }
                        placeholder={
                          line.label.startsWith("BI")
                            ? "Contoh: 14 days waiting period"
                            : "Contoh: 10% of claim minimum IDR 10,000,000"
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/*
               * Deductible per section dari sebelum aturan per cover. Tidak
               * bisa dipindah otomatis — "for Earthquake" harus masuk EQVET,
               * bukan FLEXAS — jadi tetap ditampilkan sampai dipindah tangan.
               * Slip baru tidak pernah melihat bagian ini.
               */}
              {slip.deductiblesSection1.length ||
              slip.deductiblesSection2.length ? (
                <div className="flex flex-col gap-3 rounded-xl border border-dashed p-4">
                  <div>
                    <p className="text-sm font-medium">
                      Deductible lama (belum per cover)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Pindahkan ke cover yang sesuai di atas, lalu hapus dari
                      sini.
                    </p>
                  </div>
                  {slip.deductiblesSection1.length ? (
                    <StringList
                      values={slip.deductiblesSection1}
                      onChange={(v) => set({ deductiblesSection1: v })}
                      placeholder="Contoh: 10% of claim minimum IDR 10,000,000"
                      addLabel="Tambah deductible"
                    />
                  ) : null}
                  {slip.deductiblesSection2.length ? (
                    <StringList
                      values={slip.deductiblesSection2}
                      onChange={(v) => set({ deductiblesSection2: v })}
                      placeholder="Contoh: 14 days waiting period"
                      addLabel="Tambah deductible"
                    />
                  ) : null}
                </div>
              ) : null}

              <Field>
                <FieldLabel htmlFor="special">Special Conditions</FieldLabel>
                <Textarea
                  id="special"
                  rows={3}
                  value={slip.specialConditions ?? ""}
                  onChange={(e) => set({ specialConditions: e.target.value })}
                />
              </Field>

              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Clauses</p>
                <ClausePicker
                  cob={slip.cob}
                  typeOfCover={slip.typeOfCover}
                  selected={slip.clauseIds}
                  overrides={slip.clauseOverrides ?? {}}
                  onChange={(ids) => set({ clauseIds: ids })}
                  onOverridesChange={(o) => set({ clauseOverrides: o })}
                />
              </div>
            </div>
          </SectionCard>

          {/* ---------- Rate & Premium ---------- */}
          <SectionCard
            title="Rate & Premium"
            {...sectionProps("rate")}
            summary={money(payable, slip.currency)}
            action={
              unresolved ? (
                <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                  {unresolved} rate butuh alasan
                </span>
              ) : undefined
            }
          >
            <div className="flex flex-col gap-4">
              {(isProperty || isMotor) && !locked ? (
                <OjkReference
                  mode={isMotor ? "motor" : "property"}
                  occupation={slip.occupation}
                  riskLocation={slip.riskLocation ?? ""}
                  constructionClass={slip.constructionClass}
                  onConstructionClassChange={(code) =>
                    set({ constructionClass: code })
                  }
                  sumInsured={tsi}
                  baseRate={biBaseRate}
                  eqRate={eqRate}
                  onPickRate={applyOjkRate}
                  onPickIndemnity={(months) =>
                    set({ indemnityPeriod: `${months} months` })
                  }
                />
              ) : null}

              {isProperty || isMotor ? (
                <>
                  <CoverRateTable
                    lines={lines}
                    currency={slip.currency}
                    unit={isMotor ? "%" : "‰"}
                    exceptions={slip.rateExceptions}
                    readOnly={locked}
                    onRateChange={(id, rate) =>
                      set({
                        rateLines: slip.rateLines.map((l) =>
                          l.id === id ? { ...l, rate } : l
                        ),
                      })
                    }
                    onExceptionChange={setException}
                  />
                  {isProperty ? (
                    <p className="text-xs text-muted-foreground">
                      Rate dalam per mil (‰). Baris BI dihitung dari sum insured
                      Section 2, sisanya dari Section 1. Batas FLEXAS terisi
                      otomatis dari okupasi dan kelas konstruksi.
                    </p>
                  ) : null}
                </>
              ) : null}

              {isMotor ? (
                <>
                  <LimitRateTable
                    title="Third Party Liability"
                    lines={slip.tplLines}
                    currency={slip.currency}
                    totalLabel="Total TPL"
                    readOnly={locked}
                    onChange={(l) => set({ tplLines: l })}
                  />
                  <LimitRateTable
                    title="Personal Accident"
                    lines={slip.paLines}
                    currency={slip.currency}
                    totalLabel="Total PA"
                    showCoverColumn
                    readOnly={locked}
                    onChange={(l) => set({ paLines: l })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Limit PA: IDR 5.000.000/orang, maks. 4 orang (selain truck
                    &amp; motorcycle) · maks. 2 orang (truck).
                  </p>
                </>
              ) : null}

              {!isProperty && !isMotor ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="rate-std">Rate (‰)</FieldLabel>
                    <NumberInput
                      id="rate-std"
                      preset="rate"
                      placeholder="0,000"
                      value={slip.rateLines[0]?.rate ?? null}
                      onValueChange={(v) =>
                        set({
                          rateLines: slip.rateLines.map((l, i) =>
                            i === 0 ? { ...l, rate: v } : l
                          ),
                        })
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="basis">Basis perhitungan</FieldLabel>
                    <Input
                      id="basis"
                      readOnly
                      className="tabular bg-muted/60"
                      value={money(tsi, slip.currency)}
                    />
                  </Field>
                </div>
              ) : null}

              <div className="flex flex-col gap-3 rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>Total Premium</span>
                  <span className="tabular">
                    {money(premium, slip.currency)}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Field>
                    <FieldLabel htmlFor="disc">Discount (%)</FieldLabel>
                    <NumberInput
                      id="disc"
                      preset="percent"
                      className="bg-background"
                      min={0}
                      max={100}
                      invalid={slip.discountPct < 0 || slip.discountPct > 100}
                      value={slip.discountPct || null}
                      onValueChange={(v) => set({ discountPct: v ?? 0 })}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="admin">Admin Cost</FieldLabel>
                    <NumberInput
                      id="admin"
                      preset="money"
                      className="bg-background"
                      value={slip.adminCost || null}
                      onValueChange={(v) => set({ adminCost: v ?? 0 })}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="stamp">Stamp Duty</FieldLabel>
                    <NumberInput
                      id="stamp"
                      preset="money"
                      className="bg-background"
                      value={slip.stampDuty || null}
                      onValueChange={(v) => set({ stampDuty: v ?? 0 })}
                    />
                  </Field>
                </div>
                {discount > 0 ? (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Discount {percent(slip.discountPct)}</span>
                    <span className="tabular">
                      ({money(discount, slip.currency)})
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between border-t pt-3 text-[15px] font-bold text-primary">
                  <span>Total Payable</span>
                  <span className="tabular">
                    {money(payable, slip.currency)}
                  </span>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ---------- Brokerage ---------- */}
          <SectionCard
            title="Brokerage"
            {...sectionProps("brokerage")}
            summary={percent(effectiveBrokeragePct(slip), 2)}
          >
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="brokerage">Brokerage (%)</FieldLabel>
                  <NumberInput
                    id="brokerage"
                    preset="percent"
                    min={0}
                    max={100}
                    invalid={slip.brokeragePct < 0 || slip.brokeragePct > 100}
                    value={slip.brokeragePct || null}
                    onValueChange={(v) => set({ brokeragePct: v ?? 0 })}
                  />
                </Field>
                <Field orientation="horizontal" className="pb-2">
                  <Switch
                    id="vat"
                    checked={slip.includeVat}
                    onCheckedChange={(v) => set({ includeVat: Boolean(v) })}
                  />
                  <FieldLabel htmlFor="vat" className="font-normal">
                    Include VAT (PPN 2,2%)
                  </FieldLabel>
                </Field>
              </div>
              {brokerageCap != null &&
              effectiveBrokeragePct(slip) > brokerageCap ? (
                <p className="flex items-start gap-1.5 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  Brokerage efektif {percent(
                    effectiveBrokeragePct(slip),
                    2
                  )}{" "}
                  melebihi batas biaya akuisisi OJK {brokerageCap}% untuk{" "}
                  {slip.cob}.
                </p>
              ) : null}
              <div className="grid grid-cols-1 gap-3 rounded-lg border bg-muted/50 p-4 sm:grid-cols-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Effective Brokerage
                  </span>
                  <span className="tabular font-semibold">
                    {percent(effectiveBrokeragePct(slip), 4)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Nilai Brokerage</span>
                  <span className="tabular font-semibold">
                    {money(brokerageAmount(slip), slip.currency)}
                  </span>
                </div>
              </div>
            </div>
          </SectionCard>
        </fieldset>
      </SlipFormBody>

      <SlipFormActions>
        {canDestroy ? (
          <Button variant="destructive" onClick={() => setConfirmDestroy(true)}>
            {slip.status === "Draft" ? (
              <Trash2 data-icon="inline-start" />
            ) : (
              <Ban data-icon="inline-start" />
            )}
            {destroyLabel}
          </Button>
        ) : null}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            render={<Link href="/underwriting" />}
            nativeButton={false}
          >
            {dirty ? "Batal" : "Tutup"}
          </Button>
          {mode === "edit" ? (
            <Button
              variant="outline"
              onClick={() => goTo((id) => `/underwriting/slip/${id}`)}
            >
              <Eye data-icon="inline-start" />
              Lihat Dokumen
            </Button>
          ) : null}
          {!locked ? (
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={!canSave || isPending}
            >
              <Save data-icon="inline-start" />
              {isPending ? "Menyimpan…" : canSave ? "Simpan Draft" : "Tersimpan"}
            </Button>
          ) : null}
          {slip.status === "Draft" ? (
            <Button onClick={startRelease} disabled={isPending}>
              <Send data-icon="inline-start" />
              {isPending ? "Memproses…" : "Release & Generate No. Slip"}
            </Button>
          ) : slip.status === "Released" || slip.status === "Quoted" ? (
            <Button
              onClick={() => goTo((id) => `/underwriting/quotation/edit/${id}`)}
              disabled={isPending}
            >
              <Send data-icon="inline-start" />
              Lanjut ke Quotation Slip
            </Button>
          ) : null}
        </div>
      </SlipFormActions>

      {/* Hal yang harus dilengkapi sebelum release */}
      <AlertDialog
        open={issues != null}
        onOpenChange={(open) => !open && setIssues(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slip belum bisa di-release</AlertDialogTitle>
            <AlertDialogDescription>
              Lengkapi dulu hal berikut, lalu coba lagi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="flex flex-col gap-1.5 text-sm">
            {issues?.map((issue) => (
              <li key={issue} className="flex gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                {issue}
              </li>
            ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel>Mengerti</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmRelease} onOpenChange={setConfirmRelease}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Release placing slip?</AlertDialogTitle>
            <AlertDialogDescription>
              Nomor slip dibuat sekarang dan tidak bisa diubah:{" "}
              <span className="tabular font-semibold text-foreground">
                {buildSlipNo(
                  nextSlipSeq(store.all("slips"), today),
                  slip.coverCode,
                  today
                )}
              </span>
              . Setelah release, slip bisa dilanjutkan ke Quotation Slip.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={doRelease}>Release</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDestroy} onOpenChange={setConfirmDestroy}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {slip.status === "Draft"
                ? "Hapus draft placing slip ini?"
                : `Batalkan slip ${slip.slipNo}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {slip.status === "Draft"
                ? `Draft untuk ${slip.insuredName || "tertanggung"} dihapus permanen karena belum bernomor.`
                : "Slip bernomor tidak dihapus supaya nomor tidak bolong. Statusnya menjadi Dibatalkan dan slip tidak bisa diubah lagi."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Kembali</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={doDestroy}>
              {destroyLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <span className={cn("sr-only")} aria-live="polite">
        {dirty
          ? "Ada perubahan yang belum disimpan"
          : "Semua perubahan tersimpan"}
      </span>
    </PageShell>
  )
}
