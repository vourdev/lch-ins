"use client"

import Link from "next/link"
import { Check, ExternalLink, Pencil } from "lucide-react"

import { SearchSelect } from "@/components/shared/form-fields"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { correspondenceAddress as defaultAddress } from "@/lib/data"
import { maskMiddle } from "@/lib/format"
import { useCollection } from "@/lib/store"

/**
 * Tertanggung dipilih dari data klien (PRD A-08). Nama dan alamat disalin ke
 * slip dan boleh diedit di sini tanpa mengubah data klien, misalnya ditambah
 * "and/or Subsidiary Companies".
 */
export function InsuredPicker({
  clientId,
  insuredName,
  correspondenceAddress,
  onChange,
}: {
  clientId: string | null
  insuredName: string
  correspondenceAddress: string
  onChange: (patch: {
    clientId?: string | null
    insuredName?: string
    correspondenceAddress?: string
  }) => void
}) {
  const clients = useCollection("clients")
  const client = clientId
    ? (clients.find((c) => c.id === clientId) ?? null)
    : null
  const addresses = client?.addresses ?? []
  const activeAddress = addresses.find(
    (a) => a.value === correspondenceAddress.trim()
  )
  const items = clients
    .filter((c) => c.status !== "Inactive" || c.id === clientId)
    .map((c) => ({ label: c.name, value: c.id }))

  function pickClient(id: string | null) {
    const next = clients.find((c) => c.id === id)
    if (!next) {
      onChange({ clientId: null })
      return
    }
    onChange({
      clientId: next.id,
      insuredName: next.name,
      correspondenceAddress: defaultAddress(next)?.value ?? "",
    })
  }

  return (
    <>
      <SearchSelect
        className="md:col-span-2"
        label="Klien"
        required
        items={items}
        value={clientId}
        onValueChange={pickClient}
        placeholder="Cari klien dari Marketing…"
        emptyMessage="Klien belum terdaftar. Tambahkan dulu di menu Marketing."
        description={
          client ? (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>
                {client.clientType} · {client.contactPerson || "—"}
              </span>
              {client.npwp ? (
                <span>NPWP {maskMiddle(client.npwp, 2, 3)}</span>
              ) : null}
              <Link
                href={`/marketing/clients/${client.id}`}
                className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground"
              >
                Lihat klien
                <ExternalLink className="size-3" />
              </Link>
            </span>
          ) : insuredName ? (
            "Nama tertanggung belum terhubung ke data klien. Pilih klien supaya alamat dan KYC ikut terbawa."
          ) : undefined
        }
      />

      <Field className="md:col-span-2">
        <FieldLabel htmlFor="insured">
          Nama Tertanggung / Insured Name *
        </FieldLabel>
        <Input
          id="insured"
          value={insuredName}
          disabled={!client && !insuredName}
          placeholder={client ? client.name : "Pilih klien dulu"}
          onChange={(e) => onChange({ insuredName: e.target.value })}
        />
        {client && insuredName.trim() !== client.name ? (
          <FieldDescription className="flex items-center gap-1 text-xs">
            <Pencil className="size-3" />
            Diedit khusus slip ini, data klien tidak berubah.
          </FieldDescription>
        ) : null}
      </Field>

      <Field className="md:col-span-2">
        <FieldLabel htmlFor="addr">Correspondence Address *</FieldLabel>

        {addresses.length ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {addresses.map((a) => {
              const active = activeAddress?.id === a.id
              return (
                <Toggle
                  key={a.id}
                  size="sm"
                  pressed={active}
                  title={a.value}
                  onPressedChange={() =>
                    onChange({ correspondenceAddress: a.value })
                  }
                >
                  {active ? <Check data-icon="inline-start" /> : null}
                  {a.label}
                </Toggle>
              )
            })}
            {correspondenceAddress && !activeAddress ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Pencil className="size-3" />
                Diedit khusus slip ini, data klien tidak berubah
              </span>
            ) : null}
          </div>
        ) : null}

        <Textarea
          id="addr"
          rows={2}
          value={correspondenceAddress}
          placeholder={
            client
              ? "Pilih alamat di atas atau ketik alamat khusus slip ini"
              : "Alamat korespondensi tertanggung"
          }
          onChange={(e) => onChange({ correspondenceAddress: e.target.value })}
        />
      </Field>
    </>
  )
}
