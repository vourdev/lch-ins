/**
 * Comprehensive End-to-End Integration Test for Placing Slip Module & PostgreSQL Relational Layer.
 * Run with: node -r ./scripts/mock-server-only.cjs --import tsx --env-file=.env scripts/test-placing-slip-e2e.ts
 */

import { prisma } from "../lib/prisma"
import {
  createPlacingSlip,
  deletePlacingSlip,
  getPlacingSlipById,
  listPlacingSlips,
  releasePlacingSlip,
  togglePlacingSlipStatus,
  updatePlacingSlip,
  type PlacingSlipInput,
} from "../lib/server/placing-slips"

async function runTests() {
  console.log("=== STARTING PLACING SLIP E2E INTEGRATION TEST ===\n")

  let passed = 0
  let failed = 0

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${desc}`)
      passed++
    } else {
      console.error(`  ✗ FAIL: ${desc}`)
      failed++
    }
  }

  // 1. Check user and client
  console.log("[TEST 1] Environment verification")
  const testUser = await prisma.user.findFirst({ select: { id: true, name: true } })
  if (!testUser) throw new Error("No user found in database.")
  const testClient = await prisma.client.findFirst({ select: { id: true, name: true, cobId: true } })
  if (!testClient) throw new Error("No client found in database.")

  assert(Boolean(testUser.id), `User ready: ${testUser.name}`)
  assert(Boolean(testClient.id), `Client ready: ${testClient.name}`)

  // 2. Test listPlacingSlips() and seedInitialSlipsIfEmpty()
  console.log("\n[TEST 2] listPlacingSlips() & Seed Verification")
  const slips = await listPlacingSlips()
  assert(slips.length >= 3, `listPlacingSlips() returned ${slips.length} records (expected >= 3)`)

  const firstSlip = slips[0]
  assert(Boolean(firstSlip.dbId), `First slip has dbId: ${firstSlip.dbId}`)
  assert(Boolean(firstSlip.cob), `First slip has cob: ${firstSlip.cob}`)
  const slipWithPanel = slips.find((s) => s.securityPanel && s.securityPanel.length > 0)
  assert(Boolean(slipWithPanel), "At least one slip has security panel rows populated")

  // 3. Test getPlacingSlipById() by UUID and by legacy ID / slipNo
  console.log("\n[TEST 3] getPlacingSlipById() retrieval")
  const byUuid = await getPlacingSlipById(firstSlip.dbId)
  assert(Boolean(byUuid) && byUuid?.id === firstSlip.dbId, "Retrieved slip by UUID successfully")

  const byMock = await getPlacingSlipById("s-001")
  assert(Boolean(byMock), "Retrieved slip by mock legacy id 's-001'")

  // 4. Test createPlacingSlip() with complete relational child tables
  console.log("\n[TEST 4] createPlacingSlip() with relational child tables")
  const masterClause = await prisma.clause.findFirst({ select: { id: true, title: true } })
  const newSlipInput: PlacingSlipInput = {
    clientId: testClient.id,
    cob: "Property",
    typeOfCover: "Property All Risks (PAR)",
    insuredName: "PT Pabrik Tekstil Jaya Sentosa",
    correspondenceAddress: "Kawasan Industri MM2100 Blok C-12, Cikarang",
    currency: "IDR",
    status: "Draft",
    periodTba: false,
    inceptionDate: "2026-11-01",
    expiryDate: "2027-11-01",
    occupation: "2142 - Factories manufacturing textiles",
    riskLocation: "Cikarang Barat, Bekasi",
    coverage: "Flexas + FWTWD + Earthquake",
    constructionClass: "K1",
    indemnityPeriod: "12 months",
    interestItems: [
      { id: "it-1", description: "Bangunan Pabrik dan Gudang", amount: 25_000_000_000 },
      { id: "it-2", description: "Mesin Tenun Otomatis", amount: 15_000_000_000 },
    ],
    sumInsuredSection1: [
      { id: "si-1", description: "Material Damage (Total)", amount: 40_000_000_000 },
    ],
    sumInsuredSection2: [
      { id: "si-2", description: "Business Interruption (Gross Profit)", amount: 10_000_000_000 },
    ],
    deductiblesSection1: [
      "FLEXAS: Nil",
      "Earthquake: 2.5% of TSI",
    ],
    deductiblesSection2: [
      "BI: 14 days",
    ],
    rateLines: [
      { id: "rl-1", label: "FLEXAS", rate: 0.125, premium: 50_000_000, min: 0.1, max: 0.2 },
      { id: "rl-2", label: "EQVET Zone 2", rate: 0.085, premium: 34_000_000, min: 0.075, max: 0.12 },
    ],
    securityPanel: [
      { id: "sp-1", insurer: "PT Asuransi Tugu Pratama Indonesia Tbk", share: 60, role: "As Leader" },
      { id: "sp-2", insurer: "PT Asuransi Wahana Tata", share: 40, role: "As Member" },
    ],
    clauseIds: masterClause ? [masterClause.id] : [],
    clauseOverrides: masterClause
      ? {
          [masterClause.id]: {
            title: masterClause.title,
            wording: "<p>Wording klausula khusus hasil negosiasi placing slip E2E test.</p>",
          },
        }
      : undefined,
    wordingForms: ["PAR LCH Standard 2026"],
    discountPct: 5,
    adminCost: 100_000,
    stampDuty: 20_000,
    brokeragePct: 15,
    includeVat: false,
  }

  const created = await createPlacingSlip(newSlipInput, testUser.id)
  assert(Boolean(created.id), `Created Placing Slip ID: ${created.id}`)
  assert(created.insuredName === newSlipInput.insuredName, "Insured name stored accurately")
  assert(created.interestItems?.length === 2, `Interest items count: ${created.interestItems?.length} (expected 2)`)
  assert(created.sumInsuredSection1?.length === 1, `Section 1 sum insured count: ${created.sumInsuredSection1?.length}`)
  assert(created.securityPanel?.length === 2, `Security panel count: ${created.securityPanel?.length}`)
  assert(created.securityPanel?.[0]?.role === "As Leader", "Leader role stored correctly in Security Panel")
  assert(created.securityPanel?.[0]?.share === 60, "Leader share 60% recorded")

  if (masterClause) {
    assert(created.clauseIds?.includes(masterClause.id), "Master clause linked to slip")
    assert(Boolean(created.clauseOverrides?.[masterClause.id]), "Clause override recorded")
  }

  // 5. Test updatePlacingSlip()
  console.log("\n[TEST 5] updatePlacingSlip()")
  const updateInput: PlacingSlipInput = {
    ...newSlipInput,
    insuredName: "PT Pabrik Tekstil Jaya Sentosa (Persero) Tbk",
    interestItems: [
      { id: "it-1", description: "Bangunan Pabrik dan Gudang (Expanded)", amount: 30_000_000_000 },
      { id: "it-2", description: "Mesin Tenun Otomatis", amount: 15_000_000_000 },
      { id: "it-3", description: "Persediaan Benang Katun", amount: 5_000_000_000 },
    ],
    rateLines: [
      { id: "rl-1", label: "FLEXAS", rate: 0.12, premium: 60_000_000, min: 0.1, max: 0.2 },
    ],
  }

  const updated = await updatePlacingSlip(created.id, updateInput, testUser.id)
  assert(updated.insuredName === updateInput.insuredName, "Updated insured name persisted")
  assert(updated.interestItems?.length === 3, `Updated interest items count: ${updated.interestItems?.length} (expected 3)`)
  assert(updated.rateLines?.length === 1, `Updated rate lines count: ${updated.rateLines?.length} (expected 1)`)

  // 6. Test togglePlacingSlipStatus()
  console.log("\n[TEST 6] togglePlacingSlipStatus()")
  const toggled = await togglePlacingSlipStatus(created.id, "Quoted", testUser.id)
  assert(toggled.status === "Quoted", "Status updated to Quoted")

  const toggledBack = await togglePlacingSlipStatus(created.id, "Draft", testUser.id)
  assert(toggledBack.status === "Draft", "Status reverted back to Draft")

  // 7. Test releasePlacingSlip() & Atomic Document Number Generation
  console.log("\n[TEST 7] releasePlacingSlip() & Atomic Document Numbering (PS/...)")
  const released = await releasePlacingSlip(created.id, testUser.id)
  assert(released.status === "Released", "Status updated to Released")
  assert(Boolean(released.slipNo), `Official slip number generated: ${released.slipNo}`)
  assert(Boolean(released.slipNo?.includes("/PS-") || released.slipNo?.includes("/PS/")), `Slip number format contains /PS- or /PS/: ${released.slipNo}`)

  // 8. Test Status Guard: Released slip cannot be physically deleted
  console.log("\n[TEST 8] Protection Guard: Released slip cannot be deleted")
  let deleteBlocked = false
  try {
    await deletePlacingSlip(created.id, testUser.id)
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('Hanya Placing Slip berstatus "Draft" yang dapat dihapus fisik')) {
      deleteBlocked = true
    }
  }
  assert(deleteBlocked, "Physical deletion of Released placing slip correctly blocked by status guard")

  // 9. Test Cancel Status Transition on Released Slip
  console.log("\n[TEST 9] Cancellation of Released Slip")
  const cancelled = await togglePlacingSlipStatus(created.id, "Cancelled", testUser.id)
  assert(cancelled.status === "Cancelled", "Slip status successfully changed to Cancelled")
  assert(cancelled.slipNo === released.slipNo, "Cancelled slip retains original official document number to prevent numbering gaps")

  // 10. Clean up: Create a test draft and delete it to verify clean child deletion
  console.log("\n[TEST 10] deletePlacingSlip() cascade cleanup on Draft")
  const draftToClean = await createPlacingSlip(
    {
      clientId: testClient.id,
      cob: "Motor Vehicle",
      insuredName: "Temporary Draft for Delete Test",
      status: "Draft",
      interestItems: [{ id: "tmp-1", description: "Toyota Innova Zenix", amount: 450_000_000 }],
      rateLines: [{ id: "rl-tmp", label: "Comprehensive", rate: 2.5, premium: 11_250_000 }],
      securityPanel: [{ id: "sp-tmp", insurer: "PT Asuransi Wahana Tata", share: 100, role: "As Leader" }],
    },
    testUser.id
  )
  assert(Boolean(draftToClean.id), `Draft to clean created: ${draftToClean.id}`)

  await deletePlacingSlip(draftToClean.id, testUser.id)
  const afterClean = await getPlacingSlipById(draftToClean.id)
  assert(afterClean === null, "Draft slip and child records deleted cleanly from PostgreSQL")

  // Clean up cancelled test slip
  await prisma.$transaction(async (tx) => {
    await tx.slipItem.deleteMany({ where: { slipId: created.id } })
    await tx.slipRateLine.deleteMany({ where: { slipId: created.id } })
    await tx.slipSecurityPanel.deleteMany({ where: { slipId: created.id } })
    await tx.slipClause.deleteMany({ where: { slipId: created.id } })
    await tx.slipWordingForm.deleteMany({ where: { slipId: created.id } })
    await tx.placingSlip.delete({ where: { id: created.id } })
  })

  console.log("\n==========================================")
  console.log(`PLACING SLIP INTEGRATION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log("==========================================")

  if (failed > 0) process.exit(1)
}

runTests()
  .catch((err) => {
    console.error("Test execution failed:", err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
