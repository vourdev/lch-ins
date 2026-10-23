import "server-only"

import { Prisma, type CobOjkClass } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { recordAudit } from "@/server/services/audit"

export type CobOjkClassRecord = CobOjkClass & { _count: { policies: number } }

const withPolicyCount = { _count: { select: { policies: true } } } satisfies Prisma.CobOjkClassInclude

function duplicateNameError(err: unknown, name: string) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
    ? new Error(`Klasifikasi OJK "${name}" sudah ada.`)
    : err
}

export async function listCobOjkClasses(): Promise<CobOjkClassRecord[]> {
  try {
    return await prisma.cobOjkClass.findMany({ include: withPolicyCount, orderBy: { name: "asc" } })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2021") {
      return []
    }
    throw err
  }
}

export async function createCobOjkClass(name: string, userId: string): Promise<CobOjkClassRecord> {
  try {
    return await prisma.$transaction(async (tx) => {
      const created = await tx.cobOjkClass.create({
        data: { name: name.trim() },
        include: withPolicyCount,
      })
      await recordAudit(tx, {
        userId,
        entity: "cob_ojk_classes",
        entityId: created.id,
        action: "Create",
        after: { name: created.name, isActive: created.isActive },
      })
      return created
    })
  } catch (err) {
    throw duplicateNameError(err, name.trim())
  }
}

export async function updateCobOjkClass(
  id: string,
  data: { name: string; isActive: boolean },
  userId: string
): Promise<CobOjkClassRecord> {
  try {
    return await prisma.$transaction(async (tx) => {
      const before = await tx.cobOjkClass.findUniqueOrThrow({ where: { id } })
      const updated = await tx.cobOjkClass.update({
        where: { id },
        data: { name: data.name.trim(), isActive: data.isActive },
        include: withPolicyCount,
      })
      await recordAudit(tx, {
        userId,
        entity: "cob_ojk_classes",
        entityId: id,
        action: "Update",
        before: { name: before.name, isActive: before.isActive },
        after: { name: updated.name, isActive: updated.isActive },
      })
      return updated
    })
  } catch (err) {
    throw duplicateNameError(err, data.name.trim())
  }
}
