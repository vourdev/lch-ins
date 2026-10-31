/**
 * Batas satu berkas unggahan. Vercel menolak body request di atas 4,5 MB,
 * jadi batasnya dibuat di bawah itu supaya pesan errornya tetap dari aplikasi.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024

/** Jenis berkas yang diterima. SVG sengaja tidak, karena bisa berisi skrip. */
export const UPLOAD_ACCEPT = "application/pdf,image/jpeg,image/png,image/webp"

export const UPLOAD_HINT = "PDF, JPG, PNG, atau WebP, maksimal 4 MB."

/**
 * Pemeriksaan di browser sebelum berkas dikirim, supaya pengguna langsung
 * tahu. Server memeriksa ulang jenisnya dari isi file.
 */
export function uploadProblem(file: { size: number; type: string }) {
  if (!UPLOAD_ACCEPT.split(",").includes(file.type)) {
    return "Hanya PDF, JPG, PNG, atau WebP yang bisa diunggah."
  }
  if (file.size > MAX_UPLOAD_BYTES) return "Ukuran file maksimal 4 MB."
  return null
}
