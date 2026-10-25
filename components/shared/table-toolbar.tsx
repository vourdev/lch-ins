"use client"

import * as React from "react"
import {
  ChevronDown,
  FileSpreadsheet,
  FileText,
  Printer,
  Search,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { exportCsv, exportXlsx, type ExportSpec } from "@/lib/export"
import { cn } from "@/lib/utils"

export function SearchInput({
  value,
  onValueChange,
  placeholder = "Cari…",
  className,
}: {
  value: string
  onValueChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <InputGroup className={cn("h-9 w-full sm:max-w-xs", className)}>
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => onValueChange(e.target.value)}
      />
    </InputGroup>
  )
}

/**
 * Export and print buttons above tables. Export uses the currently visible
 * (filtered) rows, matching what the user sees.
 */
export function ExportButtons<T>({
  className,
  spec,
}: {
  className?: string
  spec?: ExportSpec<T>
}) {
  const [busy, setBusy] = React.useState(false)

  async function run(kind: "xlsx" | "csv") {
    if (!spec) return
    if (!spec.rows.length) {
      toast.info("Tidak ada baris untuk diexport")
      return
    }
    setBusy(true)
    try {
      const rows = spec.loadRows ? await spec.loadRows() : spec.rows
      const full = { ...spec, rows }
      if (kind === "xlsx") await exportXlsx(full)
      else exportCsv(full)
      toast.success(`${rows.length} baris diexport ke ${kind.toUpperCase()}`)
    } catch (error) {
      console.error(error)
      toast.error("Export gagal, coba lagi")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn("no-print flex items-center gap-2", className)}>
      {spec ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="outline" size="sm" disabled={busy} />}
          >
            <FileSpreadsheet data-icon="inline-start" />
            {busy ? "Menyiapkan…" : "Export"}
            <ChevronDown data-icon="inline-end" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => run("xlsx")}>
                <FileSpreadsheet />
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => run("csv")}>
                <FileText />
                CSV
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer data-icon="inline-start" />
        Print
      </Button>
    </div>
  )
}
