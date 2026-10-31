"use client"

import * as React from "react"
import { MapPin } from "lucide-react"

import type { RateBounds } from "@/components/underwriting/ojk-reference"
import { Button } from "@/components/ui/button"
import { NumberInput } from "@/components/ui/number-input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CONSTRUCTION_CLASSES } from "@/lib/data"
import {
  MOTOR_EXTENSION_TARIFFS,
  MOTOR_REGIONS,
  MOTOR_TARIFFS,
  matchMotorRegion,
} from "@/lib/data/ojk-motor"
import {
  BI_SCALE_OJK,
  EQ_PROPERTY_TARIFFS,
  FLOOD_TARIFFS,
  OCCUPATION_TARIFFS,
} from "@/lib/data/ojk-tariff"
import { matchEqZone, matchFloodRegion } from "@/lib/data/ojk-zones"
import { num } from "@/lib/format"
import { cn } from "@/lib/utils"

/*
 * Isi panel referensi tarif OJK. Dimuat terpisah (next/dynamic) saat panel
 * dibuka, karena membawa tabel zona gempa 514 kabupaten/kota dan tarif
 * kendaraan bermotor yang tidak dibutuhkan saat form pertama tampil.
 */

type PickRate = (label: string, value: number, bounds?: RateBounds) => void
type Klas = "k1" | "k2" | "k3"

const FLOOD_REGIONS = [
  "Jakarta, Banten, Jawa Barat",
  "Luar Jakarta, Banten, Jawa Barat",
] as const

/** Tarif banjir OJK dalam persen, sedangkan baris rate properti memakai per mil. */
const toPermil = (percent: number) => Number((percent * 10).toFixed(6))

/** Nama jaminan perluasan KBM di SE OJK dipetakan ke label baris rate di slip. */
const MOTOR_EXTENSION_LINES: Record<string, string> = {
  "Banjir termasuk angin topan": "Flood, Windstorm, Tempest & Water Damage",
  "Gempa bumi dan tsunami": "Earthquake, Volcanic Eruption & Tsunami",
  "Huru-hara dan kerusuhan (SRCC)": "Strike, Riot, Civil Commotion",
  "Terorisme dan sabotase": "Terrorism & Sabotage",
}

function Card({
  title,
  unit,
  action,
  children,
  note,
}: {
  title: string
  unit?: string
  action?: React.ReactNode
  children: React.ReactNode
  note?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
          {title}
          {unit ? <span className="ml-1 normal-case">({unit})</span> : null}
        </p>
        {action}
      </div>
      <div className="mt-3">{children}</div>
      {note ? (
        <p className="mt-2 text-[11px] text-muted-foreground">{note}</p>
      ) : null}
    </div>
  )
}

function PickButton({
  caption,
  value,
  title,
  onPick,
}: {
  caption: string
  value: number
  title: string
  onPick: () => void
}) {
  return (
    <Button variant="outline" size="sm" title={title} onClick={onPick}>
      <span className="text-muted-foreground">{caption}</span>
      <span className="tabular font-semibold">{num(value, 3)}</span>
    </Button>
  )
}

/* ---------------------------------------------------------------- */
/* Harta benda                                                       */
/* ---------------------------------------------------------------- */

export function PropertyPanel({
  occupation,
  riskLocation,
  constructionClass,
  onConstructionClassChange,
  baseRate,
  eqRate,
  onPickRate,
  onPickIndemnity,
}: {
  occupation?: string
  riskLocation?: string
  /** Kode kelas konstruksi slip (K1, K2, K3). Toggle di panel ikut mengubah slip. */
  constructionClass?: string
  onConstructionClassChange?: (code: string) => void
  baseRate: number
  eqRate?: number | null
  onPickRate?: PickRate
  onPickIndemnity?: (months: number) => void
}) {
  const klas = (
    ["K1", "K2", "K3"].includes(constructionClass ?? "")
      ? (constructionClass as string).toLowerCase()
      : "k1"
  ) as Klas
  const [zonePick, setZonePick] = React.useState<number | null>(null)
  const [regionPick, setRegionPick] = React.useState<string | null>(null)
  const [floodZone, setFloodZone] = React.useState(1)
  const [loadingValue, setLoadingValue] = React.useState<number | null>(null)

  const location = riskLocation ?? ""
  const zoneMatch = React.useMemo(() => matchEqZone(location), [location])
  const regionMatch = React.useMemo(
    () => matchFloodRegion(location),
    [location]
  )
  const zone = zonePick ?? zoneMatch?.zone ?? null
  const region = regionPick ?? regionMatch ?? FLOOD_REGIONS[0]

  const occ = React.useMemo(() => {
    const code = (occupation ?? "").trim().split(/[^0-9A-Za-z]/)[0]
    return code
      ? (OCCUPATION_TARIFFS.find((o) => o.code === code) ?? null)
      : null
  }, [occupation])
  const occRate = occ?.[klas] ?? null

  const floodRows = FLOOD_TARIFFS.filter(
    (f) => f.line === "Harta Benda" && f.region === region
  )
  const floodRow = floodRows.find((f) => f.zone === `Zona ${floodZone}`)
  const baseZone = floodRow?.note?.match(/Zona (\d)/)?.[1]
  const floodBase = baseZone
    ? floodRows.find((f) => f.zone === `Zona ${baseZone}`)
    : floodRow
  const floodMin =
    floodBase?.min != null
      ? floodBase.min + (baseZone ? (loadingValue ?? 0) : 0)
      : null
  const floodMax =
    floodBase?.max != null
      ? floodBase.max + (baseZone ? (loadingValue ?? 0) : 0)
      : null

  function pickFlood(percent: number) {
    // FWTWD sudah mencakup flood, windstorm, dan water damage, jadi tarif
    // banjir OJK mengisi baris itu. Baris "Banjir (Flood)" terpisah dihapus
    // atas permintaan LCH karena isinya dobel.
    onPickRate?.("FWTWD", toPermil(percent), {
      min: floodMin != null ? toPermil(floodMin) : null,
      max: floodMax != null ? toPermil(floodMax) : null,
      source: `Banjir ${region}, Zona ${floodZone}`,
    })
  }

  return (
    <>
      {/* ---------- FLEXAS per okupasi ---------- */}
      <Card
        title="Tarif Harta Benda (FLEXAS)"
        unit="‰"
        action={
          <ToggleGroup
            value={[klas]}
            onValueChange={(v) => {
              const next = (v as string[])[0]
              if (next) onConstructionClassChange?.(next.toUpperCase())
            }}
          >
            {CONSTRUCTION_CLASSES.map((c) => (
              <ToggleGroupItem key={c.code} value={c.code.toLowerCase()}>
                {c.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        }
        note="Class I seluruhnya bahan tidak mudah terbakar, Class II boleh sampai 20% bahan mudah terbakar, Class III selain keduanya."
      >
        {occ && occRate ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{occ.name}</p>
              <p className="text-xs text-muted-foreground">
                Kode okupasi {occ.code} · batas {num(occRate[0], 3)} sampai{" "}
                {num(occRate[1], 3)} ‰
              </p>
            </div>
            <div className="flex gap-2">
              <PickButton
                caption="Bawah"
                value={occRate[0]}
                title={`Isi rate FLEXAS dengan batas bawah okupasi ${occ.code}`}
                onPick={() =>
                  onPickRate?.("FLEXAS", occRate[0], {
                    min: occRate[0],
                    max: occRate[1],
                    source: `FLEXAS okupasi ${occ.code} ${klas.toUpperCase()}`,
                  })
                }
              />
              <PickButton
                caption="Atas"
                value={occRate[1]}
                title={`Isi rate FLEXAS dengan batas atas okupasi ${occ.code}`}
                onPick={() =>
                  onPickRate?.("FLEXAS", occRate[1], {
                    min: occRate[0],
                    max: occRate[1],
                    source: `FLEXAS okupasi ${occ.code} ${klas.toUpperCase()}`,
                  })
                }
              />
            </div>
          </div>
        ) : (
          <p className="py-3 text-center text-sm text-muted-foreground">
            {occupation
              ? "Okupasi tidak ada di tabel OJK. Pilih dari daftar okupasi."
              : "Pilih okupasi di Informasi Dasar untuk melihat batas tarif."}
          </p>
        )}
      </Card>

      {/* ---------- Gempa bumi ---------- */}
      <Card
        title="Tarif Gempa Bumi (EQVET)"
        unit="‰"
        action={
          <ToggleGroup
            value={zone ? [String(zone)] : []}
            onValueChange={(v) => {
              const next = (v as string[])[0]
              setZonePick(next ? Number(next) : null)
            }}
          >
            {[1, 2, 3, 4, 5].map((z) => (
              <ToggleGroupItem key={z} value={String(z)}>
                Z{z}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        }
        note={
          zone
            ? "Hanya kolom zona terpilih yang bisa diisi ke slip. Ganti zona di atas untuk memakai kolom lain."
            : "Isi Risk Location atau pilih zona di atas. Zona terisi otomatis dari kabupaten atau kota pada lokasi risiko."
        }
      >
        {zoneMatch ? (
          <p className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5" />
            {zoneMatch.regency}, {zoneMatch.province} masuk Zona{" "}
            {zoneMatch.zone}
            {zonePick && zonePick !== zoneMatch.zone
              ? ` · diubah manual ke Zona ${zonePick}`
              : ""}
          </p>
        ) : null}

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Konstruksi</TableHead>
              {[1, 2, 3, 4, 5].map((z) => (
                <TableHead
                  key={z}
                  className={cn(
                    "text-right",
                    zone === z && "font-semibold text-primary"
                  )}
                >
                  Z{z}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {EQ_PROPERTY_TARIFFS.map((row) => (
              <TableRow key={row.construction}>
                <TableCell className="text-xs">{row.construction}</TableCell>
                {row.z.map((value, i) => (
                  <TableCell key={i} className="text-right">
                    {zone === i + 1 ? (
                      <Button
                        variant="outline"
                        size="sm"
                        title={`Isi rate EQVET ${num(value, 3)}‰ untuk ${row.construction}, Zona ${i + 1}`}
                        className="tabular h-7 px-2 font-semibold"
                        onClick={() =>
                          onPickRate?.("EQVET", value, {
                            min: value,
                            max: value,
                            source: `EQVET ${row.construction}, Zona ${i + 1}`,
                          })
                        }
                      >
                        {num(value, 3)}
                      </Button>
                    ) : (
                      <span className="tabular text-muted-foreground">
                        {num(value, 3)}
                      </span>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* ---------- Banjir ---------- */}
      <Card
        title="Tarif Jaminan Banjir"
        unit="%"
        action={
          <ToggleGroup
            value={[region]}
            onValueChange={(v) => setRegionPick((v as string[])[0] ?? region)}
          >
            <ToggleGroupItem value={FLOOD_REGIONS[0]}>
              Jakarta, Banten, Jabar
            </ToggleGroupItem>
            <ToggleGroupItem value={FLOOD_REGIONS[1]}>Luar</ToggleGroupItem>
          </ToggleGroup>
        }
        note="Tarif banjir memakai persen, baris rate memakai per mil. Nilai yang dipakai dikonversi otomatis, 0,05% menjadi 0,5‰."
      >
        <div className="flex flex-col gap-3">
          <ToggleGroup
            value={[String(floodZone)]}
            onValueChange={(v) =>
              setFloodZone(Number((v as string[])[0] ?? floodZone))
            }
          >
            {[1, 2, 3, 4].map((z) => (
              <ToggleGroupItem key={z} value={String(z)}>
                Zona {z}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          {baseZone ? (
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="flood-loading"
                  className="text-xs text-muted-foreground"
                >
                  Faktor loading underwriting (%)
                </label>
                <NumberInput
                  id="flood-loading"
                  preset="rate"
                  className="h-8 w-32"
                  placeholder="0,000"
                  value={loadingValue}
                  onValueChange={setLoadingValue}
                />
              </div>
              <p className="pb-1.5 text-xs text-muted-foreground">
                Zona {floodZone} memakai tarif Zona {baseZone} ditambah loading.
              </p>
            </div>
          ) : null}

          {floodMin != null && floodMax != null ? (
            <div className="flex flex-wrap items-center gap-2">
              <PickButton
                caption="Bawah"
                value={floodMin}
                title={`Isi rate banjir ${num(floodMin, 3)}% setara ${num(toPermil(floodMin), 3)}‰`}
                onPick={() => pickFlood(floodMin)}
              />
              <PickButton
                caption="Atas"
                value={floodMax}
                title={`Isi rate banjir ${num(floodMax, 3)}% setara ${num(toPermil(floodMax), 3)}‰`}
                onPick={() => pickFlood(floodMax)}
              />
              <span className="text-xs text-muted-foreground">
                setara {num(toPermil(floodMin), 3)} sampai{" "}
                {num(toPermil(floodMax), 3)} ‰
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Isi faktor loading untuk menghitung tarif zona ini.
            </p>
          )}
        </div>
      </Card>

      {/* ---------- Skala BI ---------- */}
      <Card
        title="Skala BI (Business Interruption)"
        note={
          baseRate > 0
            ? `Tarif dasar ${num(baseRate, 3)}‰ diambil dari jumlah FLEXAS, FWTWD, RSMDCC, dan Other Losses.${eqRate ? ` BI EQVET dihitung dari rate EQVET ${num(eqRate, 3)}‰.` : ""}`
            : "Isi rate FLEXAS dan kawan-kawan dulu. Rate BI dihitung dari jumlah rate tersebut dikali persentase periode."
        }
      >
        <div className="flex flex-wrap gap-1.5">
          {BI_SCALE_OJK.map((s) => (
            <Button
              key={s.months}
              variant="outline"
              size="sm"
              disabled={baseRate <= 0}
              title={`Indemnity period ${s.months} bulan, rate BI ${s.pct}% dari tarif dasar`}
              onClick={() => {
                onPickIndemnity?.(s.months)
                onPickRate?.(
                  "BI PAR",
                  Number(((baseRate * s.pct) / 100).toFixed(6)),
                  {
                    min: null,
                    max: null,
                    source: `BI ${s.months} bulan, ${s.pct}% dari tarif dasar`,
                  }
                )
                if (eqRate) {
                  onPickRate?.(
                    "BI EQVET",
                    Number(((eqRate * s.pct) / 100).toFixed(6)),
                    {
                      min: null,
                      max: null,
                      source: `BI EQVET ${s.months} bulan, ${s.pct}% dari rate EQVET`,
                    }
                  )
                }
              }}
            >
              {s.months} bln
              <span className="text-muted-foreground">{s.pct}%</span>
            </Button>
          ))}
        </div>
      </Card>
    </>
  )
}

/* ---------------------------------------------------------------- */
/* Kendaraan bermotor                                                */
/* ---------------------------------------------------------------- */

const MOTOR_VEHICLES = [
  "Non bus dan non truk",
  "Truk dan pickup",
  "Bus",
  "Roda dua",
] as const

type MotorVehicle = (typeof MOTOR_VEHICLES)[number]
type MotorCover = "Comprehensive" | "Total Loss Only"

function bandForSumInsured(sumInsured: number) {
  if (sumInsured <= 0) return null
  if (sumInsured <= 125_000_000) return "0 sampai Rp125.000.000"
  if (sumInsured <= 200_000_000)
    return "Di atas Rp125.000.000 sampai Rp200.000.000"
  if (sumInsured <= 400_000_000)
    return "Di atas Rp200.000.000 sampai Rp400.000.000"
  if (sumInsured <= 800_000_000)
    return "Di atas Rp400.000.000 sampai Rp800.000.000"
  return "Di atas Rp800.000.000"
}

export function MotorPanel({
  riskLocation,
  sumInsured,
  onPickRate,
}: {
  riskLocation?: string
  sumInsured: number
  onPickRate?: PickRate
}) {
  const [vehicle, setVehicle] = React.useState<MotorVehicle>(
    "Non bus dan non truk"
  )
  const [regionPick, setRegionPick] = React.useState<string | null>(null)
  const [bandPick, setBandPick] = React.useState<string | null>(null)
  const [cover, setCover] = React.useState<MotorCover>("Comprehensive")

  const location = riskLocation ?? ""
  const regionMatch = React.useMemo(
    () => matchMotorRegion(location),
    [location]
  )
  const region = regionPick ?? regionMatch ?? MOTOR_REGIONS[2]

  const forVehicle = MOTOR_TARIFFS.filter((t) => t.vehicle === vehicle)
  const bands = Array.from(new Set(forVehicle.map((t) => t.sumInsuredBand)))
  const autoBand = bands.length === 1 ? bands[0] : bandForSumInsured(sumInsured)
  const band = bandPick && bands.includes(bandPick) ? bandPick : autoBand
  const row = forVehicle.find(
    (t) => t.sumInsuredBand === band && t.region === region && t.cover === cover
  )

  /** Perluasan berbasis uang pertanggungan, tarifnya beda antara Comprehensive dan TLO. */
  const extensions = MOTOR_EXTENSION_TARIFFS.filter(
    (e) => e.policyType === cover
  )
  /** TJH dan kecelakaan diri memakai limit, tarifnya sama untuk Comprehensive dan TLO. */
  const limitExtensions = MOTOR_EXTENSION_TARIFFS.filter((e) => !e.policyType)

  return (
    <>
      <Card
        title="Tarif Kendaraan Bermotor"
        unit="% dari uang pertanggungan"
        action={
          <ToggleGroup
            value={[cover]}
            onValueChange={(v) =>
              setCover(((v as string[])[0] ?? cover) as MotorCover)
            }
          >
            <ToggleGroupItem value="Comprehensive">
              Comprehensive
            </ToggleGroupItem>
            <ToggleGroupItem value="Total Loss Only">TLO</ToggleGroupItem>
          </ToggleGroup>
        }
        note={`${
          regionPick
            ? "Wilayah dipilih manual."
            : regionMatch
              ? "Wilayah terisi otomatis dari lokasi risiko."
              : "Wilayah belum terdeteksi, default Wilayah 3. Pilih sesuai domisili kendaraan."
        } Kategori kendaraan mengikuti Lampiran II SE OJK.`}
      >
        <div className="flex flex-col gap-3">
          <ToggleGroup
            className="flex-wrap"
            value={[vehicle]}
            onValueChange={(v) =>
              setVehicle(((v as string[])[0] ?? vehicle) as MotorVehicle)
            }
          >
            {MOTOR_VEHICLES.map((v) => (
              <ToggleGroupItem key={v} value={v}>
                {v}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <ToggleGroup
            value={[region]}
            onValueChange={(v) => setRegionPick((v as string[])[0] ?? region)}
          >
            {MOTOR_REGIONS.map((r, i) => (
              <ToggleGroupItem key={r} value={r} title={r}>
                Wilayah {i + 1}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          {bands.length > 1 ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">
                Uang pertanggungan
                {sumInsured > 0 && !bandPick
                  ? " · terisi otomatis dari Interest Insured"
                  : ""}
              </span>
              <ToggleGroup
                className="flex-wrap"
                value={band ? [band] : []}
                onValueChange={(v) => setBandPick((v as string[])[0] ?? null)}
              >
                {bands.map((b) => (
                  <ToggleGroupItem key={b} value={b} title={b}>
                    {b.replace("Di atas ", "> ").replace(" sampai ", " – ")}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          ) : null}

          {row ? (
            <div className="flex flex-wrap items-center gap-2">
              <PickButton
                caption="Bawah"
                value={row.min}
                title={`Isi rate casco dengan batas bawah ${cover}`}
                onPick={() =>
                  onPickRate?.("Comprehensive Casco", row.min, {
                    min: row.min,
                    max: row.max,
                    source: `${cover} ${row.category}, ${region}`,
                  })
                }
              />
              <PickButton
                caption="Atas"
                value={row.max}
                title={`Isi rate casco dengan batas atas ${cover}`}
                onPick={() =>
                  onPickRate?.("Comprehensive Casco", row.max, {
                    min: row.min,
                    max: row.max,
                    source: `${cover} ${row.category}, ${region}`,
                  })
                }
              />
              <span className="text-xs text-muted-foreground">
                {row.category} · {cover}
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Pilih uang pertanggungan untuk melihat batas tarif.
            </p>
          )}
        </div>
      </Card>

      <Card
        title={`Perluasan Jaminan ${cover}`}
        unit="% dari uang pertanggungan"
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Jaminan</TableHead>
              <TableHead className="w-24 text-right">Bawah</TableHead>
              <TableHead className="w-24 text-right">Atas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {extensions.map((e) => {
              const line = MOTOR_EXTENSION_LINES[e.cover]
              return (
                <TableRow key={e.cover}>
                  <TableCell className="text-xs">
                    {e.cover}
                    {e.note ? (
                      <span className="block text-[11px] text-muted-foreground">
                        {e.note}
                      </span>
                    ) : null}
                  </TableCell>
                  {([e.min, e.max] as const).map((value, i) => (
                    <TableCell key={i} className="text-right">
                      {line && value != null ? (
                        <Button
                          variant="outline"
                          size="sm"
                          title={`Isi rate ${line} dengan batas ${i === 0 ? "bawah" : "atas"} ${num(value, 3)}%`}
                          className="tabular h-7 px-2 font-semibold"
                          onClick={() =>
                            onPickRate?.(line, value, {
                              min: e.min,
                              max: e.max,
                              source: `${e.cover}, ${e.policyType}`,
                            })
                          }
                        >
                          {num(value, 3)}
                        </Button>
                      ) : (
                        <span className="tabular text-muted-foreground">
                          {value != null ? num(value, 3) : "—"}
                        </span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>

      <Card
        title="TJH dan Kecelakaan Diri"
        unit="% dari limit"
        note="Tarif berlapis, dihitung progresif per lapisan limit. Diisi manual di tabel Third Party Liability dan Personal Accident karena basisnya limit, bukan uang pertanggungan."
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Jaminan</TableHead>
              <TableHead>Basis</TableHead>
              <TableHead className="w-20 text-right">Tarif</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {limitExtensions.map((e) => (
              <TableRow key={`${e.cover}-${e.basis}`}>
                <TableCell className="text-xs">{e.cover}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {e.basis}
                </TableCell>
                <TableCell className="tabular text-right text-xs">
                  {e.min != null ? num(e.min, 3) : "Underwriter"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  )
}
