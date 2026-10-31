"use client"

import * as React from "react"
import { FileUp, Link2 } from "lucide-react"
import { toast } from "sonner"
import * as z from "zod"

import { createPolicyAction, updatePolicyAction } from "@/app/(app)/policies/actions"
import { FormDrawer } from "@/components/shared/form-drawer"
import { useFormOptions } from "@/components/shared/form-options-provider"
import {
  NumberField,
  SearchSelect,
  SelectInput,
  TextField,
  type Option,
} from "@/components/shared/form-fields"
import { Button } from "@/components/ui/button"
import { FieldGroup, FieldSeparator } from "@/components/ui/field"
import {
  brokerageCapFor,
  sumPercent,
  totalPremium,
  totalSumInsured,
} from "@/lib/calc"
import {
  POLICY_TYPES,
  POLICY_TYPES_WITH_PARENT,
  type ClassOfBusiness,
  type Policy,
  type PolicyFile,
  type PolicyType,
} from "@/lib/data"
import { addMonths, todayIso } from "@/lib/date"
import { cobLabels, coversFor } from "@/lib/form-options"
import { dateShort, money } from "@/lib/format"
import type { ClientOption } from "@/lib/server/clients"
import type { PolicyFormOptions, PolicyInput } from "@/lib/server/policies"
import { newId, store, useCollection } from "@/lib/store"
import { requiredText, validate, type FieldErrors } from "@/lib/validation"

type Draft = Omit<Policy, "id" | "files"> & { id: string | null }

function emptyDraft(): Draft {
  return {
    id: null,
    policyNo: "",
    clientId: null,
    placingSlipId: null,
    parentPolicyId: null,
    insuredName: "",
    insurer: "",
    insurers: [],
    cob: "Property",
    typeOfCover: "",
    inceptionDate: "",
    expiryDate: "",
    currency: "IDR",
    sumInsured: 0,
    premium: 0,
    brokeragePct: 0,
    type: "Baru",
    riskLocation: "",
    cobOjkClassId: null,
    placementLocationId: null,
    groupingInsured: "",
  }
}

// Keeps a saved value selectable after it is deactivated or renamed in master data.
function withCurrent(items: Option[], value: string | null | undefined): Option[] {
  return value && !items.some((i) => i.value === value)
    ? [...items, { label: value, value }]
    : items
}

const schema = z
  .object({
    policyNo: requiredText("No. polis"),
    type: z.enum(POLICY_TYPES as [PolicyType, ...PolicyType[]]),
    parentPolicyId: z.string().nullable(),
    clientId: z
      .string({ error: "Klien wajib dipilih" })
      .min(1, "Klien wajib dipilih"),
    insuredName: requiredText("Nama tertanggung"),
    insurer: requiredText("Asuransi"),
    cob: z.string().min(1),
    currency: z.string().min(1),
    inceptionDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal mulai wajib diisi"),
    expiryDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal berakhir wajib diisi"),
    sumInsured: z.number().nonnegative("Sum insured tidak boleh negatif"),
    premium: z.number(),
    brokeragePct: z
      .number()
      .min(0, "Brokerage tidak boleh negatif")
      .max(100, "Brokerage maksimal 100%"),
  })
  .superRefine((d, ctx) => {
    if (d.expiryDate && d.inceptionDate && d.expiryDate <= d.inceptionDate) {
      ctx.addIssue({
        code: "custom",
        path: ["expiryDate"],
        message: "Tanggal berakhir harus setelah tanggal mulai",
      })
    }
    if (POLICY_TYPES_WITH_PARENT.includes(d.type) && !d.parentPolicyId) {
      ctx.addIssue({
        code: "custom",
        path: ["parentPolicyId"],
        message: `Polis induk wajib dipilih untuk ${d.type}`,
      })
    }
    if ((d.type === "Baru" || d.type === "Renewal") && d.premium <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["premium"],
        message: "Premi polis baru dan renewal harus lebih dari 0",
      })
    }
    if (d.type === "Cancellation" && d.premium > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["premium"],
        message:
          "Pembatalan mencatat pengembalian premi, isi dengan nilai negatif",
      })
    }
  })

export function PolicyForm({
  open,
  onOpenChange,
  policy,
  preset,
  clientOptions,
  formOptions,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Polis yang diedit. Kosong berarti tambah polis baru. */
  policy?: Policy | null
  /** Isian awal, misalnya endorsement dari polis induk. */
  preset?: Partial<Draft>
  clientOptions: ClientOption[]
  formOptions: PolicyFormOptions
}) {
  const clients = useCollection("clients")
  const policies = useCollection("policies")
  const slips = useCollection("slips")

  // Parent memberi `key` baru setiap drawer dibuka, jadi state awal cukup
  // diambil dari props di sini tanpa effect.
  const [draft, setDraft] = React.useState<Draft>(() =>
    policy ? { ...policy } : { ...emptyDraft(), ...preset }
  )
  const [errors, setErrors] = React.useState<FieldErrors>({})
  const [file, setFile] = React.useState<File | null>(null)

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  const clientItems = clientOptions.map((c) => ({ label: c.name, value: c.id }))
  // Slips in the session store may still point at mock client ids; match those by name.
  const clientOptionFor = (id: string | null) =>
    clientOptions.find((c) => c.id === id) ??
    clientOptions.find((c) => c.name === clients.find((x) => x.id === id)?.name)
  const parentItems = policies
    .filter((p) => p.id !== draft.id && p.type !== "Cancellation")
    .map((p) => ({ label: `${p.policyNo} — ${p.insuredName}`, value: p.id }))
  const slipItems = slips
    .filter((s) => s.status === "Quoted" || s.status === "Closed")
    .map((s) => ({
      label: `${s.slipNo ?? "Draft"} — ${s.insuredName}`,
      value: s.id,
    }))
  const needsParent = POLICY_TYPES_WITH_PARENT.includes(draft.type)
  // COB dan type of cover dari master data. Nilai polis lama yang sudah tidak
  // ada di master tetap tampil supaya tidak hilang saat diedit.
  const masterOptions = useFormOptions()
  const cobItems = withCurrent(
    cobLabels(masterOptions).map((c) => ({ label: c, value: c })),
    draft.cob
  ).map((i) => i.value)
  const coverItems = withCurrent(
    coversFor(masterOptions, draft.cob).map((c) => ({
      label: c.name,
      value: c.name,
    })),
    draft.typeOfCover
  ).map((i) => i.value)
  const brokerageCap = brokerageCapFor(draft.cob)
  const insurerItems = withCurrent(
    formOptions.insurers.map((name) => ({ label: name, value: name })),
    draft.insurer
  )
  const currencyItems = withCurrent(
    formOptions.currencies.map((c) => ({ label: `${c.code} — ${c.name}`, value: c.code })),
    draft.currency
  )
  const placementItems = formOptions.placementLocations
    .filter((l) => l.isActive || l.id === draft.placementLocationId)
    .map((l) => ({ label: l.name, value: l.id }))
  const ojkClassItems = formOptions.cobOjkClasses
    .filter((c) => c.isActive || c.id === draft.cobOjkClassId)
    .map((c) => ({ label: c.name, value: c.id }))

  function fromSlip(slipId: string | null) {
    const slip = slipId ? slips.find((s) => s.id === slipId) : null
    if (!slip) {
      set({ placingSlipId: null })
      return
    }
    const panel = slip.securityPanel?.filter((r) => r.insurer) ?? []
    const leader = panel.find((r) => r.role === "As Leader") ?? panel[0]
    const client = clientOptionFor(slip.clientId)
    set({
      placingSlipId: slip.id,
      clientId: client?.id ?? slip.clientId,
      insuredName: client?.name ?? slip.insuredName,
      cob: slip.cob,
      typeOfCover: slip.typeOfCover,
      currency: slip.currency,
      inceptionDate: slip.inceptionDate ?? "",
      expiryDate: slip.expiryDate ?? "",
      sumInsured: totalSumInsured(slip),
      premium: totalPremium(slip),
      brokeragePct: slip.brokeragePct,
      riskLocation: slip.riskLocation ?? "",
      insurer: leader?.insurer ?? "",
      insurers: panel,
    })
  }

  function fromParent(parentId: string | null) {
    const parent = parentId ? policies.find((p) => p.id === parentId) : null
    if (!parent) {
      set({ parentPolicyId: null })
      return
    }
    const renewal = draft.type === "Renewal"
    set({
      parentPolicyId: parent.id,
      clientId: parent.clientId,
      insuredName: parent.insuredName,
      insurer: parent.insurer,
      insurers: parent.insurers,
      cob: parent.cob,
      typeOfCover: parent.typeOfCover ?? "",
      currency: parent.currency,
      riskLocation: parent.riskLocation,
      brokeragePct: parent.brokeragePct,
      cobOjkClassId: parent.cobOjkClassId,
      placementLocationId: parent.placementLocationId,
      groupingInsured: parent.groupingInsured,
      sumInsured: renewal ? parent.sumInsured : draft.sumInsured,
      // Renewal melanjutkan periode; endorsement dan pembatalan ikut sisa periode induk.
      inceptionDate: renewal ? parent.expiryDate : draft.inceptionDate,
      expiryDate: renewal
        ? addMonths(parent.expiryDate, 12)
        : parent.expiryDate,
    })
  }

  async function submit() {
    const result = validate(schema, draft)
    const errs = { ...result.errors }
    const duplicate = policies.find(
      (p) =>
        p.id !== draft.id &&
        p.policyNo.trim().toLowerCase() === draft.policyNo.trim().toLowerCase()
    )
    if (duplicate) errs.policyNo = "No. polis sudah terdaftar"
    setErrors(errs)
    if (!result.ok || duplicate) return false

    const insurers =
      draft.insurers.length &&
      draft.insurers.some((r) => r.insurer === draft.insurer)
        ? draft.insurers
        : [
            {
              id: newId("pi"),
              insurer: draft.insurer,
              share: 100,
              role: "As Leader" as const,
            },
          ]
    const { id, ...fields } = draft
    const input: PolicyInput = {
      ...fields,
      policyNo: draft.policyNo.trim(),
      insuredName: draft.insuredName.trim(),
      insurers,
    }
    const res = id ? await updatePolicyAction(id, input) : await createPolicyAction(input)
    if (!res.ok || !res.data) {
      toast.error("Gagal menyimpan polis", { description: res.error })
      return false
    }

    // Softcopies are not uploaded to storage yet; they stay as object URLs in this tab.
    const sessionFiles = (id ? store.get("policies", id)?.files ?? [] : []).filter(
      (f) => f.url && !res.data?.files.some((x) => x.id === f.id)
    )
    const files: PolicyFile[] = [...res.data.files, ...sessionFiles]
    if (file) {
      files.push({
        id: newId("pf"),
        version: files.length + 1,
        fileName: file.name,
        uploadedAt: todayIso(),
        url: URL.createObjectURL(file),
      })
    }
    const record: Policy = { ...res.data, files }
    store.upsert("policies", record)
    toast.success(id ? "Polis diperbarui" : "Polis tersimpan", {
      description: `${record.policyNo} · ${record.insuredName}`,
    })
    onOpenChange(false)
  }

  const coShare = sumPercent(draft.insurers.map((r) => r.share))

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={policy ? "Edit Polis" : "Tambah Polis"}
      description="Data polis yang sudah terbit dari perusahaan asuransi. Field bertanda * wajib diisi."
      onSubmit={submit}
    >
      <FieldGroup>
        {!policy ? (
          <SearchSelect
            label="Ambil dari placing slip"
            items={slipItems}
            value={draft.placingSlipId}
            onValueChange={fromSlip}
            placeholder="Pilih slip Quoted atau Closed (opsional)"
            emptyMessage="Belum ada slip yang Quoted atau Closed"
            description="Tertanggung, COB, periode, nilai, dan panel asuransi terisi dari slip."
          />
        ) : draft.placingSlipId ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link2 className="size-3.5" />
            Terhubung ke placing slip{" "}
            {slips.find((s) => s.id === draft.placingSlipId)?.slipNo ??
              policy.placingSlipNo}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="No. Polis"
            required
            value={draft.policyNo}
            onChange={(v) => set({ policyNo: v })}
            placeholder="PAR/2026/JKT/…"
            error={errors.policyNo}
          />
          <SelectInput
            label="Tipe Polis"
            required
            items={POLICY_TYPES}
            value={draft.type}
            onValueChange={(v) => set({ type: v as PolicyType })}
            error={errors.type}
            description={
              draft.type !== "Endorsement"
                ? undefined
                : policy?.endorsementSeq && policy.parentPolicyId === draft.parentPolicyId
                  ? `Endorsement ke-${policy.endorsementSeq} pada polis induk.`
                  : "Nomor urut endorsement diisi otomatis saat disimpan."
            }
          />
          {needsParent ? (
            <SearchSelect
              className="sm:col-span-2"
              label="Polis Induk"
              required
              items={parentItems}
              value={draft.parentPolicyId}
              onValueChange={fromParent}
              placeholder="Cari no. polis atau tertanggung"
              error={errors.parentPolicyId}
              description={
                draft.type === "Renewal"
                  ? "Periode baru melanjutkan tanggal berakhir polis induk."
                  : "Tertanggung, asuransi, dan share mengikuti polis induk."
              }
            />
          ) : null}
        </div>

        <FieldSeparator />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SearchSelect
            className="sm:col-span-2"
            label="Klien"
            required
            items={clientItems}
            value={draft.clientId}
            onValueChange={(id) => {
              const client = clientOptions.find((c) => c.id === id)
              set({
                clientId: id,
                insuredName: client?.name ?? draft.insuredName,
              })
            }}
            placeholder="Cari nama klien"
            emptyMessage="Klien belum terdaftar. Tambahkan dulu di menu Marketing."
            error={errors.clientId}
          />
          <TextField
            className="sm:col-span-2"
            label="Nama Tertanggung"
            required
            placeholder="PT Nama Klien / Perorangan"
            value={draft.insuredName}
            onChange={(v) => set({ insuredName: v })}
            description="Disalin dari klien, boleh ditambah misalnya “and/or Subsidiary Companies”."
            error={errors.insuredName}
          />
          <SelectInput
            className="sm:col-span-2"
            label="Asuransi (Leader)"
            required
            items={insurerItems}
            value={draft.insurer}
            onValueChange={(v) => set({ insurer: v })}
            error={errors.insurer}
          />
          {draft.insurers.length > 1 ? (
            <div className="rounded-lg bg-muted/60 px-3 py-2 text-xs sm:col-span-2">
              <p className="mb-1 font-medium">
                Co-insurance dari slip · total {coShare}%
              </p>
              {draft.insurers.map((r) => (
                <p key={r.id} className="flex justify-between gap-3">
                  <span className="truncate">{r.insurer}</span>
                  <span className="tabular shrink-0">
                    {r.share}% · {r.role.replace("As ", "")}
                  </span>
                </p>
              ))}
            </div>
          ) : null}
          <SelectInput
            label="Class of Business"
            required
            items={cobItems}
            value={draft.cob}
            onValueChange={(v) =>
              set({ cob: v as ClassOfBusiness, typeOfCover: "" })
            }
          />
          <SelectInput
            label="Type of Cover"
            items={coverItems}
            value={draft.typeOfCover ?? ""}
            onValueChange={(v) => set({ typeOfCover: v })}
          />
          <TextField
            label="Tanggal Mulai"
            required
            type="date"
            value={draft.inceptionDate}
            onChange={(v) => set({ inceptionDate: v })}
            error={errors.inceptionDate}
          />
          <TextField
            label="Tanggal Berakhir"
            required
            type="date"
            value={draft.expiryDate}
            onChange={(v) => set({ expiryDate: v })}
            error={errors.expiryDate}
          />
        </div>

        <FieldSeparator />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectInput
            label="Mata Uang"
            required
            items={currencyItems}
            value={draft.currency}
            onValueChange={(v) => set({ currency: v })}
          />
          <NumberField
            label="Total Sum Insured"
            value={draft.sumInsured}
            onValueChange={(v) => set({ sumInsured: v ?? 0 })}
            error={errors.sumInsured}
          />
          <NumberField
            label="Premium"
            required
            value={draft.premium}
            onValueChange={(v) => set({ premium: v ?? 0 })}
            error={errors.premium}
            description={
              draft.type === "Endorsement" || draft.type === "Cancellation"
                ? "Tambahan premi positif, pengembalian premi negatif."
                : money(draft.premium, draft.currency)
            }
          />
          <NumberField
            label="Brokerage (%)"
            preset="percent"
            value={draft.brokeragePct}
            onValueChange={(v) => set({ brokeragePct: v ?? 0 })}
            error={errors.brokeragePct}
            description={
              brokerageCap != null && draft.brokeragePct > brokerageCap
                ? `Melebihi batas biaya akuisisi OJK ${brokerageCap}% untuk ${draft.cob}.`
                : undefined
            }
          />
          <TextField
            className="sm:col-span-2"
            label="Risk Location"
            multiline
            rows={2}
            placeholder="Alamat objek / lokasi pertanggungan"
            value={draft.riskLocation}
            onChange={(v) => set({ riskLocation: v })}
          />
        </div>

        <FieldSeparator />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectInput
            label="Klasifikasi OJK"
            items={ojkClassItems}
            value={draft.cobOjkClassId}
            onValueChange={(v) => set({ cobOjkClassId: v || null })}
            placeholder={ojkClassItems.length ? "Pilih klasifikasi" : "Belum ada data"}
            description={
              ojkClassItems.length
                ? "Untuk laporan produksi OJK, terpisah dari COB internal."
                : "Isi daftarnya di Master Data, tab Klasifikasi OJK."
            }
          />
          <SelectInput
            label="Lokasi Penempatan"
            items={placementItems}
            value={draft.placementLocationId}
            onValueChange={(v) => set({ placementLocationId: v || null })}
          />
          <TextField
            className="sm:col-span-2"
            label="Grouping Insured"
            placeholder="Contoh: Grup Sinar Mas"
            value={draft.groupingInsured ?? ""}
            onChange={(v) => set({ groupingInsured: v })}
            description="Pengelompokan klien untuk laporan produksi."
          />
        </div>

        <FieldSeparator />

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Softcopy Polis</p>
          {policy?.files.length ? (
            <p className="text-xs text-muted-foreground">
              Versi terakhir v{policy.files[policy.files.length - 1].version} ·{" "}
              {policy.files[policy.files.length - 1].fileName} ·{" "}
              {dateShort(policy.files[policy.files.length - 1].uploadedAt)}.
              File baru disimpan sebagai versi berikutnya.
            </p>
          ) : null}
          <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/30">
            <input
              type="file"
              accept="application/pdf,image/*"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              render={<span />}
              nativeButton={false}
            >
              <FileUp data-icon="inline-start" />
              {file ? "Ganti file" : "Pilih file PDF"}
            </Button>
            <span className="max-w-72 truncate text-xs text-muted-foreground">
              {file ? file.name : "Belum ada file dipilih"}
            </span>
          </label>
        </div>
      </FieldGroup>
    </FormDrawer>
  )
}
