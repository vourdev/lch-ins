"use client"

import * as React from "react"

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  NumberInput,
  type NumberInputPreset,
} from "@/components/ui/number-input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

/*
 * Controlled form fields with labels, descriptions, and inline error messages.
 * Required fields display an asterisk, and fields failing validation include
 * `aria-invalid` for screen reader accessibility.
 */

interface BaseProps {
  label: string
  error?: string
  description?: React.ReactNode
  required?: boolean
  className?: string
}

function useFieldIds(id?: string) {
  const auto = React.useId()
  const fieldId = id ?? auto
  return { fieldId, errorId: `${fieldId}-error`, descId: `${fieldId}-desc` }
}

function Shell({
  label,
  error,
  description,
  required,
  className,
  fieldId,
  errorId,
  descId,
  children,
}: BaseProps & {
  fieldId: string
  errorId: string
  descId: string
  children: React.ReactNode
}) {
  return (
    <Field data-invalid={error ? true : undefined} className={className}>
      <FieldLabel htmlFor={fieldId}>
        {label}
        {required ? <span aria-hidden="true">*</span> : null}
      </FieldLabel>
      {children}
      {description && !error ? (
        <FieldDescription id={descId} className="text-xs">
          {description}
        </FieldDescription>
      ) : null}
      {error ? (
        <FieldError id={errorId} className="text-xs">
          {error}
        </FieldError>
      ) : null}
    </Field>
  )
}

export function TextField({
  id,
  value,
  onChange,
  placeholder,
  prefix,
  type = "text",
  multiline,
  rows = 3,
  readOnly,
  autoFocus,
  inputMode,
  digitsOnly,
  numericOnly,
  maxLength,
  ...base
}: BaseProps & {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  prefix?: React.ReactNode
  type?: "text" | "email" | "tel" | "date"
  multiline?: boolean
  rows?: number
  readOnly?: boolean
  autoFocus?: boolean
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]
  digitsOnly?: boolean
  numericOnly?: boolean
  maxLength?: number
}) {
  const ids = useFieldIds(id)

  function handleChange(raw: string) {
    let next = raw
    if (digitsOnly) {
      next = next.replace(/\D/g, "")
    } else if (numericOnly) {
      next = next.replace(/[^0-9.,]/g, "")
    } else if (type === "tel") {
      next = next.replace(/[^0-9+() -]/g, "")
    }
    if (maxLength && next.length > maxLength) {
      next = next.slice(0, maxLength)
    }
    onChange(next)
  }

  const common = {
    id: ids.fieldId,
    value,
    placeholder,
    readOnly,
    maxLength,
    "aria-invalid": base.error ? true : undefined,
    "aria-describedby": base.error
      ? ids.errorId
      : base.description
        ? ids.descId
        : undefined,
    "aria-required": base.required || undefined,
  }
  return (
    <Shell {...base} {...ids}>
      {multiline ? (
        <Textarea
          {...common}
          rows={rows}
          onChange={(e) => handleChange(e.target.value)}
        />
      ) : (
        <div className="relative flex items-center">
          {prefix ? (
            <span className="pointer-events-none absolute left-3 flex select-none items-center border-r pr-2 text-xs font-semibold text-muted-foreground">
              {prefix}
            </span>
          ) : null}
          <Input
            {...common}
            type={type}
            autoFocus={autoFocus}
            inputMode={digitsOnly || numericOnly ? "numeric" : inputMode}
            className={cn(prefix && "pl-14", readOnly && "bg-muted/60")}
            onChange={(e) => handleChange(e.target.value)}
          />
        </div>
      )}
    </Shell>
  )
}

export function NumberField({
  id,
  value,
  onValueChange,
  preset = "money",
  placeholder,
  readOnly,
  min,
  max,
  ...base
}: BaseProps & {
  id?: string
  value: number | null | undefined
  onValueChange: (value: number | null) => void
  preset?: NumberInputPreset
  placeholder?: string
  readOnly?: boolean
  min?: number
  max?: number
}) {
  const ids = useFieldIds(id)
  return (
    <Shell {...base} {...ids}>
      <NumberInput
        id={ids.fieldId}
        value={value}
        onValueChange={onValueChange}
        preset={preset}
        placeholder={placeholder}
        readOnly={readOnly}
        min={min}
        max={max}
        invalid={Boolean(base.error)}
        required={base.required}
        aria-describedby={
          base.error ? ids.errorId : base.description ? ids.descId : undefined
        }
      />
    </Shell>
  )
}

export type Option = { label: string; value: string }

function toOptions(items: readonly (string | Option)[]): Option[] {
  return items.map((i) => (typeof i === "string" ? { label: i, value: i } : i))
}

export function SelectInput({
  id,
  items,
  value,
  onValueChange,
  placeholder = "Pilih…",
  disabled,
  ...base
}: BaseProps & {
  id?: string
  items: readonly (string | Option)[]
  value: string | null | undefined
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  const ids = useFieldIds(id)
  const options = toOptions(items)
  return (
    <Shell {...base} {...ids}>
      <Select
        items={[{ label: placeholder, value: null }, ...options]}
        value={value || null}
        onValueChange={(v) => onValueChange((v as string | null) ?? "")}
        disabled={disabled}
      >
        <SelectTrigger
          id={ids.fieldId}
          className="w-full min-w-0"
          aria-invalid={base.error ? true : undefined}
          aria-describedby={base.error ? ids.errorId : undefined}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Shell>
  )
}

/**
 * Searchable selection for long option lists (clients, policies, occupations).
 * Stores the option `value`, not the user-typed input string.
 */
export function SearchSelect({
  id,
  items,
  value,
  onValueChange,
  placeholder = "Ketik untuk mencari…",
  emptyMessage = "Tidak ada yang cocok",
  disabled,
  ...base
}: BaseProps & {
  id?: string
  items: Option[]
  value: string | null | undefined
  onValueChange: (value: string | null) => void
  placeholder?: string
  emptyMessage?: string
  disabled?: boolean
}) {
  const ids = useFieldIds(id)
  const selected = items.find((i) => i.value === value) ?? null
  return (
    <Shell {...base} {...ids}>
      <Combobox
        items={items}
        value={selected}
        onValueChange={(v) =>
          onValueChange((v as Option | null)?.value ?? null)
        }
        itemToStringLabel={(item: Option) => item.label}
        isItemEqualToValue={(a: Option, b: Option) => a.value === b.value}
        disabled={disabled}
      >
        <ComboboxInput
          id={ids.fieldId}
          className="w-full min-w-0"
          placeholder={placeholder}
          showClear={Boolean(selected) && !disabled}
          disabled={disabled}
          aria-invalid={base.error ? true : undefined}
          aria-describedby={base.error ? ids.errorId : undefined}
        />
        <ComboboxContent>
          <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
          <ComboboxList>
            {(item: Option) => (
              <ComboboxItem key={item.value} value={item}>
                {item.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </Shell>
  )
}
