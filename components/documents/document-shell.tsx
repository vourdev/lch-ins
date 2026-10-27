"use client"

import Link from "next/link"
import { ArrowLeft, Printer } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function DocumentShell({
  backHref,
  children,
  wide = false,
}: {
  backHref: string
  children: React.ReactNode
  /** Dokumen tabel lebar (misal rekap sheet Excel) memakai kontainer lebih longgar. */
  wide?: boolean
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-4 px-4 pb-4 md:px-6 md:pb-6",
        wide ? "max-w-[1100px]" : "max-w-[900px]"
      )}
    >
      <div className="no-print sticky top-0 z-10 -mx-4 flex items-center justify-between bg-muted/50 px-4 py-3 backdrop-blur-sm md:-mx-6 md:px-6">
        <Button
          variant="outline"
          size="sm"
          render={<Link href={backHref} />}
          nativeButton={false}
        >
          <ArrowLeft data-icon="inline-start" />
          Kembali
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer data-icon="inline-start" />
          Print / Save PDF
        </Button>
      </div>

      <article className="print-sheet rounded-2xl border bg-card p-8 text-card-foreground shadow-sm md:p-12">
        {children}
      </article>

      <p className="no-print pb-6 text-center text-xs text-muted-foreground">
        Halaman ini dioptimalkan untuk cetak A4 — margin, page break, dan elemen
        non-cetak sudah diatur.
      </p>
    </div>
  )
}
