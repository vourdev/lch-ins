# Migrasi Modul Data Klien ke PostgreSQL & Prisma

- **Tanggal:** 2026-10-20
- **Branch:** `feat/client-management-postgres`
- **PR:** belum dibuka
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Sebelumnya, modul data klien dan KYC pada menu Marketing (`/marketing`) masih berjalan di atas penyimpanan mock in-memory (`lib/store.ts` dan `lib/data/clients.ts`). Data klien yang diinput atau diubah akan hilang ketika sesi browser di-refresh atau server di-restart. Untuk memenuhi kebutuhan operasional dan integrasi sistem LCH Insurance Brokers, modul data klien dimigrasikan ke PostgreSQL secara penuh menggunakan tabel relasional Prisma 7 yang sudah disiapkan pada skema database.

## Yang berubah

- **Server Data Layer (`lib/server/clients.ts`)**:
  - Menyediakan fungsi query dan mutasi database: `listClients`, `getClientById`, `createClient`, `updateClient`, `toggleClientStatus`, `deleteClient`, dan `seedInitialClientsIfEmpty`.
  - Memetakan label UI secara cerdas (case-insensitive) ke entitas `lookup_values` (`client_type`, `client_status`, `id_type`, `income_source`, `insurance_purpose`, `address_type`, `client_document_type`) dan `classes_of_business`.
  - Eksekusi transaksi atomik (`prisma.$transaction`) untuk sinkronisasi relasi multi-tabel (`clients`, `client_addresses`, `client_documents`).
  - Penegakan integritas referensial: klien yang sudah terkait dokumen aktif (`sppa`, `placingSlips`, `policies`) ditolak untuk penghapusan fisik permanen dan diarahkan untuk dinonaktifkan (`Inactive`).
  - Mekanisme auto-seed otomatis jika tabel `clients` masih kosong, memigrasikan 12 klien default dari dataset LCH.

- **Server Actions Next.js (`app/(app)/marketing/actions.ts`)**:
  - Mengimplementasikan `createClientAction`, `updateClientAction`, `toggleClientStatusAction`, dan `deleteClientAction`.
  - Melindungi seluruh mutasi dengan pemeriksaan peran otorisasi (`requireAccess("/marketing")`) dan validasi skema server menggunakan Zod.
  - Memperbarui cache Next.js App Router secara instan via `revalidatePath("/marketing")` dan `revalidatePath("/marketing/clients/[id]")`.

- **Integrasi Server Components & Client Views**:
  - `app/(app)/marketing/page.tsx`: mengambil data klien langsung di server (`listClients()`) dan meneruskan `initialClients` ke antarmuka tab marketing.
  - `app/(app)/marketing/clients/[id]/page.tsx`: memuat data klien langsung dari PostgreSQL via `getClientById(id)` di sisi server lengkap dengan metadata dinamis.
  - `components/marketing/client-table.tsx`: mengeksekusi Server Actions untuk hapus dan nonaktifkan klien dengan notifikasi Toast Sonner, sembari tetap menjaga kemampuan filter, pencarian, dan paginasi.
  - `components/marketing/client-form.tsx`: memproses pembuatan dan pembaruan klien langsung melalui Server Actions dengan status loading interaktif dan validasi duplikasi nama.
  - `components/marketing/client-detail.tsx`: menampilkan data detail profil, alamat, dan dokumen KYC langsung dari PostgreSQL dengan penanganan fallback yang aman.
  - Sinkronisasi state lokal in-memory dipertahankan saat mutasi agar modul downstream (SPPA, Placing Slip, Polis) tetap sinkron secara instan.

- **Integrasi Script Seed (`prisma/seed.ts`)**:
  - Menambahkan fungsi pembenihan `seedClients()` dan mendaftarkan opsi `"clients"` pada `SECTIONS` seed runner.

- **Penyelarasan Hasil Audit Frontend (`/frontend-code-review`)**:
  - Menerjemahkan seluruh komentar kode teknis ke bahasa Inggris sesuai konvensi project.
  - Menambahkan placeholder ramah konteks pada input catatan tujuan KYC ("Lain-lain").
  - Menyelaraskan kelas Tailwind tabel klien ke bentuk canonical `min-w-210`.
  - Menerapkan perlindungan PII dengan masking nomor telepon (`maskMiddle`) pada tampilan tabel, dengan nomor lengkap tetap dapat diakses pada halaman detail klien.
  - Menambahkan in-memory guard flag `hasCheckedSeed` di layer server agar query pengecekan count database tidak dieksekusi berulang kali pada setiap render.

## File utama

- `lib/server/clients.ts`: data access layer Prisma untuk klien, alamat, berkas KYC, dan lookup resolver.
- `app/(app)/marketing/actions.ts`: Server Actions Next.js dengan validasi otorisasi dan Zod.
- `app/(app)/marketing/page.tsx`: Server Component halaman utama Marketing dengan initial data fetching.
- `app/(app)/marketing/clients/[id]/page.tsx`: Server Component halaman detail klien berdasar ID database.
- `components/marketing/marketing-tabs.tsx`: komponen tab marketing yang mengalirkan data klien awal ke tabel.
- `components/marketing/client-table.tsx`: tabel klien dengan aksi mutasi status dan hapus berbasis Server Actions.
- `components/marketing/client-form.tsx`: drawer form KYC klien terhubung ke Server Actions simpan & perbarui.
- `components/marketing/client-detail.tsx`: tampilan detail profil klien dengan sinkronisasi store.
- `prisma/seed.ts`: script pembenihan data awal 12 klien mock ke database PostgreSQL.

## Dampak

- **Database:** tabel `clients`, `client_addresses`, dan `client_documents` kini terisi data klien aktif dan terkelola secara relasional.
- **Env:** tidak ada variabel lingkungan baru.
- **Deploy:** menjalankan `npm run db:seed -- clients` jika diperlukan untuk membenihkan data awal pada instance baru, atau mengandalkan auto-seed otomatis pada query pertama.

## Verifikasi

- `npx tsc --noEmit` — lolos tanpa kesalahan tipe.
- `npm run build` — lolos; seluruh rute Next.js berhasil dikompilasi.
- Database query & mutasi: diuji dan diverifikasi bekerja normal dengan transaksi Prisma.

## Catatan untuk yang melanjutkan

- Modul SPPA (`sppa`) dan Underwriting Placing Slip saat ini masih menggunakan mock store in-memory untuk entitas slip/sppa-nya sendiri. Ketika modul SPPA dimigrasikan ke PostgreSQL pada tahap berikutnya, relasi `clientId` dapat langsung menggunakan UUID dari tabel `clients`.
