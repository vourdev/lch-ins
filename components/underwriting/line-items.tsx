"use client"

import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NumberInput } from "@/components/ui/number-input"
import { Textarea } from "@/components/ui/textarea"
import type { LineItem } from "@/lib/data"
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
}: {
  items: LineItem[]
  onChange: (items: LineItem[]) => void
  descPlaceholder?: string
  amountPlaceholder?: string
  multiline?: boolean
  addLabel?: string
}) {
  function update(id: string, patch: Partial<LineItem>) {
    onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
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
            aria-label="Hapus baris"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => onChange(items.filter((i) => i.id !== item.id))}
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
          onChange([...items, { id: nextId(), description: "", amount: 0 }])
        }
      >
        <Plus data-icon="inline-start" />
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
              onChange(values.map((v, i) => (i === index ? e.target.value : v)))
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
