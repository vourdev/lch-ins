# Pisah menu Keuangan & Wording di Master Data

- **Tanggal:** 2026-10-31
- **Branch:** `fix/pisah-menu-wording` (ditumpuk di atas `fix/chip-tarif-ojk`)
- **PR:** [#65](https://github.com/agussusanto17/lch-ins/pull/65)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Agus menanyakan kenapa submenu Master Data "Keuangan & Wording" menggabungkan
dua hal yang tidak berhubungan. Gabungan ini sisa rencana awal Master Data
(21 Oktober 2026) yang membagi Master Data jadi lima tab dalam satu halaman.
Rekening bank, mata uang, dan wording form polis masuk satu tab "Keuangan &
Wording Form". Saat tab dipindah ke submenu sidebar (29 Oktober 2026),
gabungannya ikut terbawa.

Wording form polis baku (PSAKI, PSAKBI, dan sejenisnya) adalah acuan slip,
bukan data keuangan. Tidak ada alasan bisnis untuk menggabungkannya dengan
rekening bank dan mata uang.

## Yang berubah

- Wording Form punya submenu dan halaman sendiri di
  `/master-data/wording-forms`. Letaknya tepat di bawah COB & Cover Type
  karena sama-sama acuan slip. Isi halamannya sama dengan sub-tab lama: tabel
  wording form, switch aktif, dan dialog tambah.
- Submenu "Keuangan & Wording" diganti "Rekening & Mata Uang" dan hanya berisi
  sub-tab Rekening Bank LCH dan Mata Uang. Namanya menyebut isinya langsung
  supaya tidak tertukar dengan grup menu Finance dan Akuntansi. Alamatnya tetap
  `/master-data/finance-docs`, jadi tautan lama tidak putus.
- Remah roti dan judul tab browser ikut diperbarui.

Asumsi yang belum dikonfirmasi Agus: label "Rekening & Mata Uang" dan posisi
Wording Form di bawah COB. Bila ingin lain, cukup ubah `nav-items.ts`,
`app-topbar.tsx`, dan judul halamannya.

## File utama

- `components/master-data/wording-forms-tab.tsx` (baru): tabel dan dialog
  wording form, dipindah dari `finance-docs-tab.tsx`.
- `components/master-data/finance-docs-tab.tsx`: sub-tab wording dihapus.
- `app/(app)/master-data/wording-forms/page.tsx` (baru),
  `app/(app)/master-data/finance-docs/page.tsx`: halaman dan judul.
- `components/layout/nav-items.ts`, `components/layout/app-topbar.tsx`: submenu
  dan remah roti.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan. Hak akses tidak berubah karena
  `ACCESS_MATRIX` dicocokkan per awalan `/master-data`.

## Verifikasi

- `npx tsc --noEmit`, `npm run build`, dan `npx eslint` pada file yang diubah:
  lolos.
- Cek di localhost:
  - Submenu Master Data berurutan COB & Cover Type, Wording Form, Tarif Baku
    OJK, Klasifikasi OJK, Asuransi & Adjuster, Rekening & Mata Uang,
    Kendaraan, Nilai Pilihan Dropdown.
  - `/master-data/wording-forms`: judul Wording Form, remah roti
    `Dashboard / Master Data / Wording Form`, lima wording form tampil, tombol
    Tambah Wording Form di kanan atas.
  - `/master-data/finance-docs`: judul Rekening & Mata Uang, sub-tab Rekening
    Bank LCH (1) dan Mata Uang (5).
  - Konsol browser tanpa error.

## Catatan untuk yang melanjutkan

- PR ini ditumpuk di atas PR #64. Merge #64 dulu, lalu PR ini.
- Slug `finance-docs` sengaja dipertahankan walau isinya tidak lagi memuat
  wording. Bila nanti diganti, tambahkan redirect dari alamat lama.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
