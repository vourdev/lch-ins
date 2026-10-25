import Image from "next/image"

import logoLch from "@/public/images/logo-lch.jpg"

export const LCH_ADDRESS = {
  line1: "Springhill Office Tower 11th Floor Unit H",
  line2: "Jl. Benyamin Suaeb Block D6, Kemayoran, Jakarta Utara 14410",
  phone: "Phone : +62 21 - 2605 1671, +62 21 - 2605 1672",
}

/** Logo resmi; nama perusahaan dan nomor SKOJK sudah ada di dalam gambar. */
export function LchLogo({
  className,
  alt = "PT. LCH Insurance Brokers",
}: {
  className?: string
  /** Isi `""` kalau nama perusahaan sudah ada sebagai teks di dekatnya. */
  alt?: string
}) {
  // unoptimized: dokumen dicetak, jadi pakai file asli 1600px supaya tetap tajam.
  return (
    <Image
      src={logoLch}
      alt={alt}
      loading="eager"
      unoptimized
      className={className}
    />
  )
}

export function Letterhead({ withAddress = false }: { withAddress?: boolean }) {
  return (
    <header className="mb-8 border-b-2 border-primary pb-3">
      <LchLogo className="h-14 w-auto" />
      {withAddress ? (
        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
          {LCH_ADDRESS.line1} · {LCH_ADDRESS.line2} · {LCH_ADDRESS.phone}
        </p>
      ) : null}
    </header>
  )
}

export function DocumentFooter({ printedAt }: { printedAt: string }) {
  return (
    <footer className="mt-10 border-t pt-4 text-center text-[10px] leading-relaxed text-muted-foreground">
      {LCH_ADDRESS.line1}
      <br />
      {LCH_ADDRESS.line2}
      <br />
      {LCH_ADDRESS.phone}
      <p className="mt-2">Dicetak: {printedAt}</p>
    </footer>
  )
}
