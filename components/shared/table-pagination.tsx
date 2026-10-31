"use client"

import * as React from "react"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export interface TablePaginationProps {
  page: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: number[]
  className?: string
  itemName?: string
}

export function usePagination<T>(items: T[], initialPageSize = 10) {
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(initialPageSize)

  const [prevLength, setPrevLength] = React.useState(items.length)
  if (prevLength !== items.length) {
    setPrevLength(items.length)
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)

  const paginatedItems = React.useMemo(() => {
    const start = (safePage - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, safePage, pageSize])

  return {
    page: safePage,
    pageSize,
    totalPages,
    totalItems: items.length,
    paginatedItems,
    setPage,
    setPageSize,
  }
}

export function TablePagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className,
  itemName = "data",
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)

  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1
  const endItem = Math.min(safePage * pageSize, totalItems)

  const canPrev = safePage > 1
  const canNext = safePage < totalPages

  const pageSizeItems = pageSizeOptions.map((size) => ({
    label: `${size} / hal`,
    value: String(size),
  }))

  return (
    <div
      className={cn(
        "no-print flex flex-col items-center justify-between gap-3 px-1 py-1 sm:flex-row text-xs text-muted-foreground",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <span>
          {totalItems === 0 ? (
            `Tidak ada ${itemName}`
          ) : (
            <>
              Menampilkan <strong className="text-foreground">{startItem}</strong>–
              <strong className="text-foreground">{endItem}</strong> dari{" "}
              <strong className="text-foreground">{totalItems}</strong> {itemName}
            </>
          )}
        </span>

        {onPageSizeChange && totalItems > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="hidden sm:inline">Ukuran:</span>
            <Select
              items={pageSizeItems}
              value={String(pageSize)}
              onValueChange={(val) => {
                if (val) onPageSizeChange(Number(val))
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-[95px] text-xs font-normal data-[size=sm]:h-8"
                aria-label="Jumlah baris per halaman"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {pageSizeItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(1)}
          disabled={!canPrev}
          aria-label="Halaman pertama"
          title="Halaman pertama"
        >
          <ChevronsLeft className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(safePage - 1)}
          disabled={!canPrev}
          aria-label="Halaman sebelumnya"
          title="Halaman sebelumnya"
        >
          <ChevronLeft className="size-4" />
        </Button>

        <span className="px-2 font-medium text-foreground">
          Hal. {safePage} dari {totalPages}
        </span>

        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(safePage + 1)}
          disabled={!canNext}
          aria-label="Halaman berikutnya"
          title="Halaman berikutnya"
        >
          <ChevronRight className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(totalPages)}
          disabled={!canNext}
          aria-label="Halaman terakhir"
          title="Halaman terakhir"
        >
          <ChevronsRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
