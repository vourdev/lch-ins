import "server-only"

import { cache } from "react"

import {
  FORM_LOOKUP_TYPES,
  type FormLookupType,
  type FormOptions,
} from "@/lib/form-options"
import { normalizeCob } from "@/lib/format"
import { prisma } from "@/lib/prisma"

/**
 * Pilihan dropdown form dari master data, hanya yang berstatus aktif.
 *
 * Dibungkus `cache` supaya beberapa komponen dalam satu request memakai hasil
 * yang sama, tanpa menyimpannya antar-request: isian master yang baru
 * ditambah harus langsung muncul di form berikutnya.
 */
export const getFormOptions = cache(async (): Promise<FormOptions> => {
  const [cobs, insurers, currencies, wordingForms, lookupRows] =
    await Promise.all([
      prisma.classOfBusiness.findMany({
        where: { isActive: true },
        orderBy: { code: "asc" },
        select: {
          id: true,
          code: true,
          name: true,
          coverTypes: {
            where: { isActive: true },
            orderBy: { code: "asc" },
            select: { id: true, code: true, name: true, abbreviation: true },
          },
        },
      }),
      prisma.insurer.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.currency.findMany({
        where: { isActive: true },
        orderBy: { code: "asc" },
        select: { code: true, name: true },
      }),
      prisma.wordingForm.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.lookupValue.findMany({
        where: { lookupType: { in: [...FORM_LOOKUP_TYPES] }, isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { lookupType: true, name: true },
      }),
    ])

  const lookups = Object.fromEntries(
    FORM_LOOKUP_TYPES.map((type) => [
      type,
      lookupRows.filter((r) => r.lookupType === type).map((r) => r.name),
    ])
  ) as Record<FormLookupType, string[]>

  return {
    cobs: cobs.map((c) => ({
      id: c.id,
      code: c.code,
      label: normalizeCob(c.name),
      covers: c.coverTypes,
    })),
    insurers,
    currencies,
    wordingForms,
    lookups,
  }
})
