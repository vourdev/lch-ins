"use client"

import { NumberField } from "@base-ui/react/number-field"

import { cn } from "@/lib/utils"

/** Pola format angka yang dipakai di seluruh form. */
const PRESETS = {
  /** Nominal uang sampai sen: 13.440.000,50 */
  money: { minimumFractionDigits: 0, maximumFractionDigits: 2 },
  /** Rate per mil atau persen, presisi numeric(12,6) di ERD. */
  rate: { minimumFractionDigits: 0, maximumFractionDigits: 6 },
  /** Persentase seperti diskon, brokerage, dan share. */
  percent: { minimumFractionDigits: 0, maximumFractionDigits: 4 },
  /** Bilangan bulat seperti jumlah lantai atau tahun. */
  integer: { maximumFractionDigits: 0, useGrouping: false },
} satisfies Record<string, Intl.NumberFormatOptions>

export type NumberInputPreset = keyof typeof PRESETS

/**
 * Rate dan persentase tidak pernah butuh pemisah ribuan, jadi titik yang
 * diketik (kebiasaan format Inggris) dianggap koma desimal. Tanpa ini,
 * "0.294" di locale id-ID terbaca 294 dan premi jadi seribu kali lipat.
 */
const DOT_IS_DECIMAL: Record<NumberInputPreset, boolean> = {
  money: false,
  rate: true,
  percent: true,
  integer: false,
}

function insertText(text: string) {
  // execCommand memicu event input asli, sehingga state NumberField ikut
  // berubah seperti ketikan biasa (termasuk undo di browser).
  document.execCommand("insertText", false, text)
}

/**
 * Input angka berformat Indonesia (titik ribuan, koma desimal).
 *
 * Memakai Base UI NumberField supaya teks yang sedang diketik ("0," atau
 * "12,") tidak ditimpa nilai hasil parse. Versi lama menulis balik
 * `Number(raw)` ke input, sehingga "0.294" berubah jadi "294".
 */
export function NumberInput({
  value,
  onValueChange,
  preset = "money",
  min,
  max,
  id,
  name,
  placeholder = "0",
  className,
  disabled,
  readOnly,
  invalid,
  required,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}: {
  value: number | null | undefined
  onValueChange: (value: number | null) => void
  preset?: NumberInputPreset
  min?: number
  max?: number
  id?: string
  name?: string
  placeholder?: string
  className?: string
  disabled?: boolean
  readOnly?: boolean
  invalid?: boolean
  required?: boolean
  "aria-label"?: string
  "aria-describedby"?: string
}) {
  return (
    <NumberField.Root
      id={id}
      name={name}
      value={value ?? null}
      onValueChange={(v) => onValueChange(v)}
      locale="id-ID"
      format={PRESETS[preset]}
      min={min}
      max={max}
      // Rentang dipakai untuk validasi, bukan untuk memotong input diam-diam.
      allowOutOfRange
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      className="w-full"
    >
      <NumberField.Input
        data-slot="input"
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-invalid={invalid || undefined}
        onKeyDown={(e) => {
          if (DOT_IS_DECIMAL[preset] && e.key === ".") {
            e.preventDefault()
            insertText(",")
          }
        }}
        onPaste={(e) => {
          if (!DOT_IS_DECIMAL[preset]) return
          const text = e.clipboardData.getData("text")
          if (!text.includes(".") || text.includes(",")) return
          e.preventDefault()
          insertText(text.replace(/\./g, ","))
        }}
        className={cn(
          "tabular h-9 w-full min-w-0 rounded-4xl border border-transparent bg-input/50 px-3 py-1 text-right text-base transition-[color,box-shadow,background-color] outline-none placeholder:text-muted-foreground read-only:bg-muted/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          className
        )}
      />
    </NumberField.Root>
  )
}
