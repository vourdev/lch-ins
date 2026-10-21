/**
 * End-to-End Integration Test for Audit Trail Module & Activity Logging
 * Run with: node -r ./scripts/mock-server-only.cjs --import tsx --env-file=.env scripts/test-audit-e2e.ts
 */

import { prisma } from "../lib/prisma"
import { diffChanges, recordAudit } from "../server/services/audit"
import {
  listAuditEntities,
  listAuditLogs,
} from "../lib/server/audit"
import {
  createClient,
  deleteClient,
  toggleClientStatus,
  updateClient,
} from "../lib/server/clients"
import {
  createSppa,
  deleteSppa,
  toggleSppaStatus,
} from "../lib/server/sppa"

async function runTests() {
  console.log("=== STARTING AUDIT TRAIL E2E INTEGRATION TEST ===\n")

  // Find admin user for audit attribution
  const adminUser = await prisma.user.findFirst({
    where: { isActive: true, roles: { has: "admin" } },
  })

  if (!adminUser) {
    throw new Error("No active admin user found in database for testing.")
  }

  console.log(`[AUTH CONTEXT] Testing with Admin: ${adminUser.name} (${adminUser.email})\n`)

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

  // TEST 1: Sensitive Credential Redaction in diffChanges
  console.log("[TEST 1] Sensitive Credential & Secret Redaction in diffChanges")
  const beforeSecret = {
    name: "User Test",
    email: "user@test.com",
    password: "supersecretpassword123",
    passwordHash: "$2b$10$abcdefghijklmnopqrstuv",
    temporaryPassword: "tempPassword999",
    token: "session-token-xyz",
    secret: "api-secret-key",
  }
  const afterSecret = {
    name: "User Test Updated",
    email: "user@test.com",
    password: "newsecretpassword456",
    passwordHash: "$2b$10$xyzvw9876543210zyxwvu",
    temporaryPassword: "newTempPass111",
    token: "new-session-token",
    secret: "new-api-secret-key",
  }

  const diff = diffChanges(beforeSecret, afterSecret)
  assert(
    diff.name !== undefined && diff.name.after === "User Test Updated",
    "Regular changed fields ('name') are properly captured"
  )
  assert(!("password" in diff), "Field 'password' is redacted and stripped")
  assert(!("passwordHash" in diff), "Field 'passwordHash' is redacted and stripped")
  assert(!("temporaryPassword" in diff), "Field 'temporaryPassword' is redacted and stripped")
  assert(!("token" in diff), "Field 'token' is redacted and stripped")
  assert(!("secret" in diff), "Field 'secret' is redacted and stripped")

  // Verify direct recordAudit creates record with masked payload
  const directAuditRecord = await recordAudit({
    userId: adminUser.id,
    entity: "users",
    entityId: adminUser.id,
    action: "Update",
    before: beforeSecret,
    after: afterSecret,
  })
  assert(
    Boolean(directAuditRecord.id),
    "recordAudit successfully inserts audit record into database"
  )
  const directChanges = (directAuditRecord.changes as Record<string, unknown>) ?? {}
  assert(
    !("password" in directChanges) && !("secret" in directChanges),
    "recordAudit persists changes without sensitive credentials"
  )
  // Cleanup direct test audit record
  await prisma.auditLog.delete({ where: { id: directAuditRecord.id } })

  // TEST 2: Client Creation Audit
  console.log("\n[TEST 2] Client Creation Audit Logging")
  const testClientName = `PT Test Audit Log ${Date.now()}`
  const createdClient = await createClient(
    {
      clientType: "Korporasi",
      name: testClientName,
      cob: "Property",
      status: "Active",
      notes: "Audit trail verification client",
    },
    adminUser.id
  )

  const clientCreateLog = await prisma.auditLog.findFirst({
    where: {
      entity: "clients",
      entityId: createdClient.dbId,
      action: "Create",
    },
    include: { user: true },
  })

  assert(Boolean(clientCreateLog), "Audit log created in database for client create")
  assert(
    clientCreateLog?.userId === adminUser.id,
    "Audit log correctly attributed to user ID"
  )
  assert(
    clientCreateLog?.user.name === adminUser.name,
    "Audit log correctly relates to user record"
  )

  // TEST 3: Client Update Audit
  console.log("\n[TEST 3] Client Update Audit Logging")
  await updateClient(
    createdClient.id,
    {
      clientType: "Korporasi",
      name: testClientName,
      cob: "Property",
      status: "Active",
      notes: "Audit trail notes updated",
    },
    adminUser.id
  )

  const clientUpdateLog = await prisma.auditLog.findFirst({
    where: {
      entity: "clients",
      entityId: createdClient.dbId,
      action: "Update",
    },
    orderBy: { createdAt: "desc" },
  })

  assert(Boolean(clientUpdateLog), "Audit log created for client update")
  const clientChanges = (clientUpdateLog?.changes as Record<string, { before: unknown; after: unknown }>) ?? {}
  assert(
    clientChanges.notes !== undefined &&
      clientChanges.notes.after === "Audit trail notes updated",
    "Field changes recorded accurately with before and after snapshots"
  )

  // TEST 4: Client Status Toggle Audit
  console.log("\n[TEST 4] Client Status Toggle Audit Logging")
  await toggleClientStatus(createdClient.id, "Inactive", adminUser.id)

  const statusToggleLog = await prisma.auditLog.findFirst({
    where: {
      entity: "clients",
      entityId: createdClient.dbId,
      action: "Update",
    },
    orderBy: { createdAt: "desc" },
  })

  const statusChanges = (statusToggleLog?.changes as Record<string, { before: unknown; after: unknown }>) ?? {}
  assert(
    statusChanges.status !== undefined && statusChanges.status.after === "Inactive",
    "Status toggle logged with status change"
  )

  // TEST 5: SPPA Creation Audit
  console.log("\n[TEST 5] SPPA Creation Audit Logging")
  const testSppa = await createSppa(
    {
      clientId: createdClient.id,
      cob: "Property",
      typeOfCover: "Property All Risks",
      insuredName: testClientName,
      sumInsured: 1000000000,
      riskLocation: "Kawasan Industri MM2100 Blok C-4",
      currency: "IDR",
      periodStart: "2026-11-01",
      periodEnd: "2027-11-01",
      status: "Draft",
    },
    adminUser.id
  )

  const sppaCreateLog = await prisma.auditLog.findFirst({
    where: {
      entity: "sppa",
      entityId: testSppa.dbId,
      action: "Create",
    },
  })

  assert(Boolean(sppaCreateLog), "Audit log created for SPPA creation")
  assert(sppaCreateLog?.userId === adminUser.id, "Audit log attributed to actor")

  // TEST 6: SPPA Status Toggle Audit
  console.log("\n[TEST 6] SPPA Status Toggle Audit Logging")
  await toggleSppaStatus(testSppa.id, "Submitted", adminUser.id)

  const sppaStatusLog = await prisma.auditLog.findFirst({
    where: {
      entity: "sppa",
      entityId: testSppa.dbId,
      action: "Update",
    },
    orderBy: { createdAt: "desc" },
  })

  const sppaChanges = (sppaStatusLog?.changes as Record<string, { before: unknown; after: unknown }>) ?? {}
  assert(
    sppaChanges.status !== undefined && sppaChanges.status.after === "Submitted",
    "SPPA status change (Draft -> Submitted) logged"
  )

  // TEST 7: SPPA Deletion Audit
  console.log("\n[TEST 7] SPPA Deletion Audit Logging")
  await deleteSppa(testSppa.id, adminUser.id)

  const sppaDeleteLog = await prisma.auditLog.findFirst({
    where: {
      entity: "sppa",
      entityId: testSppa.dbId,
      action: "Delete",
    },
  })

  assert(Boolean(sppaDeleteLog), "Audit log created for SPPA deletion with action 'Delete'")

  // TEST 8: Query Audit Logs Layer (listAuditLogs & listAuditEntities)
  console.log("\n[TEST 8] Query Audit Logs Layer (listAuditLogs & listAuditEntities)")
  const entities = await listAuditEntities()
  assert(entities.includes("clients"), "listAuditEntities contains 'clients'")
  assert(entities.includes("sppa"), "listAuditEntities contains 'sppa'")

  const clientLogsQuery = await listAuditLogs({
    entity: "clients",
    pageSize: 10,
  })
  assert(
    clientLogsQuery.items.length > 0 &&
      clientLogsQuery.items.every((i) => i.entity.toLowerCase() === "clients"),
    "listAuditLogs filters accurately by entity"
  )

  const searchLogsQuery = await listAuditLogs({
    search: adminUser.email,
    pageSize: 10,
  })
  assert(
    searchLogsQuery.items.length > 0 &&
      searchLogsQuery.items.every((i) => i.userEmail === adminUser.email),
    "listAuditLogs searches accurately by user email"
  )

  // Clean up test client
  await deleteClient(createdClient.id, adminUser.id)

  const clientDeleteLog = await prisma.auditLog.findFirst({
    where: {
      entity: "clients",
      entityId: createdClient.dbId,
      action: "Delete",
    },
  })
  assert(Boolean(clientDeleteLog), "Client deletion logged with action 'Delete'")

  // SUMMARY
  console.log("\n==========================================")
  console.log(`AUDIT TRAIL INTEGRATION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log("==========================================")

  if (failed > 0) {
    process.exit(1)
  }
}

runTests()
  .catch((err) => {
    console.error("Test execution failed:", err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
