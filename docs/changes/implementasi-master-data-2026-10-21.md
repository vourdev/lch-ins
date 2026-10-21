# Implementasi Modul Master Data Management

- **Tanggal:** 2026-10-21
- **Branch:** `feat/master-data-management`
- **PR:** #12
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Modul Master Data adalah sumber tunggal kebenaran (single source of truth) untuk seluruh pilihan dropdown dan konfigurasi sistem LCH Insurance Brokers. Sebelumnya halaman `/master-data` berstatus placeholder (`soon: true`). Modul ini dibutuhkan agar tim operasional dan teknik LCH dapat mengelola Class of Business (COB), Type of Cover, Tarif Baku OJK (Okupasi, Gempa Bumi, Banjir, Skala BI), Asuransi Rekanan & Loss Adjuster, Rekening Bank operasional & Rekening Titipan Premi, Wording Form Polis Baku, Mata Uang, serta Nilai Pilihan Pendek sistem tanpa bergantung pada perubahan kode oleh developer.

## Yang berubah

- **Server Data Layer Master Data (`lib/server/master-data.ts`)**:
  - Menyediakan fungsi query dan mutasi transaksi database Prisma dengan audit trail otomatis (`recordAudit`) untuk seluruh entitas master data.
  - Menerapkan **Relational Reference Guard**: Melarang penghapusan entitas master data (COB, Cover Type, Rekening Bank, Rekanan, Lookup) jika sudah pernah digunakan atau direferensikan dalam transaksi operasional (SPPA, Placing Slip, Polis, Dokumen Klien, Rekening, dll). Menampilkan pesan informatif agar pengguna menonaktifkan (`isActive: false`) alih-alih menghapus fisik.
  - Menerapkan **System Lookup Protection**: Entitas sistem (`is_system = true`) dilindungi dari penghapusan fisik dan perubahan kode mesin; hanya label tampilan dan urutan yang dapat dimodifikasi.
  - Memisahkan rekening operasional perusahaan dengan **Rekening Titipan Premi (`is_premium_trust = true`)** sesuai regulasi perantara asuransi.

- **Next.js Server Actions (`app/(app)/master-data/actions.ts`)**:
  - Memproteksi mutasi dengan otorisasi `requireAccess("/master-data")` (role Admin dan Teknik / placement).
  - Validasi schema Zod untuk setiap entitas input.
  - Revalidasi cache App Router otomatis melalui `revalidatePath("/master-data")`.

- **Antarmuka Tab Master Data Lengkap (`components/master-data/`)**:
  - `master-data-tabs.tsx`: Container 5 tab utama (COB & Cover Type, Tarif Baku OJK, Asuransi Rekanan & Adjuster, Keuangan & Wording Form, Nilai Pilihan Dropdown).
  - `cob-cover-tab.tsx`: Manajemen hierarkis COB dan sub-Cover Type, dilengkapi badge count penggunaan transaksi, inline expansion baris, dialog tambah/edit, dan status toggle.
  - `tariff-ojk-tab.tsx`: Tampilan referensi tarif OJK Surat Edaran: Okupasi (K1, K2, K3), Gempa Bumi zona 1-5, Banjir zona 1-4, dan tabel skala BI (Business Interruption).
  - `insurers-adjusters-tab.tsx`: Manajemen direktori perusahaan asuransi rekanan dan loss adjuster disertai banner informasi mengenai penyelarasan daftar resmi final dari LCH.
  - `finance-docs-tab.tsx`: Pengelolaan rekening bank operasional LCH, status rekening titipan premi, daftar valuta ISO, dan template wording form polis baku.
  - `lookup-values-tab.tsx`: Pengelolaan terpusat nilai pilihan pendek sistem (client_status, policy_type, claim_status, bank, dll) dengan filter per kategori dan proteksi visual entitas sistem.
  - Seluruh tabel menerapkan standar responsiveness audit frontend: `min-w-200`, container `overflow-x-auto`, dan empty states.

- **Integrasi Server Page & Navigasi**:
  - Mengaktifkan rute penuh di `app/(app)/master-data/page.tsx` dengan prefetch data paralel pada Server Component.
  - Menghapus penanda `soon: true` pada menu Master Data di `components/layout/nav-items.ts`.

- **Audit & Pengetatan Validasi Input Angka / Numerik (Frontend Code Review)**:
  - Memperbarui komponen dasar `TextField` (`components/shared/form-fields.tsx`) dengan prop `digitsOnly`, `numericOnly`, dan `maxLength` agar karakter non-angka disanitasi secara seketika pada event `onChange`.
  - Menerapkan sanitasi input angka pada `client-form.tsx` (KTP 16 digit angka, NPWP korporasi/perorangan disaring angka dan titik-strip, telepon `type="tel"`).
  - Menerapkan sanitasi input angka pada form SPPA (`sppa-form.tsx` dan `lib/data/sppa.ts` untuk pertanyaan bertipe angka seperti jumlah lantai dan jumlah tertanggung).
  - Menerapkan sanitasi pada form Master Data: nomor rekening bank (`finance-docs-tab.tsx`), urutan tampil non-negatif integer (`lookup-values-tab.tsx`), nomor telepon rekanan (`insurers-adjusters-tab.tsx`), dan kode COB 2 digit (`cob-cover-tab.tsx`).

## File utama

- `lib/server/master-data.ts`: Server data layer untuk operasi CRUD master data, relational reference checking, dan audit trail.
- `app/(app)/master-data/actions.ts`: Server Actions untuk validasi Zod dan otorisasi mutasi master data.
- `app/(app)/master-data/page.tsx`: Server Component halaman Master Data.
- `components/master-data/master-data-tabs.tsx`: Komponen root tab master data.
- `components/master-data/cob-cover-tab.tsx`: Tab COB & Type of Cover.
- `components/master-data/tariff-ojk-tab.tsx`: Tab Tarif Baku OJK (Okupasi, Gempa, Banjir, BI).
- `components/master-data/insurers-adjusters-tab.tsx`: Tab Asuransi Rekanan & Adjuster.
- `components/master-data/finance-docs-tab.tsx`: Tab Rekening Bank LCH, Mata Uang, dan Wording Form.
- `components/master-data/lookup-values-tab.tsx`: Tab Nilai Pilihan Dropdown (Lookup Values).
- `components/layout/nav-items.ts`: Pengaktifan menu Master Data pada navigasi sidebar.
- `scripts/test-master-data-e2e.ts`: Skrip pengujian integrasi end-to-end master data.

## Dampak

- **Database:** Tidak ada migrasi skema baru (memanfaatkan tabel yang sudah ada di Prisma: `classes_of_business`, `cover_types`, `occupations`, `tariff_occupations`, `tariff_eq_properties`, `tariff_floods`, `bi_scales`, `insurers`, `adjusters`, `bank_accounts`, `currencies`, `wording_forms`, `lookup_values`).
- **Env:** Tidak ada variabel env baru.
- **Deploy:** Standar deployment Vercel melalui sinkronisasi branch `main`.

## Verifikasi

- `node -r ./scripts/mock-server-only.cjs --import tsx --env-file=.env scripts/test-master-data-e2e.ts`: 31 tests lolos (100% PASS, 0 FAILED) mencakup CRUD, relasi proteksi hapus, proteksi sistem entitas, dan listing queries.
- `npx tsc --noEmit`: 0 error TypeScript.
- `npm run build`: Kompilasi Turbopack Next.js 16.2.6 sukses menghasilkan build produksi untuk semua rute termasuk `ƒ /master-data`.

## Catatan untuk yang melanjutkan

- Menghapus COB atau Type of Cover yang sudah memiliki relasi data (misalnya SPPA, placing slip, atau polis) akan ditolak oleh guard dengan error deskriptif. Arahkan pengguna untuk mematikan switch status aktif (`isActive: false`).
- Rekening bank bertipe titipan premi (`is_premium_trust = true`) harus dipelihara pemisahannya dengan rekening operasional untuk pelaporan keuangan dan kepatuhan audit regulasi pialang asuransi.
- Daftar resmi rekanan asuransi, loss adjuster, dan klausul wording final dari LCH dapat diimpor atau ditambahkan langsung melalui antarmuka Master Data begitu dokumen resmi diterima.
