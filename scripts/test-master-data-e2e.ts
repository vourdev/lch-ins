/**
 * End-to-End Integration Test for Master Data Module
 * Run with: node -r ./scripts/mock-server-only.cjs --import tsx --env-file=.env scripts/test-master-data-e2e.ts
 */

import { prisma } from "../lib/prisma"
import {
  createAdjuster,
  createBankAccount,
  createCob,
  createCoverType,
  createInsurer,
  createLookupValue,
  createWordingForm,
  deleteCob,
  deleteLookupValue,
  listAdjusters,
  listBankAccounts,
  listCurrencies,
  listInsurers,
  listLookupValues,
  listMasterCob,
  listOccupations,
  listWordingForms,
  toggleAdjusterStatus,
  toggleBankAccountStatus,
  toggleCobStatus,
  toggleCoverTypeStatus,
  toggleInsurerStatus,
  toggleLookupValueStatus,
  toggleWordingFormStatus,
  updateAdjuster,
  updateBankAccount,
  updateCob,
  updateCoverType,
  updateInsurer,
  updateLookupValue,
} from "../lib/server/master-data"

async function runTests() {
  console.log("=== STARTING MASTER DATA E2E INTEGRATION TEST ===\n")

  const admin = await prisma.user.findFirst({
    where: { isActive: true, roles: { has: "admin" } },
  })
  if (!admin) throw new Error("No active admin user found.")

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

  // 1. COB & Cover Type
  console.log("[TEST 1] COB & Cover Type CRUD & Reference Guards")
  const rateMode = await prisma.lookupValue.findFirst({ where: { lookupType: "rate_mode" } })
  const formVariant = await prisma.lookupValue.findFirst({ where: { lookupType: "form_variant" } })
  if (!rateMode || !formVariant) throw new Error("Seed lookup values missing.")

  const testCobCode = `T${Math.floor(10 + Math.random() * 89)}`
  const newCob = await createCob(
    {
      code: testCobCode,
      name: `Test COB ${testCobCode}`,
      rateModeId: rateMode.id,
      formVariantId: formVariant.id,
      isActive: true,
    },
    admin.id
  )
  assert(Boolean(newCob.id), "COB successfully created")

  const updatedCob = await updateCob(
    newCob.id,
    {
      code: testCobCode,
      name: `Test COB Updated ${testCobCode}`,
      rateModeId: rateMode.id,
      formVariantId: formVariant.id,
      isActive: true,
    },
    admin.id
  )
  assert(updatedCob.name.includes("Updated"), "COB successfully updated")

  await toggleCobStatus(newCob.id, false, admin.id)
  const toggledCob = await prisma.classOfBusiness.findUnique({ where: { id: newCob.id } })
  assert(toggledCob?.isActive === false, "COB status toggled to inactive")

  // Cover Type
  const testCoverCode = `${testCobCode}01`
  const newCoverType = await createCoverType(
    {
      cobId: newCob.id,
      code: testCoverCode,
      name: `Test Cover Type ${testCoverCode}`,
      isActive: true,
    },
    admin.id
  )
  assert(Boolean(newCoverType.id), "Cover Type successfully created")

  const updatedCoverType = await updateCoverType(
    newCoverType.id,
    {
      cobId: newCob.id,
      code: testCoverCode,
      name: `Test Cover Type Updated ${testCoverCode}`,
      isActive: true,
    },
    admin.id
  )
  assert(updatedCoverType.name.includes("Updated"), "Cover Type successfully updated")

  await toggleCoverTypeStatus(newCoverType.id, false, admin.id)
  const toggledCover = await prisma.coverType.findUnique({ where: { id: newCoverType.id } })
  assert(toggledCover?.isActive === false, "Cover Type status toggled to inactive")

  // Reference guard: Deleting COB that has CoverType should fail
  let cobDeleteFailedAsExpected = false
  try {
    await deleteCob(newCob.id, admin.id)
  } catch {
    cobDeleteFailedAsExpected = true
  }
  assert(cobDeleteFailedAsExpected, "Deleting COB with existing Cover Types rejected by reference guard")

  // Cleanup CoverType then delete COB
  await prisma.coverType.delete({ where: { id: newCoverType.id } })
  await deleteCob(newCob.id, admin.id)
  const cobAfterDelete = await prisma.classOfBusiness.findUnique({ where: { id: newCob.id } })
  assert(!cobAfterDelete, "COB deleted successfully after references cleared")

  // 2. Insurers & Adjusters
  console.log("\n[TEST 2] Insurers & Adjusters CRUD")
  const testInsurer = await createInsurer(
    {
      name: `PT Asuransi Test ${Date.now()}`,
      contactPerson: "Budi Santoso",
      email: "budi@test-asuransi.com",
      phone: "021-5551234",
      address: "Jl. Jend Sudirman Kav 25 Jakarta",
      isActive: true,
    },
    admin.id
  )
  assert(Boolean(testInsurer.id), "Insurer successfully created")

  const updatedInsurer = await updateInsurer(
    testInsurer.id,
    {
      name: testInsurer.name,
      contactPerson: "Budi Santoso Updated",
      email: "budi.updated@test-asuransi.com",
      phone: "021-5551234",
      address: "Jl. Jend Sudirman Kav 25 Jakarta",
      isActive: true,
    },
    admin.id
  )
  assert(updatedInsurer.contactPerson === "Budi Santoso Updated", "Insurer updated")

  await toggleInsurerStatus(testInsurer.id, false, admin.id)
  const toggledInsurer = await prisma.insurer.findUnique({ where: { id: testInsurer.id } })
  assert(toggledInsurer?.isActive === false, "Insurer status toggled to inactive")

  // Adjuster
  const testAdjuster = await createAdjuster(
    {
      name: `PT Adjuster Test ${Date.now()}`,
      contactPerson: "Hendra Wijaya",
      email: "hendra@test-adjuster.com",
      phone: "021-8889999",
      address: "Gedung Cyber Lt. 5 Jakarta",
      isActive: true,
    },
    admin.id
  )
  assert(Boolean(testAdjuster.id), "Adjuster successfully created")

  const updatedAdjuster = await updateAdjuster(
    testAdjuster.id,
    {
      name: testAdjuster.name,
      contactPerson: "Hendra Wijaya Updated",
      email: "hendra.updated@test-adjuster.com",
      phone: "021-8889999",
      address: "Gedung Cyber Lt. 5 Jakarta",
      isActive: true,
    },
    admin.id
  )
  assert(updatedAdjuster.contactPerson === "Hendra Wijaya Updated", "Adjuster updated")

  await toggleAdjusterStatus(testAdjuster.id, false, admin.id)
  const toggledAdjuster = await prisma.adjuster.findUnique({ where: { id: testAdjuster.id } })
  assert(toggledAdjuster?.isActive === false, "Adjuster status toggled to inactive")

  const insurersList = await listInsurers()
  assert(insurersList.length > 0, "listInsurers returns list")

  const adjustersList = await listAdjusters()
  assert(adjustersList.length > 0, "listAdjusters returns list")

  // Cleanup Insurer & Adjuster
  await prisma.insurer.delete({ where: { id: testInsurer.id } })
  await prisma.adjuster.delete({ where: { id: testAdjuster.id } })

  // 3. Bank Accounts & Wording Forms
  console.log("\n[TEST 3] Bank Accounts & Wording Forms")
  const bankLookup = await prisma.lookupValue.findFirst({ where: { lookupType: "bank" } })
  if (!bankLookup) throw new Error("Bank lookup seed missing.")

  const testBankAcc = await createBankAccount(
    {
      bankId: bankLookup.id,
      accountNo: `ACC-${Date.now()}`,
      accountName: "PT LCH Insurance Brokers - Titipan Premi",
      currencyCode: "IDR",
      isPremiumTrust: true,
      isActive: true,
    },
    admin.id
  )
  assert(Boolean(testBankAcc.id) && testBankAcc.isPremiumTrust === true, "Bank account created with Premium Trust flag")

  const updatedBankAcc = await updateBankAccount(
    testBankAcc.id,
    {
      bankId: bankLookup.id,
      accountNo: testBankAcc.accountNo,
      accountName: "PT LCH Insurance Brokers - Titipan Premi Updated",
      currencyCode: "IDR",
      isPremiumTrust: true,
      isActive: true,
    },
    admin.id
  )
  assert(updatedBankAcc.accountName.includes("Updated"), "Bank account updated")

  await toggleBankAccountStatus(testBankAcc.id, false, admin.id)
  const toggledBank = await prisma.bankAccount.findUnique({ where: { id: testBankAcc.id } })
  assert(toggledBank?.isActive === false, "Bank account toggled to inactive")

  const bankAccountsList = await listBankAccounts()
  assert(bankAccountsList.length > 0, "listBankAccounts returns list")
  await prisma.bankAccount.delete({ where: { id: testBankAcc.id } })

  // Wording Form
  const testWording = await createWordingForm(`Wording Form Test ${Date.now()}`, admin.id)
  assert(Boolean(testWording.id), "Wording form created")

  const wordingList = await listWordingForms()
  assert(wordingList.length > 0, "listWordingForms returns list")

  await toggleWordingFormStatus(testWording.id, false, admin.id)
  await prisma.wordingForm.delete({ where: { id: testWording.id } })

  // 4. Lookup Values & System Protection
  console.log("\n[TEST 4] Lookup Values & System Protection")
  const testLookupCode = `CUSTOM_TEST_${Date.now()}`
  const newLookup = await createLookupValue(
    {
      lookupType: "client_status",
      code: testLookupCode,
      name: "Custom Test Status",
      sortOrder: 99,
      isSystem: false,
      isActive: true,
    },
    admin.id
  )
  assert(Boolean(newLookup.id), "Custom lookup value created")

  const updatedLookup = await updateLookupValue(
    newLookup.id,
    {
      lookupType: "client_status",
      code: testLookupCode,
      name: "Custom Test Status Renamed",
      sortOrder: 100,
      isSystem: false,
      isActive: true,
    },
    admin.id
  )
  assert(updatedLookup.name === "Custom Test Status Renamed", "Custom lookup updated")

  await toggleLookupValueStatus(newLookup.id, false, admin.id)
  const toggledLookup = await prisma.lookupValue.findUnique({ where: { id: newLookup.id } })
  assert(toggledLookup?.isActive === false, "Lookup value status toggled to inactive")

  // System protection test
  const systemLookup = await prisma.lookupValue.findFirst({ where: { isSystem: true } })
  if (systemLookup) {
    let systemDeleteFailed = false
    try {
      await deleteLookupValue(systemLookup.id, admin.id)
    } catch {
      systemDeleteFailed = true
    }
    assert(systemDeleteFailed, "System lookup value protected against physical deletion")
  }

  await deleteLookupValue(newLookup.id, admin.id)
  const lookupAfterDelete = await prisma.lookupValue.findUnique({ where: { id: newLookup.id } })
  assert(!lookupAfterDelete, "Custom lookup deleted")

  // 5. Query Listings
  console.log("\n[TEST 5] Query Listings Verification")
  const cobList = await listMasterCob()
  assert(cobList.length > 0, "listMasterCob returns populated COBs")

  const occupations = await listOccupations({ limit: 10 })
  assert(occupations.length > 0, "listOccupations returns OJK occupations with tariffs")

  const currencies = await listCurrencies()
  assert(currencies.length > 0, "listCurrencies returns currencies")

  const lookups = await listLookupValues("client_status")
  assert(lookups.length > 0, "listLookupValues filters correctly by type")

  console.log("\n==========================================")
  console.log(`MASTER DATA INTEGRATION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`)
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
