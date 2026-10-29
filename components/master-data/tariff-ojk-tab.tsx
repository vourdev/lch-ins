"use client"

import * as React from "react"
import { SearchInput } from "@/components/shared/table-toolbar"
import { TableEmpty } from "@/components/shared/table-empty"
import { TablePagination, usePagination } from "@/components/shared/table-pagination"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  MOTOR_TARIFFS,
  MOTOR_EXTENSION_TARIFFS,
  MOTOR_ACQUISITION_CAP_PCT,
} from "@/lib/data/ojk-motor"
import type {
  BiScale,
  TariffEqProperty,
  TariffFlood,
} from "@/lib/generated/prisma/client"
import type { OccupationRecord } from "@/lib/server/master-data"

export interface TariffOjkTabProps {
  initialOccupations: OccupationRecord[]
  tariffEqProperty: TariffEqProperty[]
  tariffFlood: TariffFlood[]
  biScales: BiScale[]
}

interface GroupedMotorTariff {
  category: string
  vehicle: string
  sumInsuredBand: string
  region: string
  compMin: number | null
  compMax: number | null
  tloMin: number | null
  tloMax: number | null
}

export function TariffOjkTab({
  initialOccupations,
  tariffEqProperty,
  tariffFlood,
  biScales,
}: TariffOjkTabProps) {
  const [activeSubTab, setActiveSubTab] = React.useState<
    "occupation" | "motor" | "earthquake" | "flood" | "biscale"
  >("occupation")
  const [query, setQuery] = React.useState("")

  const formatZone = (zone: string) => {
    if (!zone) return "—"
    return zone.toLowerCase().startsWith("zona") ? zone : `Zona ${zone}`
  }

  const groupedMotorTariffs = React.useMemo(() => {
    const map = new Map<string, GroupedMotorTariff>()
    for (const t of MOTOR_TARIFFS) {
      const key = `${t.category}__${t.region}`
      let existing = map.get(key)
      if (!existing) {
        existing = {
          category: t.category,
          vehicle: t.vehicle,
          sumInsuredBand: t.sumInsuredBand,
          region: t.region,
          compMin: null,
          compMax: null,
          tloMin: null,
          tloMax: null,
        }
        map.set(key, existing)
      }
      if (t.cover === "Comprehensive") {
        existing.compMin = t.min
        existing.compMax = t.max
      } else if (t.cover === "Total Loss Only") {
        existing.tloMin = t.min
        existing.tloMax = t.max
      }
    }
    return Array.from(map.values())
  }, [])

  const filteredOccupations = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return initialOccupations
    return initialOccupations.filter(
      (o) => o.code.toLowerCase().includes(q) || o.name.toLowerCase().includes(q)
    )
  }, [initialOccupations, query])

  const {
    page,
    pageSize,
    totalItems,
    paginatedItems: paginatedOccupations,
    setPage,
    setPageSize,
  } = usePagination(filteredOccupations, 15)

  return (
    <div className="flex flex-col gap-4">
      {/* Sub Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={activeSubTab}
          onValueChange={(val) =>
            setActiveSubTab(
              val as "occupation" | "motor" | "earthquake" | "flood" | "biscale"
            )
          }
        >
          <TabsList className="h-9">
            <TabsTrigger value="occupation" className="text-xs">
              Okupasi & Properti (Lamp. I)
            </TabsTrigger>
            <TabsTrigger value="motor" className="text-xs">
              Kendaraan Bermotor (Lamp. IV)
            </TabsTrigger>
            <TabsTrigger value="flood" className="text-xs">
              Banjir (Lamp. II)
            </TabsTrigger>
            <TabsTrigger value="earthquake" className="text-xs">
              Gempa Bumi (Lamp. III)
            </TabsTrigger>
            <TabsTrigger value="biscale" className="text-xs">
              Skala BI
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {activeSubTab === "occupation" && (
          <SearchInput
            value={query}
            onValueChange={setQuery}
            placeholder="Cari kode atau nama okupasi OJK…"
            className="w-full sm:max-w-xs"
          />
        )}
      </div>

      {/* 1. Okupasi & Properti */}
      {activeSubTab === "occupation" && (
        <>
          <Card className="gap-0 overflow-hidden py-0">
            <Table className="min-w-200">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-28">Kode OJK</TableHead>
                  <TableHead>Klasifikasi Okupasi</TableHead>
                  <TableHead className="w-40 text-center">Konstruksi 1 (K1)</TableHead>
                  <TableHead className="w-40 text-center">Konstruksi 2 (K2)</TableHead>
                  <TableHead className="w-40 text-center">Konstruksi 3 (K3)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOccupations.length === 0 ? (
                  <TableEmpty
                    colSpan={5}
                    message={
                      query
                        ? "Tidak ada okupasi yang cocok dengan pencarian."
                        : "Belum ada data okupasi OJK."
                    }
                  />
                ) : (
                  paginatedOccupations.map((occ) => {
                    const k1 = occ.tariffs.find((t) => t.constructionClass === "K1")
                    const k2 = occ.tariffs.find((t) => t.constructionClass === "K2")
                    const k3 = occ.tariffs.find((t) => t.constructionClass === "K3")

                    return (
                      <TableRow key={occ.id} className="text-xs hover:bg-muted/40">
                        <TableCell className="font-mono font-semibold text-foreground">
                          {occ.code}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">{occ.name}</div>
                        </TableCell>
                        <TableCell className="text-center font-mono text-muted-foreground">
                          {k1 ? `${Number(k1.rateMin)}‰ – ${Number(k1.rateMax)}‰` : "—"}
                        </TableCell>
                        <TableCell className="text-center font-mono text-muted-foreground">
                          {k2 ? `${Number(k2.rateMin)}‰ – ${Number(k2.rateMax)}‰` : "—"}
                        </TableCell>
                        <TableCell className="text-center font-mono text-muted-foreground">
                          {k3 ? `${Number(k3.rateMin)}‰ – ${Number(k3.rateMax)}‰` : "—"}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </Card>

          <TablePagination
            page={page}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[15, 30, 50, 100]}
            itemName="Okupasi"
          />
        </>
      )}

      {/* Motor vehicle statutory tariffs (Lampiran IV) */}
      {activeSubTab === "motor" && (
        <div className="flex flex-col gap-6">
          {/* Regulatory notice and acquisition cap */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border bg-muted/40 p-3.5 text-xs text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground">
                SE OJK No. 6/SEOJK.05/2017 Lampiran IV
              </p>
              <p className="mt-0.5">
                Penetapan Tarif Premi Lini Usaha Asuransi Kendaraan Bermotor (Tabel IV.A &amp; Tabel IV.B)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono text-xs">
                Maks. Biaya Akuisisi {MOTOR_ACQUISITION_CAP_PCT}%
              </Badge>
            </div>
          </div>

          {/* Table IV.A: Basic Casco tariffs */}
          <div className="flex flex-col gap-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Tabel IV.A — Tarif Baku Casco (Comprehensive &amp; Total Loss Only)
              </h3>
              <p className="text-xs text-muted-foreground">
                Tarif premi bruto tahunan berdasarkan kategori kendaraan, wilayah operasional, dan batas bawah – batas atas OJK.
              </p>
            </div>
            <Card className="gap-0 overflow-hidden py-0">
              <Table className="min-w-200">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-56">Kategori &amp; Jenis Kendaraan</TableHead>
                    <TableHead className="w-60">Uang Pertanggungan (TSI)</TableHead>
                    <TableHead>Wilayah Operasional</TableHead>
                    <TableHead className="w-44 text-center">Comprehensive (%)</TableHead>
                    <TableHead className="w-44 text-center">Total Loss Only (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedMotorTariffs.map((t, idx) => (
                    <TableRow key={`${t.category}-${t.region}-${idx}`} className="text-xs hover:bg-muted/40">
                      <TableCell>
                        <span className="font-semibold text-foreground block">
                          {t.category}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {t.vehicle}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-[11px]">
                        {t.sumInsuredBand}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {t.region}
                      </TableCell>
                      <TableCell className="text-center font-mono font-medium text-foreground">
                        {t.compMin !== null && t.compMax !== null
                          ? `${t.compMin}% – ${t.compMax}%`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-center font-mono font-medium text-foreground">
                        {t.tloMin !== null && t.tloMax !== null
                          ? `${t.tloMin}% – ${t.tloMax}%`
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* Table IV.B: Extension coverage tariffs */}
          <div className="flex flex-col gap-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Tabel IV.B — Batas Tarif Perluasan Jaminan Kendaraan Bermotor
              </h3>
              <p className="text-xs text-muted-foreground">
                Tarif baku premi perluasan jaminan (Banjir, Gempa Bumi, SRCC, TS, TJH Pihak Ketiga, dan Kecelakaan Diri).
              </p>
            </div>
            <Card className="gap-0 overflow-hidden py-0">
              <Table className="min-w-200">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-60">Perluasan Jaminan</TableHead>
                    <TableHead className="w-36">Polis Induk</TableHead>
                    <TableHead className="w-48">Dasar Pengenaan</TableHead>
                    <TableHead className="w-44 text-center">Tarif Resmi OJK</TableHead>
                    <TableHead>Ketentuan Regulasi / Batas Santunan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOTOR_EXTENSION_TARIFFS.map((ext, idx) => {
                    const rateDisplay =
                      ext.min !== null
                        ? ext.min === ext.max
                          ? `${ext.min}%`
                          : `${ext.min}% – ${ext.max}%`
                        : "Ditentukan Underwriter"

                    return (
                      <TableRow key={`${ext.cover}-${ext.policyType}-${idx}`} className="text-xs hover:bg-muted/40">
                        <TableCell className="font-semibold text-foreground">
                          {ext.cover}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-[11px]">
                          {ext.policyType || "Comprehensive & TLO"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-[11px]">
                          {ext.basis}
                        </TableCell>
                        <TableCell className="text-center font-mono font-medium text-foreground">
                          {rateDisplay}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {ext.note}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>
          </div>
        </div>
      )}

      {/* 3. Gempa Bumi */}
      {activeSubTab === "earthquake" && (
        <Card className="gap-0 overflow-hidden py-0">
          <Table className="min-w-200">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Kategori Konstruksi</TableHead>
                <TableHead className="w-32 text-center">Zona</TableHead>
                <TableHead className="w-40 text-right pr-6">Tarif (‰)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tariffEqProperty.length === 0 ? (
                <TableEmpty colSpan={3} message="Belum ada data tarif gempa bumi." />
              ) : (
                tariffEqProperty.map((eq) => (
                  <TableRow key={eq.id} className="text-xs hover:bg-muted/40">
                    <TableCell className="font-medium text-foreground">
                      {eq.constructionCategory}
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {formatZone(eq.zone)}
                    </TableCell>
                    <TableCell className="text-right pr-6 font-mono font-medium text-foreground">
                      {Number(eq.rate)}‰
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* 3. Banjir */}
      {activeSubTab === "flood" && (
        <Card className="gap-0 overflow-hidden py-0">
          <Table className="min-w-200">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-36">Lini Asuransi</TableHead>
                <TableHead className="w-36">Wilayah</TableHead>
                <TableHead className="w-28 text-center">Zona</TableHead>
                <TableHead className="w-40 text-center">Tarif Minimum (%)</TableHead>
                <TableHead className="w-40 text-center">Tarif Maksimum (%)</TableHead>
                <TableHead>Catatan / Ketentuan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tariffFlood.length === 0 ? (
                <TableEmpty colSpan={6} message="Belum ada data tarif banjir." />
              ) : (
                tariffFlood.map((f) => (
                  <TableRow key={f.id} className="text-xs hover:bg-muted/40">
                    <TableCell className="font-medium text-foreground">
                      {f.line}
                    </TableCell>
                    <TableCell>{f.region}</TableCell>
                    <TableCell className="text-center font-mono">
                      {formatZone(f.zone)}
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {f.rateMin !== null ? `${Number(f.rateMin)}%` : "—"}
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {f.rateMax !== null ? `${Number(f.rateMax)}%` : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {f.note ?? "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* 4. Skala BI */}
      {activeSubTab === "biscale" && (
        <Card className="gap-0 overflow-hidden py-0">
          <Table className="min-w-200">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-48">Periode Indemnitas</TableHead>
                <TableHead className="w-48 text-right pr-6">
                  Persentase Tarif Dasar
                </TableHead>
                <TableHead>Deskripsi Penerapan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {biScales.length === 0 ? (
                <TableEmpty colSpan={3} message="Belum ada data skala BI." />
              ) : (
                biScales.map((b) => (
                  <TableRow
                    key={b.indemnityMonths}
                    className="text-xs hover:bg-muted/40"
                  >
                    <TableCell className="font-mono font-medium text-foreground">
                      {b.indemnityMonths} Bulan
                    </TableCell>
                    <TableCell className="text-right pr-6 font-mono font-semibold text-foreground">
                      {Number(b.percentage)}%
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      Faktor pengali tarif dasar asuransi Business Interruption (BI)
                      untuk periode pertanggungan {b.indemnityMonths} bulan.
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
