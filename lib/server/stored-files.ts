import "server-only"

import type { Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { MAX_UPLOAD_BYTES } from "@/lib/uploads"

type Tx = Prisma.TransactionClient

/** Pemakaian berkas. Menentukan menu yang hak aksesnya dipakai saat dibuka. */
export type FilePurpose = "client_document"

const PURPOSE_MENU: Record<FilePurpose, string> = {
  client_document: "/marketing",
}

const PATH_PREFIX = "stored_files/"
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function storedFilePath(id: string) {
  return `${PATH_PREFIX}${id}`
}

/** Id stored_files dari file_path. Null untuk path data contoh dan blob URL lama. */
export function storedFileId(filePath: string | null | undefined) {
  if (!filePath?.startsWith(PATH_PREFIX)) return null
  const id = filePath.slice(PATH_PREFIX.length)
  return UUID_RE.test(id) ? id : null
}

/** Alamat untuk membuka isi berkas, atau undefined bila isinya tidak tersimpan. */
export function storedFileUrl(filePath: string | null | undefined) {
  const id = storedFileId(filePath)
  return id ? `/api/files/${id}` : undefined
}

export function purposeMenu(purpose: string) {
  return purpose in PURPOSE_MENU ? PURPOSE_MENU[purpose as FilePurpose] : null
}

/**
 * Jenis file dibaca dari byte awalnya, bukan dari keterangan browser yang bisa
 * dipalsukan. Berkas dibuka inline dari domain aplikasi, jadi hanya jenis yang
 * tidak bisa menjalankan skrip yang diterima.
 */
function detectContentType(bytes: Uint8Array) {
  const startsWith = (signature: number[], offset = 0) =>
    signature.every((b, i) => bytes[offset + i] === b)

  if (startsWith([0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf"
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png"
  }
  if (startsWith([0xff, 0xd8, 0xff])) return "image/jpeg"
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) {
    return "image/webp"
  }
  return null
}

/** Nama file tanpa folder dan karakter kontrol. */
function cleanFileName(name: string) {
  const base = name.split(/[\\/]/).pop() ?? ""
  const cleaned = base.replace(/[\u0000-\u001f\u007f]/g, "").trim()
  return (cleaned || "berkas").slice(0, 200)
}

export async function saveUploadedFile(
  file: File,
  purpose: FilePurpose,
  userId: string
) {
  if (file.size === 0) throw new Error("File kosong.")
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Ukuran file maksimal 4 MB.")
  }

  const data = new Uint8Array(await file.arrayBuffer())
  const contentType = detectContentType(data)
  if (!contentType) {
    throw new Error("Hanya PDF, JPG, PNG, atau WebP yang bisa diunggah.")
  }

  return prisma.storedFile.create({
    data: {
      fileName: cleanFileName(file.name),
      contentType,
      sizeBytes: data.byteLength,
      data,
      purpose,
      uploadedBy: userId,
    },
    select: { id: true, fileName: true },
  })
}

export async function readStoredFile(id: string) {
  if (!UUID_RE.test(id)) return null
  return prisma.storedFile.findUnique({
    where: { id },
    select: {
      fileName: true,
      contentType: true,
      sizeBytes: true,
      data: true,
      purpose: true,
    },
  })
}

/**
 * Pastikan berkas yang akan ditautkan memang hasil unggahan pengguna ini untuk
 * pemakaian yang sama. Mencegah id berkas orang lain ditempel ke data lain.
 */
export async function assertClaimableFile(
  tx: Tx,
  fileId: string,
  purpose: FilePurpose,
  userId: string
) {
  const file = UUID_RE.test(fileId)
    ? await tx.storedFile.findUnique({
        where: { id: fileId },
        select: { purpose: true, uploadedBy: true },
      })
    : null
  if (!file || file.purpose !== purpose || file.uploadedBy !== userId) {
    throw new Error("Berkas unggahan tidak ditemukan. Pilih ulang filenya.")
  }
}

/** Hapus isi berkas yang tidak dipakai lagi. Path data contoh dilewati. */
export async function deleteStoredFiles(
  tx: Tx,
  filePaths: (string | null | undefined)[]
) {
  const ids = filePaths
    .map(storedFileId)
    .filter((id): id is string => id != null)
  if (ids.length) {
    await tx.storedFile.deleteMany({ where: { id: { in: ids } } })
  }
}
