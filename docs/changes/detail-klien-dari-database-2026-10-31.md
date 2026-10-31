# Detail klien dari database

- **Tanggal:** 2026-10-31
- **Branch:** `fix/detail-klien-dari-database`
- **PR:** [#57](https://github.com/agussusanto17/lch-ins/pull/57)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

SIT Minggu 2 pada 30 Oktober 2026 (sheet "Test Case SIT Sistem Back Office
LCH") mencatat SIT-024 gagal: di halaman detail klien, bagian Placing Slip,
Polis, dan Klaim membaca store sesi berisi data contoh, bukan database. Slip
draft yang dibuat dari SPPA PT SIT Korporasi Uji tidak muncul di halaman
kliennya. SIT-027 lulus, tetapi kolom Slip di daftar SPPA tetap "Belum ada"
setelah slip dari SPPA itu disimpan.

Penyebabnya tiga:

- Halaman mencari klien di store memakai id dari URL. Tautan lama seperti
  `/marketing/clients/c-005` cocok dengan klien contoh (Mr. Harry Mulyono),
  sehingga yang tampil adalah slip, polis, dan klaim contohnya.
- Tabel SPPA menyaring per id klien dari URL, jadi lewat id lama SPPA dari
  database tidak ikut tampil.
- Kolom Slip di tabel SPPA hanya mencari slip di store sesi, padahal slip dari
  database tidak pernah dimuat ke store di halaman ini.

## Yang berubah

- Halaman detail klien mengambil klien, SPPA, placing slip, polis, dan klaim
  dari database di server, disaring per UUID klien. Isinya tidak lagi
  bergantung pada halaman mana yang sudah dibuka di sesi itu.
- Tautan dengan id data contoh (misalnya `c-001`, `c-005`) diarahkan ke URL
  UUID klien bernama sama di database. Pencocokan nama itu sudah ada di
  `getClientById`, halaman ini hanya menambah redirect.
- `listPolicies` dan `listClaims` menerima `clientId` opsional. Klaim disaring
  lewat polisnya.
- Kolom Slip di tabel SPPA memakai slip tertaut dari database. Store sesi
  tinggal cadangan untuk slip yang baru dibuat dan belum dimuat ulang.
- Setelah Edit KYC disimpan, detail klien langsung menampilkan hasil simpanan
  tanpa muat ulang. Klien tetap disalin ke store karena form slip di sesi yang
  sama masih membacanya.

## File utama

- `app/(app)/marketing/clients/[id]/page.tsx`: redirect id lama, ambil data
  per klien.
- `components/marketing/client-detail.tsx`: slip, polis, dan klaim dari props;
  state klien lokal yang diperbarui setelah Edit KYC.
- `components/marketing/sppa-table.tsx`: kolom Slip dan jumlah slip dari
  database.
- `lib/server/policies.ts`, `lib/server/claims.ts`: filter `clientId`.

## Dampak

- **Database:** tidak ada migrasi.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`: lolos.
- `npm run build`: lolos.
- `npx eslint` pada file yang diubah: lolos.
- Uji manual di localhost dengan akun admin uji:
  - `/marketing/clients/c-005` diarahkan ke UUID kliennya. SPPA (Draft, 03 Sep
    2026), slip 001/LCH-PLCMT/PS/VIII/2026, polis MV/2026/JKT/0451, dan
    Klaim (0) tampil sesuai database.
  - PT SIT Korporasi Uji: kolom Slip di tabel SPPA bertaut ke slip draft yang
    dibuat dari SPPA itu, dan tab Placing Slip berisi (1).
  - PT Graha Sentosa Properti (`c-001` diarahkan ke UUID): Placing Slip (2),
    Polis (2), Klaim (1) CLM/2026/08/0031.
  - Edit KYC: catatan klien diubah lalu disimpan, muncul toast "Data klien
    diperbarui", dan catatan baru langsung tampil tanpa muat ulang.

## Catatan untuk yang melanjutkan

- Tabel lain yang masih memakai store sesi (daftar klien, slip, polis, klaim)
  bisa menampilkan data contoh sekejap sebelum data database termuat, karena
  snapshot server store adalah data contoh. Belum disentuh di sini.
- Picker tertanggung di form slip masih membaca store sesi, sudah dicatat di
  [dropdown-dari-master-data-2026-10-30.md](dropdown-dari-master-data-2026-10-30.md).
- Klaim tanpa polis tidak muncul di halaman klien mana pun, sama seperti
  sebelumnya.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
