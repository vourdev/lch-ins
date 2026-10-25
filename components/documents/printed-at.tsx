"use client"

import * as React from "react"

import { DocumentFooter } from "@/components/documents/letterhead"

function noopSubscribe() {
  return () => {}
}

/** Waktu cetak diambil saat halaman dibuka di browser, bukan saat build. */
export function PrintedAt() {
  const label = React.useSyncExternalStore(
    noopSubscribe,
    () =>
      new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(Math.floor(Date.now() / 60_000) * 60_000)),
    () => ""
  )
  return <DocumentFooter printedAt={label ? `${label} WIB` : "—"} />
}
