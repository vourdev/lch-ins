"use client"

import * as React from "react"
import { FileUp, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import * as z from "zod"

import {
  createClientAction,
  updateClientAction,
} from "@/app/(app)/marketing/actions"
import { FormDrawer } from "@/components/shared/form-drawer"
import { SelectInput, TextField } from "@/components/shared/form-fields"
import { Button } from "@/components/ui/button"
import { FieldGroup, FieldSeparator } from "@/components/ui/field"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  ADDRESS_TYPES,
  CLASSES_OF_BUSINESS,
  CLIENT_DOCUMENT_TYPES,
  CLIENT_STATUSES,
  CLIENT_TYPES,
  ID_TYPES,
  INCOME_SOURCES,
  INSURANCE_PURPOSES,
  type ClassOfBusiness,
  type Client,
  type ClientAddress,
  type ClientDocument,
  type ClientStatus,
  type ClientType,
} from "@/lib/data"
import { todayIso } from "@/lib/date"
import { newId, store } from "@/lib/store"
import {
  email,
  nik,
  npwp,
  requiredText,
  validate,
  type FieldErrors,
} from "@/lib/validation"

type Draft = Omit<Client, "id" | "createdAt"> & {
  id: string | null
  createdAt: string
}

function emptyDraft(): Draft {
  return {
    id: null,
    clientType: "Korporasi",
    name: "",
    npwp: "",
    idType: "KTP",
    idNumber: "",
    birthPlace: "",
    birthDate: "",
    contactPerson: "",
    contactPersonIdNumber: "",
    email: "",
    phone: "",
    incomeSource: "",
    insurancePurpose: "",
    insurancePurposeNote: "",
    kycDate: todayIso(),
    cob: "Property",
    status: "Prospect",
    addresses: [
      {
        id: newId("a"),
        label: "Alamat Korespondensi",
        value: "",
        isPrimary: true,
      },
    ],
    documents: [],
    notes: "",
    createdAt: todayIso(),
  }
}

const schema = z
  .object({
    clientType: z.enum(["Korporasi", "Perorangan"]),
    name: requiredText("Nama"),
    npwp,
    idNumber: z.string().optional(),
    idType: z.string().optional(),
    contactPerson: z.string(),
    contactPersonIdNumber: nik,
    email,
    phone: z
      .string()
      .trim()
      .refine(
        (v) => v === "" || /^[+\d][\d\s()-]{6,}$/.test(v),
        "Format telepon tidak valid"
      ),
    insurancePurpose: z.string().optional(),
    insurancePurposeNote: z.string().optional(),
    addresses: z
      .array(
        z.object({
          label: requiredText("Jenis alamat"),
          value: requiredText("Alamat"),
        })
      )
      .min(1, "Minimal satu alamat"),
    documents: z.array(
      z.object({ type: requiredText("Jenis berkas"), fileName: z.string() })
    ),
  })
  .superRefine((d, ctx) => {
    if (d.clientType === "Korporasi" && !d.contactPerson.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["contactPerson"],
        message: "Nama PIC wajib diisi untuk klien korporasi",
      })
    }
    if (
      d.clientType === "Perorangan" &&
      d.idType === "KTP" &&
      d.idNumber &&
      !/^\d{16}$/.test(d.idNumber.replace(/\s/g, ""))
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["idNumber"],
        message: "Nomor KTP harus 16 digit angka",
      })
    }
    if (d.insurancePurpose === "Lain-lain" && !d.insurancePurposeNote?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["insurancePurposeNote"],
        message: "Jelaskan tujuan menutup asuransi",
      })
    }
  })

export function ClientForm({
  open,
  onOpenChange,
  client,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  client?: Client | null
  onSaved?: (client: Client) => void
}) {
  const [draft, setDraft] = React.useState<Draft>(() =>
    client ? { ...client } : emptyDraft()
  )
  const [errors, setErrors] = React.useState<FieldErrors>({})
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))
  const corporate = draft.clientType === "Korporasi"

  function patchAddress(id: string, patch: Partial<ClientAddress>) {
    set({
      addresses: draft.addresses.map((a) =>
        a.id === id
          ? { ...a, ...patch }
          : patch.isPrimary
            ? { ...a, isPrimary: false }
            : a
      ),
    })
  }

  function patchDocument(id: string, patch: Partial<ClientDocument>) {
    set({
      documents: draft.documents.map((d) =>
        d.id === id ? { ...d, ...patch } : d
      ),
    })
  }

  async function submit() {
    // Duplicate names are rejected by the server, which checks the real client table.
    const result = validate(schema, draft)
    setErrors(result.errors)
    if (!result.ok) return false

    const addresses = draft.addresses.some((a) => a.isPrimary)
      ? draft.addresses
      : draft.addresses.map((a, i) => ({ ...a, isPrimary: i === 0 }))

    const payload = {
      clientType: draft.clientType,
      name: draft.name.trim(),
      npwp: draft.npwp || null,
      idType: corporate ? null : draft.idType || null,
      idNumber: corporate ? null : draft.idNumber || null,
      birthPlace: corporate ? null : draft.birthPlace || null,
      birthDate: !corporate && draft.birthDate ? draft.birthDate : null,
      contactPerson: corporate
        ? draft.contactPerson || null
        : draft.contactPerson || draft.name.trim(),
      contactPersonIdNumber: corporate
        ? draft.contactPersonIdNumber || null
        : null,
      email: draft.email || null,
      phone: draft.phone || null,
      incomeSource: corporate ? null : draft.incomeSource || null,
      insurancePurpose: draft.insurancePurpose || null,
      insurancePurposeNote: draft.insurancePurposeNote || null,
      kycDate: draft.kycDate || null,
      cob: draft.cob,
      status: draft.status,
      notes: draft.notes || null,
      addresses: addresses.map((a) => ({
        id: a.id,
        label: a.label,
        value: a.value,
        isPrimary: a.isPrimary,
      })),
      documents: draft.documents
        .filter((d) => d.fileName)
        .map((d) => ({
          id: d.id,
          type: d.type,
          fileName: d.fileName,
          url: d.url,
        })),
    }

    if (draft.id) {
      const res = await updateClientAction(draft.id, payload)
      if (!res.ok || !res.data) {
        toast.error(res.error || "Gagal memperbarui data klien")
        return false
      }
      const record = res.data
      store.upsert("clients", record)
      toast.success("Data klien diperbarui", { description: record.name })
      onSaved?.(record)
      onOpenChange(false)
      return true
    } else {
      const res = await createClientAction(payload)
      if (!res.ok || !res.data) {
        toast.error(res.error || "Gagal menambahkan klien baru")
        return false
      }
      const record = res.data
      store.upsert("clients", record)
      toast.success("Klien tersimpan", { description: record.name })
      onSaved?.(record)
      onOpenChange(false)
      return true
    }
  }

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={client ? "Edit Klien" : "Tambah Klien Baru"}
      description="Mengikuti form KYC LCH. Field bertanda * wajib diisi."
      onSubmit={submit}
    >
      <FieldGroup>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Tipe Klien</p>
          <ToggleGroup
            value={[draft.clientType]}
            onValueChange={(v) => {
              const next = (v as string[])[0] as ClientType | undefined
              if (next) set({ clientType: next })
            }}
            aria-label="Tipe klien"
          >
            {CLIENT_TYPES.map((t) => (
              <ToggleGroupItem key={t} value={t}>
                {t}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            className="sm:col-span-2"
            label={corporate ? "Nama Perusahaan" : "Nama Lengkap"}
            required
            autoFocus
            value={draft.name}
            onChange={(v) => set({ name: v })}
            placeholder={
              corporate ? "PT Contoh Sejahtera" : "Sesuai kartu identitas"
            }
            error={errors.name}
          />
          <SelectInput
            label="Class of Business Utama"
            required
            items={CLASSES_OF_BUSINESS}
            value={draft.cob}
            onValueChange={(v) => set({ cob: v as ClassOfBusiness })}
          />
          <SelectInput
            label="Status"
            required
            items={CLIENT_STATUSES}
            value={draft.status}
            onValueChange={(v) => set({ status: v as ClientStatus })}
          />
        </div>

        <FieldSeparator>
          {corporate ? "Identitas Perusahaan" : "Identitas Tertanggung"}
        </FieldSeparator>

        {corporate ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="NPWP Perusahaan"
              value={draft.npwp}
              onChange={(v) => set({ npwp: v.replace(/[^0-9.-]/g, "") })}
              placeholder="00.000.000.0-000.000"
              inputMode="numeric"
              maxLength={20}
              error={errors.npwp}
            />
            <TextField
              label="Nama PIC"
              required
              value={draft.contactPerson}
              onChange={(v) => set({ contactPerson: v })}
              placeholder="Bpk. / Ibu"
              error={errors.contactPerson}
            />
            <TextField
              label="No. KTP PIC"
              value={draft.contactPersonIdNumber ?? ""}
              onChange={(v) => set({ contactPersonIdNumber: v })}
              placeholder="16 digit"
              inputMode="numeric"
              digitsOnly
              maxLength={16}
              error={errors.contactPersonIdNumber}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectInput
              label="Jenis Identitas"
              items={ID_TYPES}
              value={draft.idType ?? ""}
              onValueChange={(v) => set({ idType: v })}
            />
            <TextField
              label="Nomor Identitas"
              value={draft.idNumber ?? ""}
              onChange={(v) => set({ idNumber: v })}
              placeholder={
                draft.idType === "KTP" ? "16 digit NIK" : "Nomor dokumen"
              }
              digitsOnly={draft.idType === "KTP"}
              maxLength={draft.idType === "KTP" ? 16 : 30}
              error={errors.idNumber}
            />
            <TextField
              label="Tempat Lahir"
              value={draft.birthPlace ?? ""}
              onChange={(v) => set({ birthPlace: v })}
              placeholder="Kota kelahiran"
            />
            <TextField
              label="Tanggal Lahir"
              type="date"
              value={draft.birthDate ?? ""}
              onChange={(v) => set({ birthDate: v })}
            />
            <TextField
              label="NPWP"
              value={draft.npwp}
              onChange={(v) => set({ npwp: v.replace(/[^0-9.-]/g, "") })}
              placeholder="Opsional"
              inputMode="numeric"
              maxLength={20}
              error={errors.npwp}
            />
            <SelectInput
              label="Sumber Penghasilan"
              items={INCOME_SOURCES}
              value={draft.incomeSource ?? ""}
              onValueChange={(v) => set({ incomeSource: v })}
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Email"
            type="email"
            value={draft.email}
            onChange={(v) => set({ email: v })}
            placeholder="nama@perusahaan.co.id"
            error={errors.email}
          />
          <TextField
            label="Telepon"
            type="tel"
            prefix="+62"
            value={draft.phone}
            onChange={(v) => set({ phone: v })}
            placeholder="21 555 1234 atau 812 3456 7890"
            error={errors.phone}
          />
          <SelectInput
            label="Tujuan Menutup Asuransi"
            items={INSURANCE_PURPOSES}
            value={draft.insurancePurpose ?? ""}
            onValueChange={(v) => set({ insurancePurpose: v })}
          />
          <TextField
            label="Tanggal KYC"
            type="date"
            value={draft.kycDate ?? ""}
            onChange={(v) => set({ kycDate: v })}
          />
          {draft.insurancePurpose === "Lain-lain" ? (
            <TextField
              className="sm:col-span-2"
              label="Keterangan tujuan"
              required
              value={draft.insurancePurposeNote ?? ""}
              onChange={(v) => set({ insurancePurposeNote: v })}
              placeholder="Contoh: Pembiayaan sindikasi, agunan kredit, dsb."
              error={errors.insurancePurposeNote}
            />
          ) : null}
        </div>

        <FieldSeparator>Alamat</FieldSeparator>

        <div className="flex flex-col gap-3">
          {errors.addresses ? (
            <p className="text-xs text-destructive">{errors.addresses}</p>
          ) : null}
          {draft.addresses.map((a, i) => (
            <div
              key={a.id}
              className="flex flex-col gap-3 rounded-xl border p-3"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start">
                <SelectInput
                  label="Jenis Alamat"
                  required
                  items={ADDRESS_TYPES}
                  value={a.label}
                  onValueChange={(v) => patchAddress(a.id, { label: v })}
                  error={errors[`addresses.${i}.label`]}
                />
                <TextField
                  label="Telepon"
                  type="tel"
                  prefix="+62"
                  value={a.phone ?? ""}
                  placeholder="21 555 1234"
                  onChange={(v) => patchAddress(a.id, { phone: v })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Hapus alamat"
                  className="sm:mt-7 text-muted-foreground hover:text-destructive"
                  disabled={draft.addresses.length === 1}
                  onClick={() =>
                    set({
                      addresses: draft.addresses.filter((x) => x.id !== a.id),
                    })
                  }
                >
                  <Trash2 />
                </Button>
              </div>
              <TextField
                label="Alamat Lengkap"
                required
                multiline
                rows={2}
                value={a.value}
                placeholder="Jl. Jend. Sudirman Kav. …, Gedung …, Lantai …"
                onChange={(v) => patchAddress(a.id, { value: v })}
                error={errors[`addresses.${i}.value`]}
              />
              <label className="flex w-fit items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="radio"
                  name="primary-address"
                  checked={Boolean(a.isPrimary)}
                  onChange={() => patchAddress(a.id, { isPrimary: true })}
                  className="accent-primary"
                />
                Alamat utama
              </label>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() =>
              set({
                addresses: [
                  ...draft.addresses,
                  {
                    id: newId("a"),
                    label:
                      ADDRESS_TYPES.find(
                        (t) => !draft.addresses.some((x) => x.label === t)
                      ) ?? ADDRESS_TYPES[0],
                    value: "",
                  },
                ],
              })
            }
          >
            <Plus data-icon="inline-start" />
            Tambah alamat
          </Button>
        </div>

        <FieldSeparator>Berkas KYC</FieldSeparator>

        <div className="flex flex-col gap-2">
          {draft.documents.map((d, i) => (
            <div
              key={d.id}
              className="grid grid-cols-1 gap-2 rounded-xl border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center"
            >
              <SelectInput
                label="Jenis Berkas"
                items={CLIENT_DOCUMENT_TYPES}
                value={d.type}
                onValueChange={(v) => patchDocument(d.id, { type: v })}
                error={errors[`documents.${i}.type`]}
              />
              <label className="flex min-w-0 cursor-pointer flex-col gap-1.5 rounded-lg has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/30">
                <span className="text-sm font-medium">File</span>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      patchDocument(d.id, {
                        fileName: file.name,
                        uploadedAt: todayIso(),
                        url: URL.createObjectURL(file),
                      })
                    }
                  }}
                />
                <span className="flex h-9 items-center gap-2 truncate rounded-lg bg-input/50 px-3 text-sm">
                  <FileUp className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">
                    {d.fileName || "Pilih file…"}
                  </span>
                </span>
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Hapus berkas"
                className="self-end text-muted-foreground hover:text-destructive"
                onClick={() =>
                  set({
                    documents: draft.documents.filter((x) => x.id !== d.id),
                  })
                }
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() =>
              set({
                documents: [
                  ...draft.documents,
                  {
                    id: newId("d"),
                    type: corporate
                      ? "Copy NPWP"
                      : "Copy KTP, SIM, atau paspor",
                    fileName: "",
                    uploadedAt: todayIso(),
                  },
                ],
              })
            }
          >
            <Plus data-icon="inline-start" />
            Tambah berkas
          </Button>
          <p className="text-xs text-muted-foreground">
            PDF atau gambar. Berkas tanpa file tidak ikut disimpan.
          </p>
        </div>

        <TextField
          label="Catatan"
          multiline
          rows={2}
          value={draft.notes ?? ""}
          onChange={(v) => set({ notes: v })}
          placeholder="Catatan internal (opsional)"
        />
      </FieldGroup>
    </FormDrawer>
  )
}
