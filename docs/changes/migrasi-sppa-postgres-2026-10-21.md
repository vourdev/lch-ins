# Migrasi Modul SPPA ke PostgreSQL & Prisma 7

- **Tanggal:** 2026-10-21
- **Branch:** `feat/sppa-management-postgres`
- **PR:** #10
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Modul Surat Permintaan Penutupan Asuransi (SPPA) di menu Marketing (`/marketing`, tab SPPA) sebelumnya masih menggunakan penyimpanan in-memory mock store (`lib/store.ts` dan `lib/data/sppa.ts`). Hal ini menyebabkan data SPPA tidak tersimpan persisten ketika aplikasi di-refresh atau server restart, belum terhubung secara relasional ke tabel database `clients`, dan form entri belum divalidasi serta diotorisasi di sisi server melalui Server Actions Next.js.

Perubahan ini menyelesaikan migrasi persistensi SPPA ke PostgreSQL menggunakan model relasional `sppa` yang sudah tersedia di `prisma/schema.prisma`.

## Yang berubah

- **Server Data Layer (`lib/server/sppa.ts`)**:
  - Dibuat modul server-only data access untuk entitas SPPA dengan Prisma 7.
  - Implementasi caching lookup relasional (`ClassOfBusiness`, `CoverType`, `Occupation`, `Currency`).
  - Parsing dan resolusi kode okupasi OJK (ekstraksi kode numerik seperti `"2142"` dari label `"2142 - Factories..."`).
  - Query relasional `listSppa` dengan filter teks pencarian, klien, COB, dan status operasional.
  - CRUD operations: `createSppa`, `updateSppa`, `toggleSppaStatus`, dan `deleteSppa`.
  - Guard integritas referensial: pencegahan penghapusan SPPA bila sudah digunakan di tabel `placing_slips` (`_count.placingSlips > 0`).
  - Auto-seeding otomatis 3 SPPA mock awal jika tabel database masih kosong.
- **Server Actions Next.js (`app/(app)/marketing/actions.ts`)**:
  - Validasi Zod schema `sppaInputSchema` di sisi server dengan logika validasi tanggal (`periodEnd >= periodStart`).
  - Proteksi otorisasi berbasis rute `requireAccess("/marketing")`.
  - Server Actions: `createSppaAction`, `updateSppaAction`, `toggleSppaStatusAction`, dan `deleteSppaAction`.
  - Revalidasi cache App Router instan via `revalidatePath("/marketing")` dan `revalidatePath("/underwriting/new")`.
- **Integrasi Database Seeding (`prisma/seed.ts`)**:
  - Penambahan fungsi pembenihan `seedSppa()` yang idempotent (upsert berdasarkan `insuredName`).
  - Pendaftaran opsi `"sppa"` pada daftar seksi seed runner (`npm run db:seed -- sppa`).
- **UI & Dual-State Hydration**:
  - `app/(app)/marketing/page.tsx`: Pengambilan paralel server-side `listClients()` dan `listSppa()`.
  - `components/marketing/marketing-tabs.tsx`: Penerusan `initialSppa` dan penghitungan jumlah badge tab SPPA.
  - `components/marketing/sppa-table.tsx`: Penerimaan `initialSppa`, sinkronisasi store, integrasi aksi Status Toggle dan Hapus via Server Actions, serta penyesuaian lebar tabel ke kelas canonical `min-w-200`.
  - `components/marketing/sppa-form.tsx`: Pengalihan submit ke `createSppaAction` / `updateSppaAction` dengan status feedback Toast Sonner dan sinkronisasi store lokal.
- **Kompatibilitas Downstream Placing Slip**:
  - `app/(app)/underwriting/new/page.tsx` & `components/underwriting/new-slip.tsx`: Server prefetch SPPA dan data klien saat URL mengandung parameter query `?sppa=<id>`, memastikan alur pembuatan placing slip tahan terhadap browser hard refresh.
- **Penyelarasan Audit Frontend & Normalisasi COB**:
  - `lib/format.ts`: Penambahan helper fungsi `normalizeCob` untuk konversi nama COB uppercase basis data (misal `PROPERTY`) ke canonical Title Case (`Property`).
  - `components/underwriting/slip-model.ts`: Dukungan normalisasi COB case-insensitive pada `switchCob` dan `slipFromSppa`, memastikan perhitungan nilai pertanggungan tepat sasaran.
  - `components/marketing/sppa-form.tsx`: Penambahan placeholder pemandu pada field `NumberField` (Nilai Pertanggungan) dan dropdown seleksi.
  - `components/marketing/sppa-table.tsx`: Pencegahan double-submit aksi tabel (`disabled: isPending`) dan optimasi hidrasi store lokal.
  - `scripts/test-sppa-e2e.ts`: Pengujian integrasi otomatis end-to-end menyeluruh (8/8 pengujian lolos).

## File utama

- `lib/server/sppa.ts`: Server data layer untuk operasi basis data relasional SPPA.
- `app/(app)/marketing/actions.ts`: Server Actions untuk mutasi SPPA dengan validasi Zod dan proteksi otentikasi.
- `prisma/seed.ts`: Script pembenihan data awal 3 SPPA mock LCH ke PostgreSQL.
- `lib/format.ts`: Helper normalisasi nama COB relasional ke canonical Title Case.
- `components/marketing/sppa-table.tsx`: Komponen tabel SPPA terhubung ke Server Actions dengan proteksi double-submit.
- `components/marketing/sppa-form.tsx`: Komponen form SPPA terhubung ke Server Actions dengan placeholder lengkap.
- `components/underwriting/slip-model.ts`: Derivasi penomoran dan kalkulasi placing slip dari SPPA dengan normalisasi COB.
- `app/(app)/marketing/page.tsx`: Server component pemuat data awal klien dan SPPA secara paralel.
- `components/marketing/marketing-tabs.tsx`: Komponen tab marketing yang mengalirkan data awal ke tabel SPPA.
- `app/(app)/underwriting/new/page.tsx`: Server component pembuat placing slip dengan prefetch data SPPA.
- `components/underwriting/new-slip.tsx`: Komponen slip baru dengan dukungan hidrasi awal data SPPA.
- `scripts/test-sppa-e2e.ts`: Script pengujian integrasi E2E modul SPPA.

## Dampak

- **Database:** Tidak ada perubahan struktur skema (model `sppa` sudah ada di `prisma/schema.prisma`). Data SPPA kini terisi di tabel `sppa` PostgreSQL.
- **Env:** Tidak ada variabel lingkungan baru.
- **Deploy:** Jalankan `npm run db:seed -- sppa` di lingkungan produksi jika ingin membenihkan 3 SPPA contoh awal LCH.

## Verifikasi

- `npm run db:seed -- sppa`: Berhasil membenihkan 3 SPPA mock awal (`sppa 3 (3 baru, 0 diperbarui)` dan idempotent pada eksekusi ulang).
- `npx tsx scripts/test-sppa-e2e.ts`: 8/8 pengujian integrasi lolos (list, getById, Zod schema date/sumInsured, create, update, status toggle, placing slip derivation, referential deletion guard).
- `npx tsc --noEmit`: 0 kesalahan TypeScript.
- `npm run build`: Berhasil kompilasi Next.js 16 (Turbopack) dengan 69/69 halaman statis/dinamis tergenerasi tanpa error.

## Catatan untuk yang melanjutkan

- SPPA yang dibuat melalui form sekarang otomatis tersimpan di PostgreSQL dan mendapatkan UUID baru. Store sesi lokal tetap disinkronkan secara otomatis agar modul Underwriting yang membaca data dari store tetap berfungsi transparan tanpa breaking change.
- Guard proteksi hapus SPPA mengecek relasi ke tabel `placing_slips`. Jika suatu saat modul Placing Slip dimigrasikan ke PostgreSQL, relasi ini sudah siap pakai secara penuh.
