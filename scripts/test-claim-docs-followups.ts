import { prisma } from "../lib/prisma"
import {
  listClaimDocuments,
  toggleClaimDocument,
  updateClaimDocument,
  addClaimDocument,
  deleteClaimDocument,
  listClaimFollowups,
  addClaimFollowup,
  deleteClaimFollowup,
} from "../lib/server/claims"

async function runTests() {
  console.log("=== STARTING CLAIM DOCUMENTS & FOLLOWUPS E2E TEST ===")

  // 1. Get an existing claim and user
  const claim = await prisma.claim.findFirst({
    include: { policy: { include: { cob: true } } },
  })
  const user = await prisma.user.findFirst({ select: { id: true, name: true } })

  if (!claim) throw new Error("No claim found in DB. Run seed first.")
  if (!user) throw new Error("No user found in DB. Run seed first.")

  console.log(`Testing with Claim: ${claim.claimNo} (COB: ${claim.policy.cob.name}), User: ${user.name}`)

  // 2. Test listClaimDocuments (auto-initializes checklist if empty)
  const docs = await listClaimDocuments(claim.id)
  if (docs.length === 0) {
    throw new Error(`Expected claim documents to be populated for COB ${claim.policy.cob.name}`)
  }
  console.log(`[PASS] listClaimDocuments returned ${docs.length} document checklist items`)

  // 3. Test toggleClaimDocument
  const targetDoc = docs[0]
  const toggled = await toggleClaimDocument(targetDoc.id, true, "2026-10-22")
  if (!toggled.isReceived || toggled.receivedDate !== "2026-10-22") {
    throw new Error(`toggleClaimDocument failed to mark received: ${JSON.stringify(toggled)}`)
  }
  console.log(`[PASS] toggleClaimDocument marked '${toggled.documentTypeName}' as received`)

  // 4. Test updateClaimDocument (notes)
  const updatedNote = "Dokumen asli sudah diverifikasi oleh staf operasional"
  const docWithNotes = await updateClaimDocument(targetDoc.id, { notes: updatedNote })
  if (docWithNotes.notes !== updatedNote) {
    throw new Error(`updateClaimDocument failed to save note: ${docWithNotes.notes}`)
  }
  console.log(`[PASS] updateClaimDocument saved notes correctly`)

  // 5. Test addClaimDocument (custom ad-hoc document)
  const customDoc = await addClaimDocument(claim.id, {
    name: "Surat Keterangan Kerusakan dari Pihak Ketiga",
    isRequired: false,
    notes: "Dokumen opsional tambahan",
  })
  if (!customDoc.id || customDoc.documentTypeName !== "Surat Keterangan Kerusakan dari Pihak Ketiga") {
    throw new Error(`addClaimDocument failed: ${JSON.stringify(customDoc)}`)
  }
  console.log(`[PASS] addClaimDocument created custom item: ${customDoc.documentTypeName}`)

  // 6. Test deleteClaimDocument
  await deleteClaimDocument(customDoc.id)
  const docsAfterDelete = await listClaimDocuments(claim.id)
  if (docsAfterDelete.some((d) => d.id === customDoc.id)) {
    throw new Error("deleteClaimDocument failed to remove document")
  }
  console.log(`[PASS] deleteClaimDocument removed custom document successfully`)

  // 7. Test addClaimFollowup
  const followup = await addClaimFollowup(
    claim.id,
    {
      followupDate: "2026-10-22",
      note: "Menghubungi tertanggung untuk verifikasi rekening penerima ganti rugi",
    },
    user.id
  )
  if (!followup.id || followup.createdByName !== user.name) {
    throw new Error(`addClaimFollowup failed: ${JSON.stringify(followup)}`)
  }
  console.log(`[PASS] addClaimFollowup created entry: '${followup.note}' by ${followup.createdByName}`)

  // 8. Test listClaimFollowups
  const followups = await listClaimFollowups(claim.id)
  if (followups.length === 0 || !followups.some((f) => f.id === followup.id)) {
    throw new Error("listClaimFollowups does not contain newly created followup")
  }
  console.log(`[PASS] listClaimFollowups returned ${followups.length} entries`)

  // 9. Test deleteClaimFollowup
  await deleteClaimFollowup(followup.id, user.id)
  const followupsAfterDelete = await listClaimFollowups(claim.id)
  if (followupsAfterDelete.some((f) => f.id === followup.id)) {
    throw new Error("deleteClaimFollowup failed to delete entry")
  }
  console.log(`[PASS] deleteClaimFollowup removed entry successfully`)

  // Reset targetDoc isReceived to initial state
  await toggleClaimDocument(targetDoc.id, false)
  console.log("=== ALL CLAIM DOCUMENTS & FOLLOWUPS E2E TESTS PASSED ===")
}

runTests()
  .catch((e) => {
    console.error("Test failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
