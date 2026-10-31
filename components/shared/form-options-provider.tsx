"use client"

import * as React from "react"

import { EMPTY_FORM_OPTIONS, type FormOptions } from "@/lib/form-options"

const FormOptionsContext = React.createContext<FormOptions | null>(null)

export function FormOptionsProvider({
  options,
  children,
}: {
  options: FormOptions
  children: React.ReactNode
}) {
  return (
    <FormOptionsContext.Provider value={options}>
      {children}
    </FormOptionsContext.Provider>
  )
}

/** Pilihan dropdown dari master data. Halaman wajib dibungkus `FormOptionsBoundary`. */
export function useFormOptions(): FormOptions {
  const options = React.useContext(FormOptionsContext)
  if (!options) {
    // Pilihan kosong lebih jujur daripada daftar tetap yang berbeda dari
    // master. Pesan ini memberi tahu halaman mana yang belum memasang provider.
    if (process.env.NODE_ENV !== "production") {
      console.error("useFormOptions dipakai di luar FormOptionsProvider")
    }
    return EMPTY_FORM_OPTIONS
  }
  return options
}

/** Pilihan filter COB di tabel: "Semua COB" lalu COB aktif dari master. */
export function useCobFilterItems() {
  const { cobs } = useFormOptions()
  return React.useMemo(
    () => [
      { label: "Semua COB", value: "all" },
      ...cobs.map((c) => ({ label: c.label, value: c.label })),
    ],
    [cobs]
  )
}
