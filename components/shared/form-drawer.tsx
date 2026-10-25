"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

/**
 * Drawer samping untuk semua form entri data. Menggantikan modal dialog —
 * konteks tabel di belakang tetap terlihat dan form panjang tidak perlu
 * scroll di dalam kotak sempit.
 *
 * Isinya dibungkus `<form>` asli: Enter mengirim form, tombol Simpan
 * dinonaktifkan selama proses, dan `onSubmit` mengembalikan `false` bila
 * validasi gagal supaya drawer tetap terbuka.
 */
export function FormDrawer({
  trigger,
  title,
  description,
  children,
  onSubmit,
  submitLabel = "Simpan",
  open,
  onOpenChange,
  className,
}: {
  /** Tombol pembuka. Kosongkan bila drawer dibuka dari tempat lain. */
  trigger?: React.ReactElement
  title: string
  description?: string
  children: React.ReactNode
  onSubmit: () => boolean | void | Promise<boolean | void>
  submitLabel?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}) {
  const [pending, setPending] = React.useState(false)
  const formId = React.useId()

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pending) return
    // currentTarget sudah null setelah await, jadi simpan dulu.
    const form = e.currentTarget
    setPending(true)
    try {
      const ok = await onSubmit()
      if (ok === false) {
        // Tunggu error tampil, lalu fokus ke field pertama yang tidak valid.
        requestAnimationFrame(() => {
          form.querySelector<HTMLElement>("[aria-invalid=true]")?.focus()
        })
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger ? <SheetTrigger render={trigger} /> : null}
      <SheetContent
        className={cn(
          "flex w-full flex-col gap-0 p-0 data-[side=right]:sm:max-w-[46rem]",
          className
        )}
      >
        <SheetHeader className="border-b py-5">
          <SheetTitle className="text-base">{title}</SheetTitle>
          {description ? (
            <SheetDescription>{description}</SheetDescription>
          ) : null}
        </SheetHeader>

        <form
          id={formId}
          noValidate
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>

          <SheetFooter className="flex-row justify-end gap-2 border-t px-6 py-4">
            <SheetClose render={<Button type="button" variant="outline" />}>
              Batal
            </SheetClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Menyimpan…" : submitLabel}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
