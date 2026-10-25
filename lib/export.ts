/**
 * Export tabel ke Excel (.xlsx) dan CSV langsung dari browser (PRD A-20).
 * ExcelJS dimuat saat tombol diklik saja, supaya ±900 KB library tidak ikut
 * bundle awal halaman.
 */

export type ExportCellType = "text" | "number" | "money" | "percent" | "date"

export interface ExportColumn<T> {
  header: string
  value: (row: T) => string | number | null | undefined
  type?: ExportCellType
  width?: number
}

export interface ExportSpec<T> {
  /** Nama file tanpa ekstensi, misalnya "polis-lch". */
  filename: string
  sheet?: string
  columns: ExportColumn<T>[]
  rows: T[]
  /** Fetches the full set at click time when `rows` holds only the visible page. */
  loadRows?: () => Promise<T[]>
}

function stamp() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Beri waktu browser memulai unduhan sebelum URL dilepas.
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

function csvCell(value: string | number | null | undefined) {
  if (value == null) return ""
  const text = String(value)
  // Cegah formula injection saat CSV dibuka di Excel.
  const safe =
    /^[=+\-@\t\r]/.test(text) && typeof value === "string" ? `'${text}` : text
  return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function exportCsv<T>(spec: ExportSpec<T>) {
  const lines = [
    spec.columns.map((c) => csvCell(c.header)).join(","),
    ...spec.rows.map((row) =>
      spec.columns.map((c) => csvCell(c.value(row))).join(",")
    ),
  ]
  // BOM supaya Excel membaca UTF-8 dengan benar.
  const blob = new Blob(["﻿" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8",
  })
  download(blob, `${spec.filename}-${stamp()}.csv`)
}

const NUM_FMT: Partial<Record<ExportCellType, string>> = {
  number: "#,##0",
  money: "#,##0.00",
  percent: "0.00##",
}

export async function exportXlsx<T>(spec: ExportSpec<T>) {
  const { default: ExcelJS } = await import("exceljs")
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "PT. LCH Insurance Brokers"
  workbook.created = new Date()

  const sheet = workbook.addWorksheet(spec.sheet ?? "Data", {
    views: [{ state: "frozen", ySplit: 1 }],
  })
  sheet.columns = spec.columns.map((c, i) => ({
    header: c.header,
    key: `c${i}`,
    width: c.width ?? Math.min(Math.max(c.header.length + 4, 12), 48),
    style: NUM_FMT[c.type ?? "text"]
      ? { numFmt: NUM_FMT[c.type ?? "text"] }
      : {},
  }))
  for (const row of spec.rows) {
    sheet.addRow(
      Object.fromEntries(
        spec.columns.map((c, i) => {
          const value = c.value(row)
          if (c.type === "date" && typeof value === "string" && value) {
            return [`c${i}`, new Date(`${value}T00:00:00`)]
          }
          return [`c${i}`, value ?? ""]
        })
      )
    )
  }
  sheet.getRow(1).font = { bold: true }
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: spec.columns.length },
  }

  const buffer = await workbook.xlsx.writeBuffer()
  download(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${spec.filename}-${stamp()}.xlsx`
  )
}
