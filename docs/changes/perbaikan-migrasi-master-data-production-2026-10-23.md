# Perbaikan Migrasi Master Data Production & Otomatisasi Deploy Prisma

- **Tanggal:** 2026-10-23
- **Branch:** `fix/production-master-data-migration`
- **PR:** #18
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Pengguna akun operasional klaim (`claim@lch.co.id`) melaporkan error server dengan digest Next.js `2670795739` saat mengakses menu Master Data (`/master-data`) di lingkungan production (Vercel).
Berdasarkan investigasi log serverless runtime Vercel dan basis data PostgreSQL production:
1. Peran `claim` memiliki hak akses lihat (`L`) pada `/master-data` sesuai matriks otorisasi `ACCESS_MATRIX`.
2. Komponen Server `app/(app)/master-data/page.tsx` memanggil `listCobOjkClasses()` yang melakukan query relasional `prisma.cobOjkClass.findMany()`.
3. Pada database production, migrasi skema `20261022160000_policy_erd_columns` hingga `20261022180000_erd_v1_5_relational_tables` belum diaplikasikan karena script `build` di `package.json` sebelumnya hanya menjalankan `next build` tanpa `prisma migrate deploy`. Hal ini memicu error Prisma `P2021` ("Table public.cob_ojk_classes does not exist in the current database").

## Yang berubah

- **Otomatisasi Migrasi Database pada Siklus Build (`package.json`):**
  - Mengubah script `build` menjadi `"prisma migrate deploy && next build"`. Setiap kali Vercel menjalankan proses build produksi, Prisma akan secara deterministik menerapkan seluruh migrasi pending ke basis data sebelum aset Next.js dikompilasi.
- **Resiliensi & Defense in Depth Layer Data Server (`lib/server/cob-ojk-classes.ts` & `lib/server/claims.ts`):**
  - Menambahkan penanganan fallback anggun untuk kode Prisma `P2021` (tabel belum ada) pada `listCobOjkClasses`, `listClaimDocuments`, dan `listClaimFollowups` agar mengembalikan array kosong `[]` alih-alih melempar unhandled 500 server crash ke boundary aplikasi.
- **Penerapan Migrasi & Seeding Awal pada Basis Data Produksi:**
  - Menjalankan `prisma migrate deploy` langsung ke basis data PostgreSQL production, menerapkan 6 migrasi tertunda:
    - `20261022120000_policy_client_optional`
    - `20261022140000_slip_type_of_cover`
    - `20261022150000_policy_type_of_cover`
    - `20261022160000_policy_erd_columns` (tabel `cob_ojk_classes`)
    - `20261022170000_claim_number_format`
    - `20261022180000_erd_v1_5_relational_tables` (tabel `sources`, `client_insurer_codes`, `insurer_claim_pics`, `claim_document_types`, `claim_documents`, `claim_followups`).
  - Menjalankan seed master data `claim_document_types` (18 item berkas klaim standar per COB) pada basis data production.

## File utama

- `package.json`: Memperbarui skrip `build` untuk menyertakan `prisma migrate deploy`.
- `lib/server/cob-ojk-classes.ts`: Menambahkan penanganan defensive fallback `P2021` pada `listCobOjkClasses`.
- `lib/server/claims.ts`: Menambahkan penanganan defensive fallback `P2021` pada `listClaimDocuments` dan `listClaimFollowups`.
- `docs/changes/perbaikan-migrasi-master-data-production-2026-10-23.md`: Catatan perubahan ini.

## Dampak

- **Database:** Tidak ada perubahan skema baru. Seluruh 13 migrasi kini berstatus diterapkan (`0 applied, 0 pending`) di basis data produksi.
- **Env:** Tidak ada variabel baru (`DATABASE_URL` yang sudah ada digunakan oleh Prisma saat deploy).
- **Deploy:** Vercel secara otomatis mengeksekusi `prisma migrate deploy` pada setiap build deployment berikutnya.

## Verifikasi

1. **Uji Langsung Query Master Data terhadap DB Production:**
   - Menjalankan ke-16 query `Promise.all` pada halaman `/master-data` langsung ke DB production (`listCobOjkClasses`, `listMasterCob`, `listOccupations`, `listTariffEqProperty`, dll.) dengan hasil `All 16 queries succeeded!` dan 0 error.
2. **Typecheck & Production Build:**
   - `npx tsc --noEmit`: 0 kesalahan tipe TypeScript.
   - `npm run build`: `prisma migrate deploy && next build` berjalan mulus dengan Turbopack (21/21 static pages generated).

## Catatan untuk yang melanjutkan

- Setiap penambahan file migrasi baru di masa mendatang akan otomatis diaplikasikan ke production saat Vercel melakukan build, sehingga insiden tabel hilang (kode `P2021`) tidak akan terulang kembali.
