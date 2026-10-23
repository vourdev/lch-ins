import { POLICIES as MOCK_POLICIES } from "@/lib/data/policies"
import { prisma } from "@/lib/prisma"
import {
  createCobOjkClass,
  listCobOjkClasses,
  updateCobOjkClass,
} from "@/lib/server/cob-ojk-classes"
import {
  createPolicy,
  deletePolicy,
  listPolicies,
  listPolicyFormOptions,
  updatePolicy,
  type PolicyInput,
} from "@/lib/server/policies"

let failed = 0
function check(name: string, ok: boolean, detail?: unknown) {
  if (!ok) failed++
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${ok ? "" : ` ${JSON.stringify(detail)}`}`)
}

async function expectError(name: string, run: () => Promise<unknown>, pattern: RegExp) {
  try {
    await run()
    check(name, false, "no error")
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    check(name, pattern.test(message), message)
  }
}

async function main() {
  const admin = await prisma.user.findFirstOrThrow({ where: { email: "admin@lch.example" } })
  const policies = await listPolicies()
  // Surety Bond has no class of business in the SEOJK master list.
  const seedable = MOCK_POLICIES.filter((p) => p.cob !== "Surety Bond")
  check("seed loads every mappable mock policy", policies.length >= seedable.length, policies.length)
  check(
    "personal accident round-trips via GENERAL ACCIDENT",
    policies.some((p) => p.cob === "Personal Accident")
  )

  const endorsement = policies.find((p) => p.policyNo === "PAR/2025/JKT/0871-END01")
  const parent = policies.find((p) => p.policyNo === "PAR/2025/JKT/0871")
  check("endorsement links to its parent", !!parent && endorsement?.parentPolicyId === parent.id)
  check("leader insurer maps back", endorsement?.insurer === "PT Asuransi Sinar Mas", endorsement?.insurers)
  check("seed files carry over", (endorsement?.files.length ?? 0) === 1, endorsement?.files)
  check("client resolves to DB id", policies.some((p) => p.clientId && /-/.test(p.clientId)))
  check("seed endorsement has endorsementSeq", endorsement?.endorsementSeq === 1, endorsement?.endorsementSeq)
  if (!parent) throw new Error("Parent seed policy missing")

  const formOptions = await listPolicyFormOptions()
  check("form options return active insurers", formOptions.insurers.length > 0)
  check("form options return currencies", formOptions.currencies.some((c) => c.code === "IDR"))
  const domestic = formOptions.placementLocations.find((l) => l.name === "Dalam Negeri")
  check("placement location Dalam Negeri present", !!domestic)

  const testCobName = `Test Klasifikasi OJK ${Date.now()}`
  const ojkClass = await createCobOjkClass(testCobName, admin.id)
  check("createCobOjkClass succeeds", ojkClass.name === testCobName)
  const ojkList = await listCobOjkClasses()
  check("listCobOjkClasses contains new class", ojkList.some((c) => c.id === ojkClass.id))
  await expectError(
    "duplicate cob ojk class rejected",
    () => createCobOjkClass(testCobName, admin.id),
    /sudah ada/
  )
  const ojkUpdated = await updateCobOjkClass(ojkClass.id, { name: `${testCobName} Renamed`, isActive: false }, admin.id)
  check("updateCobOjkClass updates name and status", ojkUpdated.name.endsWith("Renamed") && !ojkUpdated.isActive)

  const input: PolicyInput = {
    ...parent,
    policyNo: `TEST/POL/${Date.now()}`,
    type: "Endorsement",
    parentPolicyId: parent.id,
    typeOfCover: "PAR + EQVET",
    cobOjkClassId: ojkClass.id,
    placementLocationId: domestic?.id ?? null,
    groupingInsured: "Grup Sinar Mas Testing",
    insurers: [
      { id: "", insurer: "PT Asuransi Sinar Mas", share: 60, role: "As Leader" },
      { id: "", insurer: "PT Asuransi Wahana Tata", share: 40, role: "As Member" },
    ],
  }
  const created = await createPolicy(input, admin.id)
  try {
    check("created keeps type of cover", created.typeOfCover === "PAR + EQVET", created.typeOfCover)
    check("created keeps two insurers", created.insurers.length === 2, created.insurers)
    check("member role survives", created.insurers.some((i) => i.role === "As Member"))
    check("endorsementSeq auto-increments", created.endorsementSeq === 2, created.endorsementSeq)
    check("cobOjkClassId saved", created.cobOjkClassId === ojkClass.id, created.cobOjkClassId)
    check("placementLocationId saved", created.placementLocationId === domestic?.id, created.placementLocationId)
    check("groupingInsured saved", created.groupingInsured === "Grup Sinar Mas Testing", created.groupingInsured)

    await expectError("duplicate policy no is rejected", () => createPolicy(input, admin.id), /sudah terdaftar/)

    const updated = await updatePolicy(created.id, { ...input, premium: 1234, insurers: [], groupingInsured: "Grup Astra" }, admin.id)
    check("update writes premium", updated.premium === 1234, updated.premium)
    check("update keeps endorsementSeq", updated.endorsementSeq === 2, updated.endorsementSeq)
    check("update writes groupingInsured", updated.groupingInsured === "Grup Astra", updated.groupingInsured)
    check("empty panel falls back to leader", updated.insurers.length === 1 && updated.insurers[0].share === 100, updated.insurers)

    await expectError(
      "parent with children cannot be deleted",
      () => deletePolicy(parent.id, admin.id),
      /induk|klaim/
    )
  } finally {
    await deletePolicy(created.id, admin.id)
    await prisma.cobOjkClass.delete({ where: { id: ojkClass.id } })
  }
  check("delete removes the row", !(await prisma.policy.findUnique({ where: { id: created.id } })))

  console.log(failed ? `${failed} FAILED` : "ALL PASSED")
  process.exit(failed ? 1 : 0)
}

main()
