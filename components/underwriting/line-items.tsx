"use client"

import { Plus, Trash2 } from "lucide-react"

import { SearchSelect } from "@/components/shared/form-fields"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NumberInput } from "@/components/ui/number-input"
import { Textarea } from "@/components/ui/textarea"
import {
  buildVehicleDescription,
  parseVehicleDescription,
  type LineItem,
  type VehicleBrandOption,
} from "@/lib/data"
import { cn } from "@/lib/utils"

let counter = 0
const nextId = () => `li-${Date.now()}-${counter++}`

export function LineItemList({
  items,
  onChange,
  descPlaceholder = "Deskripsi",
  amountPlaceholder = "Nilai",
  multiline = false,
  addLabel = "Tambah baris",
  vehicleOptions,
}: {
  items: LineItem[]
  onChange: (items: LineItem[]) => void
  descPlaceholder?: string
  amountPlaceholder?: string
  multiline?: boolean
  addLabel?: string
  vehicleOptions?: VehicleBrandOption[]
}) {
  const hasVehicleMaster = Boolean(vehicleOptions && vehicleOptions.length > 0)

  function update(id: string, patch: Partial<LineItem>) {
    onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }

  function handleBrandChange(id: string, brandId: string | null) {
    if (!brandId) {
      update(id, {
        vehicleBrandId: null,
        vehicleBrandName: null,
        vehicleTypeId: null,
        vehicleTypeName: null,
      })
      return
    }
    const brand = vehicleOptions?.find((b) => b.id === brandId)
    update(id, {
      vehicleBrandId: brandId,
      vehicleBrandName: brand?.name ?? null,
      vehicleTypeId: null,
      vehicleTypeName: null,
    })
  }

  function handleTypeChange(id: string, brandId: string | null | undefined, typeId: string | null) {
    if (!typeId) {
      update(id, {
        vehicleTypeId: null,
        vehicleTypeName: null,
      })
      return
    }
    const brand = vehicleOptions?.find((b) => b.id === brandId)
    const type = brand?.types.find((t) => t.id === typeId)
    update(id, {
      vehicleTypeId: typeId,
      vehicleTypeName: type?.name ?? null,
    })
  }

  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item, index) => {
        if (hasVehicleMaster) {
          const brandItems = (vehicleOptions ?? [])
            .filter((b) => b.isActive || b.id === item.vehicleBrandId)
            .map((b) => ({ label: b.name, value: b.id }))

          const selectedBrand = (vehicleOptions ?? []).find((b) => b.id === item.vehicleBrandId)

          const typeItems = (selectedBrand?.types ?? [])
            .filter((t) => t.isActive || t.id === item.vehicleTypeId)
            .map((t) => ({ label: t.name, value: t.id }))

          // Parse existing item description if fields are empty
          const parsed = !item.licensePlate && !item.chassisNumber && item.description
            ? parseVehicleDescription(item.description)
            : {}

          const currentPlate = item.licensePlate ?? parsed.licensePlate ?? ""
          const currentYear = item.year ?? parsed.year ?? ""
          const currentChassis = item.chassisNumber ?? parsed.chassisNumber ?? ""
          const currentEngine = item.engineNumber ?? parsed.engineNumber ?? ""
          const currentColor = item.color ?? parsed.color ?? ""
          const currentModel = item.vehicleModel ?? parsed.vehicleModel ?? ""

          const handleFieldChange = (field: keyof LineItem, val: string | number | null) => {
            const patch: Partial<LineItem> = {
              [field]: val,
              licensePlate: field === "licensePlate" ? (val as string) : currentPlate,
              year: field === "year" ? val : currentYear,
              chassisNumber: field === "chassisNumber" ? (val as string) : currentChassis,
              engineNumber: field === "engineNumber" ? (val as string) : currentEngine,
              color: field === "color" ? (val as string) : currentColor,
              vehicleModel: field === "vehicleModel" ? (val as string) : currentModel,
            }
            const autoDesc = buildVehicleDescription({
              vehicleModel: patch.vehicleModel,
              year: patch.year,
              licensePlate: patch.licensePlate,
              chassisNumber: patch.chassisNumber,
              engineNumber: patch.engineNumber,
              color: patch.color,
            })
            patch.description = autoDesc
            update(item.id, patch)
          }

          return (
            <div
              key={item.id}
              className="flex flex-col gap-2.5 rounded-lg border bg-card/60 p-3 shadow-2xs"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                <span className="font-semibold text-foreground">Kendaraan #{index + 1}</span>
                {items.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onChange(items.filter((i) => i.id !== item.id))}
                    aria-label={`Hapus kendaraan #${index + 1}`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <SearchSelect
                  label="Merek Kendaraan"
                  items={brandItems}
                  value={item.vehicleBrandId ?? null}
                  onValueChange={(val) => handleBrandChange(item.id, val)}
                  placeholder="Pilih merek kendaraan"
                  emptyMessage="Merek tidak ditemukan"
                />
                <SearchSelect
                  label="Tipe Kendaraan"
                  items={typeItems}
                  value={item.vehicleTypeId ?? null}
                  onValueChange={(val) => handleTypeChange(item.id, item.vehicleBrandId, val)}
                  placeholder={
                    item.vehicleBrandId
                      ? "Pilih tipe kendaraan"
                      : "Pilih merek terlebih dahulu"
                  }
                  emptyMessage="Tipe tidak ditemukan"
                  disabled={!item.vehicleBrandId}
                />
              </div>

              {/* Structured vehicle detail fields */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                    Model / Jenis
                  </label>
                  <Input
                    className="text-xs h-8"
                    value={currentModel}
                    placeholder="misal: Minibus / Zenix"
                    onChange={(e) => handleFieldChange("vehicleModel", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                    Tahun Pembuatan
                  </label>
                  <Input
                    className="text-xs h-8"
                    value={String(currentYear)}
                    placeholder="misal: 2023"
                    maxLength={4}
                    onChange={(e) => handleFieldChange("year", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                    Plat Nomor Polisi
                  </label>
                  <Input
                    className="text-xs h-8 font-mono uppercase"
                    value={currentPlate}
                    placeholder="misal: B 1415 DKP"
                    onChange={(e) => handleFieldChange("licensePlate", e.target.value.toUpperCase())}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                    No. Rangka / VIN
                  </label>
                  <Input
                    className="text-xs h-8 font-mono uppercase"
                    value={currentChassis}
                    placeholder="misal: MHFGB8GS1P..."
                    onChange={(e) => handleFieldChange("chassisNumber", e.target.value.toUpperCase())}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                    No. Mesin
                  </label>
                  <Input
                    className="text-xs h-8 font-mono uppercase"
                    value={currentEngine}
                    placeholder="misal: 2ZRD123456"
                    onChange={(e) => handleFieldChange("engineNumber", e.target.value.toUpperCase())}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                    Warna Kendaraan
                  </label>
                  <Input
                    className="text-xs h-8"
                    value={currentColor}
                    placeholder="misal: Hitam Metalik"
                    onChange={(e) => handleFieldChange("color", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-border/50">
                <span className="text-xs font-medium text-muted-foreground">
                  Nilai Pertanggungan (TSI)
                </span>
                <div className="w-56 shrink-0">
                  <NumberInput
                    preset="money"
                    aria-label={`${amountPlaceholder} ${item.description || "kendaraan"}`}
                    value={item.amount || null}
                    placeholder={amountPlaceholder}
                    onValueChange={(v) => update(item.id, { amount: v ?? 0 })}
                  />
                </div>
              </div>
            </div>
          )
        }

        return (
          <div key={item.id} className="flex items-start gap-2">
            {multiline ? (
              <Textarea
                rows={2}
                className="flex-1"
                value={item.description}
                placeholder={descPlaceholder}
                onChange={(e) => update(item.id, { description: e.target.value })}
              />
            ) : (
              <Input
                className="flex-1"
                value={item.description}
                placeholder={descPlaceholder}
                onChange={(e) => update(item.id, { description: e.target.value })}
              />
            )}
            <div className="w-44 shrink-0">
              <NumberInput
                preset="money"
                aria-label={`${amountPlaceholder} ${item.description || "baris"}`}
                value={item.amount || null}
                placeholder={amountPlaceholder}
                onValueChange={(v) => update(item.id, { amount: v ?? 0 })}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onChange(items.filter((i) => i.id !== item.id))}
              disabled={items.length <= 1}
              aria-label={`Hapus ${item.description || "baris"}`}
              className={cn(
                "text-muted-foreground hover:text-destructive",
                items.length <= 1 && "opacity-30"
              )}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        )
      })}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() =>
          onChange([
            ...items,
            {
              id: nextId(),
              description: "",
              amount: 0,
              vehicleBrandId: null,
              vehicleTypeId: null,
              vehicleBrandName: null,
              vehicleTypeName: null,
            },
          ])
        }
      >
        <Plus className="size-4" />
        {addLabel}
      </Button>
    </div>
  )
}

export function StringList({
  values,
  onChange,
  placeholder,
  addLabel = "Tambah",
  className,
}: {
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  addLabel?: string
  className?: string
}) {
  const handleDelete = (index: number) => {
    onChange(values.filter((_, i) => i !== index))
  }

  const handleAdd = () => {
    onChange([...values, ""])
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {values.map((value, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            className="flex-1"
            value={value}
            placeholder={placeholder}
            onChange={(e) =>
              onChange(values.map((v: string, i: number) => (i === index ? e.target.value : v)))
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Hapus"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => handleDelete(index)}
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
        onClick={handleAdd}
      >
        <Plus data-icon="inline-start" />
        {addLabel}
      </Button>
    </div>
  )
}

export function TotalBar({
  label,
  value,
  tone = "info",
}: {
  label: string
  value: string
  tone?: "info" | "muted"
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold",
        tone === "info"
          ? "bg-muted/60 text-foreground [&>span:last-child]:text-primary"
          : "bg-muted/40"
      )}
    >
      <span>{label}</span>
      <span className="tabular">{value}</span>
    </div>
  )
}
