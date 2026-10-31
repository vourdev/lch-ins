import { FormOptionsProvider } from "@/components/shared/form-options-provider"
import { getFormOptions } from "@/lib/server/form-options"

/**
 * Memuat pilihan dropdown dari master data untuk satu halaman. Dipasang per
 * halaman, bukan di layout, karena layout tidak dirender ulang saat pindah
 * halaman: isian master yang baru ditambah tidak akan muncul sampai reload.
 */
export async function FormOptionsBoundary({
  children,
}: {
  children: React.ReactNode
}) {
  const options = await getFormOptions()
  return <FormOptionsProvider options={options}>{children}</FormOptionsProvider>
}
