import "server-only"

import { Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { recordAudit } from "@/server/services/audit"

type Tx = Prisma.TransactionClient

export interface VehicleTypeOption {
  id: string
  name: string
  isActive: boolean
}

export interface VehicleBrandOption {
  id: string
  name: string
  isActive: boolean
  types: VehicleTypeOption[]
}

export interface VehicleTypeRecord extends VehicleTypeOption {
  brandId: string
  usage: number
}

export interface VehicleBrandRecord {
  id: string
  name: string
  sortOrder: number
  isActive: boolean
  usage: number
  types: VehicleTypeRecord[]
}

export interface VehicleBrandInput {
  name: string
  sortOrder?: number
  isActive?: boolean
}

export interface VehicleTypeInput {
  brandId: string
  name: string
  isActive?: boolean
}

export interface VehicleTypeUpdateInput {
  name: string
  isActive?: boolean
}

// Inactive brands and types still used by an SPPA or slip are kept so old records show their name.
const USED = { OR: [{ sppa: { some: {} } }, { slipItems: { some: {} } }] }

export async function listVehicleOptions(): Promise<VehicleBrandOption[]> {
  return prisma.vehicleBrand.findMany({
    where: { OR: [{ isActive: true }, USED] },
    select: {
      id: true,
      name: true,
      isActive: true,
      types: {
        where: { OR: [{ isActive: true }, USED] },
        select: { id: true, name: true, isActive: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  })
}

export async function listVehicleBrandsMaster(): Promise<VehicleBrandRecord[]> {
  const rows = await prisma.vehicleBrand.findMany({
    include: {
      _count: { select: { sppa: true, slipItems: true } },
      types: {
        include: { _count: { select: { sppa: true, slipItems: true } } },
        orderBy: { name: "asc" },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  })
  return rows.map((b) => ({
    id: b.id,
    name: b.name,
    sortOrder: b.sortOrder,
    isActive: b.isActive,
    usage: b._count.sppa + b._count.slipItems,
    types: b.types.map((t) => ({
      id: t.id,
      brandId: t.brandId,
      name: t.name,
      isActive: t.isActive,
      usage: t._count.sppa + t._count.slipItems,
    })),
  }))
}

/**
 * Brand and type must both be set or both empty, and the type must belong to the brand.
 * Returns the normalized pair to store.
 */
export async function checkVehiclePair(
  tx: Tx,
  brandId: string | null | undefined,
  typeId: string | null | undefined
): Promise<{ vehicleBrandId: string | null; vehicleTypeId: string | null }> {
  if (!brandId && !typeId) return { vehicleBrandId: null, vehicleTypeId: null }
  if (!brandId) throw new Error("Pilih merek kendaraan terlebih dahulu.")
  if (!typeId) throw new Error("Tipe kendaraan wajib dipilih.")
  const type = await tx.vehicleType.findUnique({
    where: { id: typeId },
    select: { brandId: true },
  })
  if (!type) throw new Error("Tipe kendaraan tidak ditemukan di master data.")
  if (type.brandId !== brandId) throw new Error("Tipe kendaraan tidak sesuai merek.")
  return { vehicleBrandId: brandId, vehicleTypeId: typeId }
}

function cleanName(name: string, label: string) {
  const value = name.trim()
  if (!value) throw new Error(`Nama ${label} wajib diisi.`)
  return value
}

async function assertBrandNameFree(tx: Tx, name: string, selfId?: string) {
  const dup = await tx.vehicleBrand.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, id: selfId ? { not: selfId } : undefined },
    select: { id: true },
  })
  if (dup) throw new Error(`Merek "${name}" sudah ada.`)
}

async function assertTypeNameFree(tx: Tx, brandId: string, name: string, selfId?: string) {
  const dup = await tx.vehicleType.findFirst({
    where: {
      brandId,
      name: { equals: name, mode: "insensitive" },
      id: selfId ? { not: selfId } : undefined,
    },
    select: { id: true },
  })
  if (dup) throw new Error(`Tipe "${name}" sudah ada di merek ini.`)
}

export async function createVehicleBrand(input: VehicleBrandInput, userId: string) {
  return prisma.$transaction(async (tx) => {
    const name = cleanName(input.name, "merek")
    await assertBrandNameFree(tx, name)
    const created = await tx.vehicleBrand.create({
      data: { name, sortOrder: input.sortOrder ?? 0, isActive: input.isActive ?? true },
    })
    await recordAudit(tx, {
      userId,
      entity: "vehicle_brands",
      entityId: created.id,
      action: "Create",
      after: created,
    })
    return created
  })
}

export async function updateVehicleBrand(id: string, input: VehicleBrandInput, userId: string) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.vehicleBrand.findUnique({ where: { id } })
    if (!before) throw new Error("Merek kendaraan tidak ditemukan.")
    const name = cleanName(input.name, "merek")
    await assertBrandNameFree(tx, name, id)
    const updated = await tx.vehicleBrand.update({
      where: { id },
      data: {
        name,
        sortOrder: input.sortOrder ?? before.sortOrder,
        isActive: input.isActive ?? before.isActive,
      },
    })
    await recordAudit(tx, {
      userId,
      entity: "vehicle_brands",
      entityId: id,
      action: "Update",
      before,
      after: updated,
    })
    return updated
  })
}

export async function toggleVehicleBrandStatus(id: string, isActive: boolean, userId: string) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.vehicleBrand.findUnique({ where: { id } })
    if (!before) throw new Error("Merek kendaraan tidak ditemukan.")
    const updated = await tx.vehicleBrand.update({ where: { id }, data: { isActive } })
    await recordAudit(tx, {
      userId,
      entity: "vehicle_brands",
      entityId: id,
      action: "Update",
      before,
      after: updated,
    })
  })
}

/** Brands already used by an SPPA or slip are kept for history; deactivate them instead. */
export async function deleteVehicleBrand(id: string, userId: string) {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.vehicleBrand.findUnique({
      where: { id },
      include: { _count: { select: { sppa: true, slipItems: true, types: true } } },
    })
    if (!existing) throw new Error("Merek kendaraan tidak ditemukan.")
    const { sppa, slipItems, types } = existing._count
    if (sppa + slipItems > 0) {
      throw new Error("Merek sudah dipakai SPPA atau placing slip. Nonaktifkan saja.")
    }
    if (types > 0) throw new Error("Hapus dulu semua tipe di merek ini.")
    const before = { ...existing }
    delete (before as { _count?: unknown })._count
    await tx.vehicleBrand.delete({ where: { id } })
    await recordAudit(tx, {
      userId,
      entity: "vehicle_brands",
      entityId: id,
      action: "Delete",
      before,
      after: null,
    })
  })
}

export async function createVehicleType(input: VehicleTypeInput, userId: string) {
  return prisma.$transaction(async (tx) => {
    const brand = await tx.vehicleBrand.findUnique({
      where: { id: input.brandId },
      select: { id: true },
    })
    if (!brand) throw new Error("Merek kendaraan tidak ditemukan.")
    const name = cleanName(input.name, "tipe")
    await assertTypeNameFree(tx, brand.id, name)
    const created = await tx.vehicleType.create({
      data: { brandId: brand.id, name, isActive: input.isActive ?? true },
    })
    await recordAudit(tx, {
      userId,
      entity: "vehicle_types",
      entityId: created.id,
      action: "Create",
      after: created,
    })
    return created
  })
}

export async function updateVehicleType(
  id: string,
  input: VehicleTypeUpdateInput,
  userId: string
) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.vehicleType.findUnique({ where: { id } })
    if (!before) throw new Error("Tipe kendaraan tidak ditemukan.")
    const name = cleanName(input.name, "tipe")
    await assertTypeNameFree(tx, before.brandId, name, id)
    // A type never moves to another brand: SPPA and slips store the pair together.
    const updated = await tx.vehicleType.update({
      where: { id },
      data: { name, isActive: input.isActive ?? before.isActive },
    })
    await recordAudit(tx, {
      userId,
      entity: "vehicle_types",
      entityId: id,
      action: "Update",
      before,
      after: updated,
    })
    return updated
  })
}

export async function toggleVehicleTypeStatus(id: string, isActive: boolean, userId: string) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.vehicleType.findUnique({ where: { id } })
    if (!before) throw new Error("Tipe kendaraan tidak ditemukan.")
    const updated = await tx.vehicleType.update({ where: { id }, data: { isActive } })
    await recordAudit(tx, {
      userId,
      entity: "vehicle_types",
      entityId: id,
      action: "Update",
      before,
      after: updated,
    })
  })
}

export async function deleteVehicleType(id: string, userId: string) {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.vehicleType.findUnique({
      where: { id },
      include: { _count: { select: { sppa: true, slipItems: true } } },
    })
    if (!existing) throw new Error("Tipe kendaraan tidak ditemukan.")
    if (existing._count.sppa + existing._count.slipItems > 0) {
      throw new Error("Tipe sudah dipakai SPPA atau placing slip. Nonaktifkan saja.")
    }
    const before = { ...existing }
    delete (before as { _count?: unknown })._count
    await tx.vehicleType.delete({ where: { id } })
    await recordAudit(tx, {
      userId,
      entity: "vehicle_types",
      entityId: id,
      action: "Delete",
      before,
      after: null,
    })
  })
}
