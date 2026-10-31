"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ExternalLink,
  FilePlus2,
  FileText,
  MapPin,
  Pencil,
  TriangleAlert,
} from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { useToday } from "@/components/layout/today-provider"
import { ClientForm } from "@/components/marketing/client-form"
import { SppaTable } from "@/components/marketing/sppa-table"
import { SectionCard } from "@/components/shared/section-card"
import { StatusBadge, ToneBadge } from "@/components/shared/status-badge"
import { usePermission } from "@/components/auth/permission-provider"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  kycMissing,
  policyStatus,
  type Claim,
  type Client,
  type PlacingSlip,
  type Policy,
  type VehicleBrandOption,
} from "@/lib/data"
import { dateShort, money } from "@/lib/format"
import type { SppaRecord } from "@/lib/server/sppa"
import { store } from "@/lib/store"

function Item({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium break-words">{value || "—"}</dd>
    </div>
  )
}

interface ClientDetailProps {
  initialClient?: Client | null
  initialSppa?: SppaRecord[]
  /** Slip, polis, dan klaim milik klien ini, sudah disaring di server dari database. */
  slips: PlacingSlip[]
  policies: Policy[]
  claims: Claim[]
  vehicleOptions?: VehicleBrandOption[]
}

export function ClientDetail({
  initialClient,
  initialSppa,
  slips: clientSlips,
  policies: clientPolicies,
  claims: clientClaims,
  vehicleOptions,
}: ClientDetailProps) {
  const today = useToday()
  const permission = usePermission()
  const canManageMarketing = permission.canManage("/marketing")
  const canManageUnderwriting = permission.canManage("/underwriting")

  // Data klien dari database. Dulu dicari di store sesi memakai id di URL,
  // sehingga tautan lama (c-005) menampilkan data contoh beserta slip, polis,
  // dan klaim contohnya. Setelah KYC diedit, isinya diganti hasil simpanan.
  const [client, setClient] = React.useState(initialClient ?? null)
  const [prevInitialClient, setPrevInitialClient] = React.useState(initialClient)
  if (prevInitialClient !== initialClient) {
    setPrevInitialClient(initialClient)
    setClient(initialClient ?? null)
  }

  // Komponen lain di sesi ini (misalnya form slip baru) masih membaca store.
  React.useEffect(() => {
    if (client) store.upsert("clients", client)
  }, [client])

  const [editKey, setEditKey] = React.useState<number | null>(null)

  if (!client) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <h1 className="text-lg font-semibold">Klien tidak ditemukan</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Data klien mungkin sudah dihapus atau tautannya salah.
        </p>
        <Button render={<Link href="/marketing" />} nativeButton={false}>
          <ArrowLeft data-icon="inline-start" />
          Kembali ke Marketing
        </Button>
      </div>
    )
  }

  const missing = kycMissing(client)
  const corporate = client.clientType === "Korporasi"

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={client.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>{client.clientType}</span>
            <span aria-hidden="true">·</span>
            <span>{client.cob}</span>
            <StatusBadge status={client.status} />
          </span>
        }
        actions={
          <>
            <Button
              variant="outline"
              render={<Link href="/marketing" />}
              nativeButton={false}
            >
              <ArrowLeft data-icon="inline-start" />
              Kembali
            </Button>
            {canManageMarketing && (
              <Button
                variant="outline"
                onClick={() => setEditKey((k) => (k ?? 0) + 1)}
              >
                <Pencil data-icon="inline-start" />
                Edit KYC
              </Button>
            )}
            {canManageUnderwriting && (
              <Button
                render={<Link href={`/underwriting/new?client=${client.id}`} />}
                nativeButton={false}
              >
                <FilePlus2 data-icon="inline-start" />
                Buat Placing Slip
              </Button>
            )}
          </>
        }
      />

      {missing.length ? (
        <p className="flex items-start gap-2 rounded-xl bg-warning/10 px-4 py-3 text-sm text-warning">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          KYC belum lengkap: {missing.join(", ")}.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <SectionCard title="Data KYC">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {corporate ? (
              <>
                <Item label="NPWP perusahaan" value={client.npwp} />
                <Item label="Nama PIC" value={client.contactPerson} />
                <Item
                  label="No. KTP PIC"
                  value={client.contactPersonIdNumber}
                />
              </>
            ) : (
              <>
                <Item
                  label={`Nomor ${client.idType ?? "identitas"}`}
                  value={client.idNumber}
                />
                <Item
                  label="Tempat, tanggal lahir"
                  value={
                    client.birthPlace || client.birthDate
                      ? `${client.birthPlace ?? "—"}, ${dateShort(client.birthDate)}`
                      : ""
                  }
                />
                <Item label="NPWP" value={client.npwp} />
                <Item label="Sumber penghasilan" value={client.incomeSource} />
              </>
            )}
            <Item label="Email" value={client.email} />
            <Item label="Telepon" value={client.phone} />
            <Item
              label="Tujuan menutup asuransi"
              value={
                client.insurancePurpose === "Lain-lain"
                  ? `Lain-lain: ${client.insurancePurposeNote ?? ""}`
                  : client.insurancePurpose
              }
            />
            <Item label="Tanggal KYC" value={dateShort(client.kycDate)} />
          </dl>
          {client.notes ? (
            <p className="mt-4 rounded-lg bg-muted/60 px-3 py-2 text-sm">
              {client.notes}
            </p>
          ) : null}
        </SectionCard>

        <div className="flex flex-col gap-4">
          <SectionCard title={`Alamat (${client.addresses.length})`}>
            <ul className="flex flex-col gap-3">
              {client.addresses.map((a) => (
                <li key={a.id} className="flex gap-2 text-sm">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {a.label}
                      {a.isPrimary ? (
                        <ToneBadge tone="info">Utama</ToneBadge>
                      ) : null}
                    </p>
                    <p className="text-muted-foreground">{a.value}</p>
                    {a.phone ? (
                      <p className="tabular text-xs text-muted-foreground">
                        {a.phone}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title={`Berkas KYC (${client.documents.length})`}>
            {client.documents.length ? (
              <ul className="flex flex-col gap-2">
                {client.documents.map((d) => (
                  <li key={d.id} className="flex items-center gap-2 text-sm">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {d.type}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {d.fileName} · {dateShort(d.uploadedAt)}
                      </span>
                    </span>
                    {d.url ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Buka ${d.fileName}`}
                        render={
                          <a
                            href={d.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          />
                        }
                        nativeButton={false}
                      >
                        <ExternalLink />
                      </Button>
                    ) : (
                      // Data contoh dan berkas dari masa prototipe tidak punya isi di server.
                      <span
                        className="shrink-0 text-xs text-muted-foreground"
                        title="Isi file belum tersimpan di server. Unggah ulang lewat Edit KYC."
                      >
                        Belum diunggah
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada berkas.</p>
            )}
          </SectionCard>
        </div>
      </div>

      <SectionCard title="SPPA" contentClassName="pt-4">
        <SppaTable
          clientId={client.id}
          initialSppa={initialSppa}
          compact
          vehicleOptions={vehicleOptions}
        />
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard
          title={`Placing Slip (${clientSlips.length})`}
          contentClassName="px-0"
        >
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">No. Slip</TableHead>
                <TableHead>Type of Cover</TableHead>
                <TableHead className="pr-5">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientSlips.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={3}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Belum ada placing slip
                  </TableCell>
                </TableRow>
              ) : (
                clientSlips.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="pl-5">
                      <Link
                        href={
                          canManageUnderwriting
                            ? `/underwriting/edit/${s.id}`
                            : `/underwriting/slip/${s.id}`
                        }
                        className="tabular font-semibold text-primary hover:underline"
                      >
                        {s.slipNo ?? "Draft"}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate">
                      {s.typeOfCover}
                    </TableCell>
                    <TableCell className="pr-5">
                      <StatusBadge status={s.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </SectionCard>

        <SectionCard
          title={`Polis (${clientPolicies.length})`}
          contentClassName="px-0"
        >
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">No. Polis</TableHead>
                <TableHead>Berakhir</TableHead>
                <TableHead className="text-right">Premium</TableHead>
                <TableHead className="pr-5">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientPolicies.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Belum ada polis
                  </TableCell>
                </TableRow>
              ) : (
                clientPolicies.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="tabular pl-5 font-medium">
                      {p.policyNo}
                      <span className="block text-xs font-normal text-muted-foreground">
                        {p.type}
                      </span>
                    </TableCell>
                    <TableCell className="tabular">
                      {dateShort(p.expiryDate)}
                    </TableCell>
                    <TableCell className="tabular text-right">
                      {money(p.premium, p.currency)}
                    </TableCell>
                    <TableCell className="pr-5">
                      <StatusBadge status={policyStatus(p.expiryDate, today)} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </SectionCard>
      </div>

      <SectionCard
        title={`Klaim (${clientClaims.length})`}
        contentClassName="px-0"
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">No. Klaim</TableHead>
              <TableHead>Tgl Kejadian</TableHead>
              <TableHead className="text-right">Nilai</TableHead>
              <TableHead className="pr-5">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientClaims.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  Belum ada klaim
                </TableCell>
              </TableRow>
            ) : (
              clientClaims.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="tabular pl-5 font-medium">
                    {c.claimNo}
                  </TableCell>
                  <TableCell className="tabular">
                    {dateShort(c.lossDate)}
                  </TableCell>
                  <TableCell className="tabular text-right">
                    {money(c.claimedAmount || c.estimatedLoss, c.currency)}
                  </TableCell>
                  <TableCell className="pr-5">
                    <StatusBadge status={c.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </SectionCard>

      {editKey ? (
        <ClientForm
          key={editKey}
          open
          onOpenChange={(open) => {
            if (!open) setEditKey(null)
          }}
          client={client}
          onSaved={(saved) => setClient(saved)}
        />
      ) : null}
    </div>
  )
}
