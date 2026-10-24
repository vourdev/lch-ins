"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Save, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  deleteClauseAction,
  saveClauseAction,
} from "@/app/(app)/underwriting/master-clauses/actions"
import { PageShell } from "@/components/layout/page-header"
import {
  FormActions,
  FormBody,
  FormToolbar,
} from "@/components/shared/form-chrome"
import { SectionCard } from "@/components/shared/section-card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const LIST_HREF = "/underwriting/master-clauses"
const NONE = "none"

export interface ClauseFormValue {
  id: string
  title: string
  wordingHtml: string
  sourceGroup: string
  cobId: string | null
  coverTypeId: string | null
}

export function ClauseForm({
  clause,
  mode,
  cobs,
  coverTypes,
  groups,
}: {
  clause?: ClauseFormValue
  mode: "new" | "edit"
  cobs: { id: string; name: string; code: string; isActive: boolean }[]
  coverTypes: { id: string; name: string; code: string; cobId: string; isActive: boolean }[]
  groups: string[]
}) {
  const router = useRouter()
  const [title, setTitle] = React.useState(clause?.title ?? "")
  const [wording, setWording] = React.useState(clause?.wordingHtml ?? "")
  const [sourceGroup, setSourceGroup] = React.useState(
    clause?.sourceGroup ?? ""
  )
  const [cobId, setCobId] = React.useState(clause?.cobId ?? "")
  const [coverTypeId, setCoverTypeId] = React.useState(
    clause?.coverTypeId ?? ""
  )
  const [saving, setSaving] = React.useState(false)

  const words = wording
    .replace(/<[^>]+>/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length

  const cobItems = [
    { label: "Berlaku semua class", value: NONE },
    ...cobs
      .filter((c) => c.isActive || c.id === cobId)
      .map((c) => ({ label: c.name, value: c.id })),
  ]
  const coverItems = [
    { label: "Berlaku semua type of cover", value: NONE },
    ...coverTypes
      .filter((t) => t.cobId === cobId && (t.isActive || t.id === coverTypeId))
      .map((t) => ({ label: `${t.code} — ${t.name}`, value: t.id })),
  ]
  const groupItems = [
    { label: "Tanpa kelompok", value: NONE },
    ...groups.map((g) => ({ label: g, value: g })),
  ]

  async function save() {
    setSaving(true)
    const result = await saveClauseAction(clause?.id ?? null, {
      title,
      wordingHtml: wording,
      sourceGroup,
      cobId: cobId || null,
      coverTypeId: coverTypeId || null,
    })
    setSaving(false)

    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(
      mode === "new" ? "Clause baru tersimpan" : "Clause diperbarui"
    )
    router.push(LIST_HREF)
  }

  async function remove() {
    if (!clause) return
    const result = await deleteClauseAction(clause.id)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(
      result.deactivated ? "Clause dinonaktifkan" : "Clause dihapus",
      result.deactivated
        ? {
            description: `Dipakai ${result.used} placing slip, jadi tidak dihapus supaya slip lama tetap bisa ditelusuri.`,
          }
        : undefined
    )
    router.push(LIST_HREF)
  }

  return (
    <PageShell className="gap-0 p-0">
      <FormToolbar
        title={mode === "new" ? "Clause Baru" : "Edit Clause"}
        backHref={LIST_HREF}
        badge={
          sourceGroup ? <Badge variant="secondary">{sourceGroup}</Badge> : null
        }
        subtitle={title || "Belum ada judul"}
        meta={`${words} kata`}
      />

      <FormBody className="max-w-[980px]">
        <SectionCard title="Identitas Clause">
          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="cl-title">Judul Clause *</FieldLabel>
              <Input
                id="cl-title"
                value={title}
                placeholder="Contoh: Machinery Breakdown Clause"
                autoFocus
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field>
                <FieldLabel>Kelompok Produk</FieldLabel>
                <Select
                  items={groupItems}
                  value={sourceGroup || NONE}
                  onValueChange={(v) =>
                    setSourceGroup(v === NONE ? "" : (v as string))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {groupItems.map((i) => (
                        <SelectItem key={i.value} value={i.value}>
                          {i.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Kelompok di pustaka wording LCH. Judul yang sama boleh dipakai
                  lagi asal kelompoknya berbeda.
                </p>
              </Field>

              <Field>
                <FieldLabel>Class of Business</FieldLabel>
                <Select
                  items={cobItems}
                  value={cobId || NONE}
                  onValueChange={(v) => {
                    setCobId(v === NONE ? "" : (v as string))
                    setCoverTypeId("")
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {cobItems.map((i) => (
                        <SelectItem key={i.value} value={i.value}>
                          {i.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>Type of Cover</FieldLabel>
                <Select
                  items={coverItems}
                  value={coverTypeId || NONE}
                  disabled={!cobId}
                  onValueChange={(v) =>
                    setCoverTypeId(v === NONE ? "" : (v as string))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {coverItems.map((i) => (
                        <SelectItem key={i.value} value={i.value}>
                          {i.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {cobId
                    ? "Kosongkan agar berlaku di seluruh type of cover class ini."
                    : "Pilih class of business dulu."}
                </p>
              </Field>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Isi Wording Clause"
          description="Format ikut terbawa ke placing slip dan dokumen turunannya."
        >
          <RichTextEditor
            value={wording}
            onChange={setWording}
            minHeight="26rem"
            placeholder="Tulis wording klausula lengkap — gunakan daftar bernomor untuk sub-ayat."
          />
        </SectionCard>
      </FormBody>

      <FormActions>
        {mode === "edit" ? (
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" />}>
              <Trash2 data-icon="inline-start" />
              Hapus Clause
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus clause ini?</AlertDialogTitle>
                <AlertDialogDescription>
                  &ldquo;{clause?.title}&rdquo; akan dihapus dari master. Kalau
                  sudah dipakai placing slip, clause-nya hanya dinonaktifkan
                  supaya slip lama tetap bisa ditelusuri.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={remove}>Hapus</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            render={<Link href={LIST_HREF} />}
            nativeButton={false}
          >
            Batal
          </Button>
          <Button onClick={save} disabled={saving}>
            <Save data-icon="inline-start" />
            {saving ? "Menyimpan…" : "Simpan Clause"}
          </Button>
        </div>
      </FormActions>
    </PageShell>
  )
}
