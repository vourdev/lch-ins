/**
 * Comprehensive End-to-End Integration Test for SPPA Module & PostgreSQL Relational Layer.
 * Run with: npx tsx --env-file=.env scripts/test-sppa-e2e.ts
 */

import { prisma } from "../lib/prisma"
import {
  createSppa,
  deleteSppa,
  getSppaById,
  listSppa,
  toggleSppaStatus,
  updateSppa,
  type SppaInput,
} from "../lib/server/sppa"
import { slipFromSppa } from "../components/underwriting/slip-model"
import { CLIENTS } from "../lib/data/clients"
import { z } from "zod"

const sppaInputSchema = z
  .object({
    clientId: z.string().trim().min(1, "Klien wajib dipilih"),
    cob: z.string().trim().min(1, "Class of Business wajib dipilih"),
    typeOfCover: z.string().trim().min(1, "Tipe penutupan wajib diisi"),
    insuredName: z.string().trim().min(1, "Nama tertanggung wajib diisi"),
    riskLocation: z.string().nullish(),
    occupation: z.string().nullish(),
    occupationId: z.string().nullish(),
    coverTypeId: z.string().nullish(),
    currency: z.string().default("IDR"),
    sumInsured: z.coerce.number().min(0, "Nilai pertanggungan tidak boleh negatif"),
    periodStart: z.string().nullish(),
    periodEnd: z.string().nullish(),
    answers: z.record(z.string(), z.string()).optional(),
    status: z.enum(["Draft", "Submitted"]).optional(),
  })
  .refine(
    (data) => {
      if (data.periodStart && data.periodEnd) {
        return new Date(data.periodEnd) >= new Date(data.periodStart)
      }
      return true
    },
    {
      message: "Periode akhir asuransi tidak boleh sebelum periode mulai",
      path: ["periodEnd"],
    }
  )

async function runTests() {
  console.log("=== STARTING SPPA E2E INTEGRATION TEST ===\n")

  // 1. Check user and client
  const testUser = await prisma.user.findFirst({ select: { id: true, name: true } })
  if (!testUser) throw new Error("No user found in database.")
  const testClient = await prisma.client.findFirst({ select: { id: true, name: true, cobId: true } })
  if (!testClient) throw new Error("No client found in database.")

  console.log(`[PASS] Environment ready: User="${testUser.name}", Client="${testClient.name}"`)

  // 2. Test listSppa()
  console.log("\n--- TEST 1: listSppa() ---")
  const sppaList = await listSppa()
  console.log(`[PASS] listSppa returned ${sppaList.length} records.`)
  if (sppaList.length < 3) {
    throw new Error(`Expected at least 3 seeded SPPA records, got ${sppaList.length}`)
  }
  const first = sppaList[0]
  console.log(`[PASS] Sample record: "${first.insuredName}" (${first.cob}) - ${first.currency} ${first.sumInsured}`)

  // 3. Test getSppaById() with UUID and legacy ID
  console.log("\n--- TEST 2: getSppaById() ---")
  const byUuid = await getSppaById(first.id)
  if (!byUuid || byUuid.id !== first.id) {
    throw new Error(`Failed retrieving SPPA by UUID: ${first.id}`)
  }
  console.log(`[PASS] getSppaById(UUID) matched: ${byUuid.insuredName}`)

  const byLegacyId = await getSppaById("sp-001")
  if (!byLegacyId) {
    throw new Error("Failed resolving mock ID 'sp-001'")
  }
  console.log(`[PASS] getSppaById('sp-001') resolved to: ${byLegacyId.insuredName}`)

  // 4. Test Schema Validation
  console.log("\n--- TEST 3: Zod Schema Validation ---")
  const validPayload: SppaInput = {
    clientId: testClient.id,
    cob: "Property",
    typeOfCover: "Property All Risks (PAR)",
    insuredName: "PT Test Integrasi SPPA E2E",
    riskLocation: "Jl. Sudirman Kav 28, Jakarta",
    occupation: "2142 - Factories manufacturing textiles",
    currency: "IDR",
    sumInsured: 5_000_000_000,
    periodStart: "2026-11-01",
    periodEnd: "2027-11-01",
    answers: { buildingConstruction: "Class 1", securityGuard: "24 Hours" },
    status: "Draft",
  }
  const parsedValid = sppaInputSchema.safeParse(validPayload)
  if (!parsedValid.success) {
    throw new Error(`Validation failed for valid payload: ${JSON.stringify(parsedValid.error.issues)}`)
  }
  console.log("[PASS] Valid payload parsed successfully.")

  // Invalid date: periodEnd < periodStart
  const invalidDatePayload = { ...validPayload, periodStart: "2026-11-01", periodEnd: "2026-05-01" }
  const parsedInvalidDate = sppaInputSchema.safeParse(invalidDatePayload)
  if (parsedInvalidDate.success) {
    throw new Error("Validation unexpectedly allowed periodEnd < periodStart")
  }
  console.log(`[PASS] Invalid date caught: "${parsedInvalidDate.error.issues[0]?.message}"`)

  // Negative sumInsured
  const negativeSumPayload = { ...validPayload, sumInsured: -100 }
  const parsedNegative = sppaInputSchema.safeParse(negativeSumPayload)
  if (parsedNegative.success) {
    throw new Error("Validation unexpectedly allowed negative sumInsured")
  }
  console.log(`[PASS] Negative sumInsured caught: "${parsedNegative.error.issues[0]?.message}"`)

  // 5. Test createSppa()
  console.log("\n--- TEST 4: createSppa() ---")
  const created = await createSppa(validPayload, testUser.id)
  console.log(`[PASS] Created SPPA ID: ${created.id}`)
  if (created.insuredName !== validPayload.insuredName) {
    throw new Error("Created SPPA insuredName mismatch")
  }
  if (created.sumInsured !== validPayload.sumInsured) {
    throw new Error(`Created SPPA sumInsured mismatch: got ${created.sumInsured}`)
  }

  // 6. Test updateSppa()
  console.log("\n--- TEST 5: updateSppa() ---")
  const updatePayload: SppaInput = {
    ...validPayload,
    insuredName: "PT Test Integrasi SPPA E2E (Updated)",
    sumInsured: 7_500_000_000,
    riskLocation: "Jl. Gatot Subroto Kav 50, Jakarta",
  }
  const updated = await updateSppa(created.id, updatePayload, testUser.id)
  if (updated.insuredName !== updatePayload.insuredName || updated.sumInsured !== 7_500_000_000) {
    throw new Error("SPPA update failed to persist updated values")
  }
  console.log(`[PASS] Updated SPPA successfully: "${updated.insuredName}" - Sum: ${updated.sumInsured}`)

  // 7. Test toggleSppaStatus()
  console.log("\n--- TEST 6: toggleSppaStatus() ---")
  await toggleSppaStatus(created.id, "Submitted")
  let recheck = await getSppaById(created.id)
  if (recheck?.status !== "Submitted") {
    throw new Error(`Status toggle to Submitted failed, got: ${recheck?.status}`)
  }
  console.log("[PASS] Toggled status to 'Submitted'.")

  await toggleSppaStatus(created.id, "Draft")
  recheck = await getSppaById(created.id)
  if (recheck?.status !== "Draft") {
    throw new Error(`Status toggle back to Draft failed, got: ${recheck?.status}`)
  }
  console.log("[PASS] Toggled status back to 'Draft'.")

  // 8. Test Downstream Placing Slip Mapping
  console.log("\n--- TEST 7: Downstream Placing Slip Mapping ---")
  const mappedSlip = slipFromSppa(updated, CLIENTS[0])
  if (mappedSlip.sppaId !== created.id) {
    throw new Error("Placing slip mapping sppaId mismatch")
  }
  if (mappedSlip.insuredName !== updated.insuredName) {
    throw new Error("Placing slip mapping insuredName mismatch")
  }
  const derivedSum = mappedSlip.sumInsuredSection1[0]?.amount
  if (derivedSum !== updated.sumInsured) {
    throw new Error(`Placing slip mapping sumInsured mismatch: expected ${updated.sumInsured}, got ${derivedSum}`)
  }
  console.log(`[PASS] Placing slip properly derived from SPPA: sppaId=${mappedSlip.sppaId}, insured=${mappedSlip.insuredName}, sum=${derivedSum}`)

  // 9. Test Referential Integrity Guard on Deletion
  console.log("\n--- TEST 8: Referential Integrity Deletion Guard ---")
  // Create dummy placing slip in DB linked to this SPPA
  const dummySlip = await prisma.placingSlip.create({
    data: {
      clientId: testClient.id,
      sppaId: created.id,
      slipNo: "SLIP-TEST-E2E-GUARD",
      insuredName: updated.insuredName,
      cobId: (await prisma.classOfBusiness.findFirst({ select: { id: true } }))!.id,
      currencyCode: "IDR",
      riskLocation: updated.riskLocation,
      status: "Draft",
      createdBy: testUser.id,
    },
  })
  console.log(`[PASS] Dummy linked placing slip created (ID: ${dummySlip.id}).`)

  let deleteBlocked = false
  try {
    await deleteSppa(created.id)
  } catch (err: any) {
    if (err.message.includes("sudah digunakan dalam Placing Slip")) {
      deleteBlocked = true
    }
  }

  if (!deleteBlocked) {
    throw new Error("Deletion guard failed: SPPA was deleted despite having linked placing slip!")
  }
  console.log("[PASS] Deletion guard successfully blocked deletion of referenced SPPA.")

  // Clean up placing slip
  await prisma.placingSlip.delete({ where: { id: dummySlip.id } })
  console.log("[PASS] Dummy placing slip removed.")

  // Now delete SPPA
  await deleteSppa(created.id)
  const afterDelete = await getSppaById(created.id)
  if (afterDelete !== null) {
    throw new Error("SPPA deletion failed: record still found.")
  }
  console.log("[PASS] SPPA successfully deleted permanently after unlinking.")

  console.log("\n=== ALL SPPA E2E INTEGRATION TESTS PASSED (8/8) ===")
}

runTests()
  .catch((err) => {
    console.error("\n[TEST FAILED]:", err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
