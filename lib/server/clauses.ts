import "server-only"

import { prisma } from "@/lib/prisma"
import { sanitizeHtml } from "@/lib/sanitize"

/** Jumlah clause per halaman. Pustaka LCH berisi 595 klausul. */
export const CLAUSE_PAGE_SIZE = 20

export interface ClauseFilter {
  query?: string
  /** Kelompok produk asal di pustaka LCH: PAR, EQVET, Cargo, dan seterusnya. */
  sourceGroup?: string
  cobId?: string
  page?: number
}

export interface ClauseListItem {
  id: string
  title: string
  sourceGroup: string
  wordingHtml: string
  cobName: string | null
  coverTypeName: string | null
}

/** Ubah filter jadi where Prisma. Nilai kosong berarti tidak menyaring. */
function whereFrom(filter: ClauseFilter) {
  const q = filter.query?.trim()
  return {
    isActive: true,
    ...(filter.sourceGroup ? { sourceGroup: filter.sourceGroup } : {}),
    ...(filter.cobId ? { cobId: filter.cobId } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { wordingHtml: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  }
}

export async function listClauses(filter: ClauseFilter) {
  const page = Math.max(1, filter.page ?? 1)
  const where = whereFrom(filter)

  const [rows, total] = await Promise.all([
    prisma.clause.findMany({
      where,
      orderBy: [{ title: "asc" }, { sourceGroup: "asc" }],
      skip: (page - 1) * CLAUSE_PAGE_SIZE,
      take: CLAUSE_PAGE_SIZE,
      include: {
        cob: { select: { name: true } },
        coverType: { select: { name: true } },
      },
    }),
    prisma.clause.count({ where }),
  ])

  const items: ClauseListItem[] = rows.map((c) => ({
    id: c.id,
    title: c.title,
    sourceGroup: c.sourceGroup,
    wordingHtml: c.wordingHtml,
    cobName: c.cob?.name ?? null,
    coverTypeName: c.coverType?.name ?? null,
  }))

  return {
    items,
    total,
    page,
    pageSize: CLAUSE_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / CLAUSE_PAGE_SIZE)),
  }
}

export async function getClause(id: string) {
  return prisma.clause.findUnique({ where: { id } })
}

/** Kelompok produk yang benar-benar ada di database, untuk isi filter. */
export async function listSourceGroups() {
  const rows = await prisma.clause.findMany({
    where: { isActive: true, sourceGroup: { not: "" } },
    distinct: ["sourceGroup"],
    select: { sourceGroup: true },
    orderBy: { sourceGroup: "asc" },
  })
  return rows.map((r) => r.sourceGroup)
}

// Inactive options still used by a clause are kept so filters and forms can show their name.
export async function listCobOptions() {
  return prisma.classOfBusiness.findMany({
    where: { OR: [{ isActive: true }, { clauses: { some: {} } }] },
    select: { id: true, name: true, code: true, isActive: true },
    orderBy: { code: "asc" },
  })
}

export async function listCoverTypeOptions(cobId?: string) {
  return prisma.coverType.findMany({
    where: {
      OR: [{ isActive: true }, { clauses: { some: {} } }],
      ...(cobId ? { cobId } : {}),
    },
    select: { id: true, name: true, code: true, cobId: true, isActive: true },
    orderBy: { code: "asc" },
  })
}

export interface ClauseInput {
  title: string
  wordingHtml: string
  sourceGroup: string
  cobId: string | null
  coverTypeId: string | null
}

/** Rapikan dan validasi isian sebelum disimpan. */
function normalize(input: ClauseInput) {
  const title = input.title.trim()
  if (!title) throw new Error("Judul clause wajib diisi.")

  // Wording datang dari rich text editor, jadi HTML-nya disanitasi lagi di
  // server. Sanitasi di klien hanya lapis render, bukan pengaman.
  const wordingHtml = sanitizeHtml(input.wordingHtml).trim()
  if (!wordingHtml || wordingHtml === "<p></p>") {
    throw new Error("Wording clause wajib diisi.")
  }

  return {
    title,
    wordingHtml,
    sourceGroup: input.sourceGroup.trim(),
    cobId: input.cobId || null,
    // Type of cover hanya berarti kalau COB-nya dipilih.
    coverTypeId: (input.cobId && input.coverTypeId) || null,
  }
}

export async function createClause(input: ClauseInput) {
  const data = normalize(input)
  const duplicate = await prisma.clause.findUnique({
    where: {
      title_sourceGroup: { title: data.title, sourceGroup: data.sourceGroup },
    },
  })
  if (duplicate) {
    throw new Error(
      data.sourceGroup
        ? `Clause "${data.title}" sudah ada di kelompok ${data.sourceGroup}.`
        : `Clause "${data.title}" sudah ada.`
    )
  }
  return prisma.clause.create({ data })
}

export async function updateClause(id: string, input: ClauseInput) {
  const data = normalize(input)
  const duplicate = await prisma.clause.findUnique({
    where: {
      title_sourceGroup: { title: data.title, sourceGroup: data.sourceGroup },
    },
  })
  if (duplicate && duplicate.id !== id) {
    throw new Error(
      `Clause "${data.title}" sudah ada di kelompok ${data.sourceGroup || "tanpa kelompok"}.`
    )
  }
  return prisma.clause.update({ where: { id }, data })
}

/**
 * Clause yang sudah dipakai slip tidak dihapus, cukup dinonaktifkan, supaya
 * slip lama tetap bisa ditelusuri ke masternya.
 */
export async function deleteClause(id: string) {
  const used = await prisma.slipClause.count({ where: { clauseId: id } })
  if (used > 0) {
    await prisma.clause.update({ where: { id }, data: { isActive: false } })
    return { deactivated: true, used }
  }
  await prisma.clause.delete({ where: { id } })
  return { deactivated: false, used: 0 }
}
