"use client"

import * as React from "react"
import { ChevronDown, X } from "lucide-react"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { CANONICAL_ROLES, type RoleCode } from "@/lib/access"
import { UserRoleBadge } from "@/components/users/user-role-badge"
import { cn } from "@/lib/utils"

export interface RoleMultiSelectProps {
  id?: string
  value: RoleCode[]
  onChange: (value: RoleCode[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  displayMode?: "badges" | "count"
}

export function RoleMultiSelect({
  id,
  value = [],
  onChange,
  placeholder = "Pilih peran…",
  disabled = false,
  className,
  displayMode = "badges",
}: RoleMultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const toggleRole = (role: RoleCode) => {
    if (value.includes(role)) {
      onChange(value.filter((r) => r !== role))
    } else {
      onChange([...value, role])
    }
  }

  const selectAll = () => {
    onChange(CANONICAL_ROLES.map((r) => r.code))
  }

  const clearAll = () => {
    onChange([])
  }

  const count = value.length
  const clearable = count > 0 && !disabled

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative w-full">
        <PopoverTrigger
          id={id}
          disabled={disabled}
          className={cn(
            "flex min-h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-3xl border border-input bg-input/40 px-3 py-1.5 text-sm transition-[color,box-shadow,background-color] outline-none",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <div className="flex flex-1 flex-wrap items-center gap-1.5 overflow-hidden text-left">
            {count === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : displayMode === "count" || count > 3 ? (
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary" className="font-medium">
                  {count} peran dipilih
                </Badge>
                {value.slice(0, 2).map((r) => (
                  <UserRoleBadge key={r} role={r} />
                ))}
                {count > 2 && (
                  <span className="text-xs text-muted-foreground">
                    +{count - 2} lainnya
                  </span>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {value.map((r) => (
                  <UserRoleBadge key={r} role={r} />
                ))}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1 text-muted-foreground">
            {/* Reserves room for the clear button, which sits outside the trigger to avoid nested buttons. */}
            {clearable && <span aria-hidden className="size-4.5" />}
            <ChevronDown
              className={cn(
                "size-4 transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          </div>
        </PopoverTrigger>
        {clearable && (
          <button
            type="button"
            onClick={clearAll}
            className="absolute top-1/2 right-8 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Kosongkan pilihan"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <PopoverContent align="start" className="w-80 p-2" sideOffset={6}>
        {/* Header & Quick Actions */}
        <div className="flex items-center justify-between border-b px-1 pb-2 text-xs text-muted-foreground">
          <span>
            {count} dari {CANONICAL_ROLES.length} dipilih
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="text-xs font-medium text-primary hover:underline"
            >
              Pilih Semua
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={clearAll}
              disabled={count === 0}
              className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Roles List */}
        <div className="mt-1 max-h-72 space-y-1 overflow-y-auto pr-1">
          {CANONICAL_ROLES.map((role) => {
            const isSelected = value.includes(role.code)
            return (
              <label
                key={role.code}
                className={cn(
                  "flex cursor-pointer items-start gap-2.5 rounded-xl p-2 transition-colors",
                  "hover:bg-accent/60",
                  isSelected && "bg-accent/30"
                )}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleRole(role.code)}
                  className="mt-0.5"
                />
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <UserRoleBadge role={role.code} />
                  </div>
                  <p className="text-[11px] leading-tight text-muted-foreground">
                    {role.description}
                  </p>
                </div>
              </label>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
