"use client"

import * as React from "react"
import { toast } from "sonner"
import * as z from "zod"

import {
  createSppaAction,
  updateSppaAction,
  type ActionResponse,
} from "@/app/(app)/marketing/actions"
import { FormDrawer } from "@/components/shared/form-drawer"
import {
  NumberField,
  SearchSelect,
  SelectInput,
  TextField,
} from "@/components/shared/form-fields"
import { FieldGroup, FieldSeparator } from "@/components/ui/field"
import {
  CLASSES_OF_BUSINESS,
  CURRENCIES,
  SPPA_QUESTIONS,
  TYPE_OF_COVER,
  type ClassOfBusiness,
  type Sppa,
  type SppaStatus,
} from "@/lib/data"
import { OCCUPATION_TARIFFS } from "@/lib/data/ojk-tariff"
import { addMonths, todayIso } from "@/lib/date"
import type { SppaInput, SppaRecord } from "@/lib/server/sppa"
import { store, useCollection } from "@/lib/store"
import { requiredText, validate, type FieldErrors } from "@/lib/validation"

type Draft = Omit<Sppa, "id"> & { id: string | null }

const OCCUPATION_ITEMS = OCCUPATION_TARIFFS.map((o) => {
  const label = `${o.code} - ${o.name}`
  return { label, value: label }
})

const schema = z
  .object({
    clientId: z
      .string({ error: "Klien wajib dipilih" })
      .min(1, "Klien wajib dipilih"),
    cob: z.string().min(1),
    typeOfCover: requiredText("Type of cover"),
    insuredName: requiredText("Nama tertanggung"),
    riskLocation: requiredText("Lokasi risiko"),
    sumInsured: z.number().positive("Nilai pertanggungan wajib diisi"),
    periodStart: z.string().nullable(),
    periodEnd: z.string().nullable(),
  })
  .superRefine((d, ctx) => {
    if (d.periodStart && d.periodEnd && d.periodEnd <= d.periodStart) {
      ctx.addIssue({
        code: "custom",
        path: ["periodEnd"],
        message: "Akhir periode harus setelah awal periode",
      })
    }
  })

export function SppaForm({
  open,
  onOpenChange,
  sppa,
  clientId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sppa?: Sppa | null
  /** Klien terpilih saat SPPA dibuat dari halaman detail klien. */
  clientId?: string | null
}) {
  const clients = useCollection("clients")
  const [draft, setDraft] = React.useState<Draft>(() => {
    if (sppa) return { ...sppa }
    const client = clients.find((c) => c.id === clientId)
    const start = todayIso()
    return {
      id: null,
      clientId: client?.id ?? "",
      cob: client?.cob ?? "Property",
      typeOfCover: "",
      insuredName: client?.name ?? "",
      riskLocation: "",
      occupation: "",
      currency: "IDR",
      sumInsured: 0,
      periodStart: start,
      periodEnd: addMonths(start, 12),
      answers: {},
      status: "Draft",
      createdAt: start,
      updatedAt: start,
    }
  })
  const [errors, setErrors] = React.useState<FieldErrors>({})
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  const questions = SPPA_QUESTIONS[draft.cob] ?? []
  const coverItems = (TYPE_OF_COVER[draft.cob] ?? []).map((t) => t.label)

  async function submit() {
    const result = validate(schema, draft)
    setErrors(result.errors)
    if (!result.ok) return false

    const sppaInput: SppaInput = {
      clientId: draft.clientId,
      cob: draft.cob,
      typeOfCover: draft.typeOfCover,
      insuredName: draft.insuredName,
      riskLocation: draft.riskLocation || null,
      occupation: draft.occupation || null,
      currency: draft.currency || "IDR",
      sumInsured: draft.sumInsured,
      periodStart: draft.periodStart || null,
      periodEnd: draft.periodEnd || null,
      answers: draft.answers,
      status: draft.status,
    }

    let res: ActionResponse<SppaRecord>
    if (draft.id) {
      res = await updateSppaAction(draft.id, sppaInput)
    } else {
      res = await createSppaAction(sppaInput)
    }

    if (!res.ok || !res.data) {
      toast.error(res.error || "Gagal menyimpan data SPPA")
      return false
    }

    store.upsert("sppa", res.data)
    toast.success(draft.id ? "SPPA diperbarui" : "SPPA tersimpan", {
      description: `${res.data.insuredName} · ${res.data.cob}`,
    })
    onOpenChange(false)
    return true
  }

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={sppa ? "Edit SPPA" : "SPPA Baru"}
      description="Surat Permintaan Penutupan Asuransi dari klien. Placing slip bisa dibuat dari SPPA ini."
      onSubmit={submit}
    >
      <FieldGroup>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SearchSelect
            className="sm:col-span-2"
            label="Klien"
            required
            items={clients.map((c) => ({ label: c.name, value: c.id }))}
            value={draft.clientId || null}
            onValueChange={(id) => {
              const client = clients.find((c) => c.id === id)
              set({
                clientId: id ?? "",
                insuredName: client?.name ?? "",
                cob: client?.cob ?? draft.cob,
                typeOfCover:
                  client && client.cob !== draft.cob ? "" : draft.typeOfCover,
              })
            }}
            placeholder="Cari nama klien"
            emptyMessage="Klien belum terdaftar. Tambahkan dulu di tab Database Klien."
            error={errors.clientId}
          />
          <TextField
            className="sm:col-span-2"
            label="Nama Tertanggung"
            required
            placeholder="PT Nama Klien atau Nama Perorangan"
            value={draft.insuredName}
            onChange={(v) => set({ insuredName: v })}
            error={errors.insuredName}
          />
          <SelectInput
            label="Class of Business"
            required
            items={CLASSES_OF_BUSINESS}
            value={draft.cob}
            onValueChange={(v) =>
              set({ cob: v as ClassOfBusiness, typeOfCover: "", answers: {} })
            }
          />
          <SelectInput
            label="Type of Cover"
            required
            items={coverItems}
            value={draft.typeOfCover}
            onValueChange={(v) => set({ typeOfCover: v })}
            placeholder="Pilih jenis penutupan"
            error={errors.typeOfCover}
          />
          {draft.cob === "Property" ? (
            <SearchSelect
              className="sm:col-span-2"
              label="Okupasi (OJK)"
              items={OCCUPATION_ITEMS}
              value={draft.occupation || null}
              onValueChange={(v) => set({ occupation: v ?? "" })}
              placeholder="Cari kode atau nama okupasi"
              emptyMessage="Okupasi tidak ada di daftar OJK"
            />
          ) : null}
          <TextField
            className="sm:col-span-2"
            label={
              draft.cob === "Motor Vehicle"
                ? "Domisili Kendaraan"
                : "Lokasi Risiko"
            }
            required
            multiline
            rows={2}
            placeholder="Alamat objek atau domisili kendaraan"
            value={draft.riskLocation}
            onChange={(v) => set({ riskLocation: v })}
            error={errors.riskLocation}
          />
        </div>

        <FieldSeparator />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectInput
            label="Mata Uang"
            items={CURRENCIES}
            value={draft.currency}
            onValueChange={(v) => set({ currency: v })}
            placeholder="Pilih mata uang"
          />
          <NumberField
            label="Nilai Pertanggungan"
            required
            value={draft.sumInsured}
            onValueChange={(v) => set({ sumInsured: v ?? 0 })}
            placeholder="0"
            error={errors.sumInsured}
          />
          <TextField
            label="Periode Mulai"
            type="date"
            value={draft.periodStart ?? ""}
            onChange={(v) => set({ periodStart: v || null })}
            placeholder="YYYY-MM-DD"
          />
          <TextField
            label="Periode Berakhir"
            type="date"
            value={draft.periodEnd ?? ""}
            onChange={(v) => set({ periodEnd: v || null })}
            placeholder="YYYY-MM-DD"
            error={errors.periodEnd}
          />
          <SelectInput
            label="Status"
            items={[
              { label: "Draft", value: "Draft" },
              {
                label: "Submitted (sudah ditandatangani klien)",
                value: "Submitted",
              },
            ]}
            value={draft.status}
            onValueChange={(v) => set({ status: v as SppaStatus })}
            placeholder="Pilih status SPPA"
          />
        </div>

        {questions.length ? (
          <>
            <FieldSeparator>Isian {draft.cob}</FieldSeparator>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {questions.map((q) => (
                <TextField
                  key={q.key}
                  label={q.label}
                  value={draft.answers[q.key] ?? ""}
                  placeholder={q.placeholder}
                  onChange={(v) =>
                    set({ answers: { ...draft.answers, [q.key]: v } })
                  }
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Pertanyaan per COB masih usulan dan akan disesuaikan dengan contoh
              form SPPA LCH.
            </p>
          </>
        ) : null}
      </FieldGroup>
    </FormDrawer>
  )
}
