# Integrasi Kelengkapan Dokumen dan Tindak Lanjut Klaim (PRD A-04 & A-18, ERD v1.5)

- **Tanggal:** 2026-10-22
- **Branch:** `feat/claim-documents-followups`
- **PR:** #17
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Mengacu pada PRD Modul 3 (Klaim) butir A-04 (Checklist Berkas Klaim per COB) dan butir A-18 (Riwayat Tindak Lanjut Penanganan Klaim), serta penyelarasan ERD relasional v1.5 (`claim_documents` dan `claim_followups`):
1. Pengguna memerlukan pencatatan checklist dokumen yang terstruktur per Class of Business (Property, Motor Vehicle, Marine Cargo, Engineering) dengan pembeda berkas wajib vs opsional.
2. Ketika seluruh berkas dokumen wajib diterima, tanggal kelengkapan dokumen klaim (`documentCompleteDate`) harus terisi secara otomatis agar tahapan klaim dapat segera berlanjut ke penaksir (adjuster) atau penerbitan SPK/SPGR.
3. Staf klaim memerlukan riwayat tindak lanjut (follow-up timeline) kronologis bertanggal untuk mendokumentasikan investigasi, komunikasi tertanggung, adjuster, dan pihak asuradur.

## Yang berubah

- **Server Data Layer Klaim (`lib/server/claims.ts`):**
  - Implementasi fungsi inisialisasi checklist dokumen otomatis (`listClaimDocuments`): mendeteksi COB polis terkait klaim dan mengisikan checklist awal dari master `claim_document_types` jika klaim belum memiliki berkas terdaftar.
  - Penambahan mutasi berkas: `toggleClaimDocument` (dengan deteksi otomatis kelengkapan berkas wajib untuk memperbarui `claim.documentCompleteDate`), `updateClaimDocument` (catatan dan file path), `addClaimDocument` (penambahan berkas ad-hoc/custom), dan `deleteClaimDocument`.
  - Penambahan mutasi tindak lanjut: `listClaimFollowups` (urut kronologis terbaru), `addClaimFollowup` (pencatatan tanggal, catatan aktivitas, dan relasi pembuat `created_by`), serta `deleteClaimFollowup`.
- **Server Actions Klaim (`app/(app)/claims/actions.ts`):**
  - Penyediaan aksi `listClaimDocumentsAction`, `toggleClaimDocumentAction`, `updateClaimDocumentAction`, `addClaimDocumentAction`, `deleteClaimDocumentAction`, `listClaimFollowupsAction`, `addClaimFollowupAction`, dan `deleteClaimFollowupAction` dengan proteksi otorisasi berbasis sesi `requireAccess` / `requireManage` serta revalidasi rute Next.js.
- **Antarmuka Interaktif Drawer Klaim (`components/claims/claim-detail-sheet.tsx`):**
  - Migrasi tampilan drawer detail klaim menjadi multi-tab berbasis Radix Tabs: **Ringkasan**, **Berkas Dokumen**, dan **Tindak Lanjut**.
  - Tab Berkas Dokumen: menampilkan progress kelengkapan berkas, banner notifikasi status kelengkapan dokumen wajib, interaksi centang berkas diterima dengan optimistic UI & sonner toast, serta formulir penambahan berkas baru.
  - Tab Tindak Lanjut: menampilkan riwayat kronologis aktivitas tindak lanjut klaim bertanggal lengkap dengan nama staf pembuat, serta form input catatan tindak lanjut baru dengan proteksi disabled saat submit.
  - Standarisasi styling canonical Tailwind dan kepatuhan terhadap aturan `/antislop-code` dan `/frontend-code-review`.

## File utama

- `lib/server/claims.ts`: Logika relasional database Prisma 7 untuk inisialisasi berkas dokumen klaim, mutasi toggle status, pembaruan `documentCompleteDate`, dan riwayat follow-up.
- `app/(app)/claims/actions.ts`: Server Actions berotorisasi untuk mutasi dokumen dan tindak lanjut klaim.
- `components/claims/claim-detail-sheet.tsx`: Tampilan drawer interaktif dengan multi-tab (Ringkasan, Berkas Dokumen, Tindak Lanjut).
- `scripts/test-claim-docs-followups.ts`: Script uji integrasi end-to-end yang menguji alur kelengkapan berkas, penambahan kustom, dan pencatatan riwayat follow-up.

## Dampak

- **Database:** Tidak ada perubahan skema (tabel `claim_documents` dan `claim_followups` sudah ada di skema Prisma ERD v1.5). Data checklist terisi otomatis saat klaim dibuka.
- **Env:** Tidak ada variabel lingkungan baru.
- **Deploy:** Tidak ada langkah khusus.

## Verifikasi

1. **Uji Integrasi End-to-End Dokumen & Follow-up Klaim:**
   - `npx tsx --env-file=.env --conditions=react-server scripts/test-claim-docs-followups.ts`
   - Hasil: 9 skenario lolos (`listClaimDocuments`, `toggleClaimDocument`, `updateClaimDocument`, `addClaimDocument`, `deleteClaimDocument`, `addClaimFollowup`, `listClaimFollowups`, `deleteClaimFollowup`).
2. **Uji Regresi Model Relasional & Modul Terkait:**
   - `scripts/verify-erd-v1-5.ts`: Lolos (`ALL ERD V1.5 RELATIONAL MODEL TESTS PASSED`).
   - `scripts/verify-claims.ts`: Lolos (`ALL CLAIMS TESTS PASSED`).
   - `scripts/test-sppa-e2e.ts`: Lolos (`ALL 8 SPPA E2E TESTS PASSED`).
3. **Typecheck & Production Build:**
   - `npx tsc --noEmit`: 0 kesalahan tipe TypeScript.
   - `npm run build`: Kompilasi Turbopack Next.js 16.2.6 sukses untuk seluruh rute.

## Catatan untuk yang melanjutkan

- Dokumen klaim otomatis terinisialisasi sesuai COB polis klaim pada saat dibuka pertama kali.
- Jika semua dokumen dengan `isRequired: true` telah dicentang, `documentCompleteDate` pada tabel `claims` terisi otomatis. Jika salah satu dokumen wajib kemudian tidak dicentang (unchecked), tanggal tersebut otomatis dikosongkan kembali agar integritas proses klaim terjaga.
