# Tombol setinggi input, tabel Master Data dan Master Clauses bergaya Manajemen Pengguna

- **Tanggal:** 2026-10-31
- **Branch:** `fix/tombol-dan-tabel-seragam` (ditumpuk di atas `fix/pisah-menu-wording`)
- **PR:** [#66](https://github.com/agussusanto17/lch-ins/pull/66)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Agus meninjau Master Data pada 31 Oktober 2026:

- Teks tombol terlalu kecil. Tombol di Master Data memakai `text-xs` (12px).
- Tombol Batal dan Simpan di dialog Klasifikasi OJK menempel. Footer dialognya
  memakai `sm:gap-0`.
- Aturan dari Agus: tinggi dan ukuran huruf tombol sama dengan input teks di
  form, yaitu 36px dan 14px. Tombol ukuran `sm` hanya 32px.
- Bagian atas tabel Master Data tidak seragam: ada toolbar di dalam card, ada
  yang tanpa card, dan ada card tabel dengan ruang kosong di atas judul kolom.
  Agus memilih gaya halaman Manajemen Pengguna.

Gaya itu dicoba dulu di Klasifikasi OJK dan Wording Form. Setelah Agus
menyetujui, gaya yang sama diterapkan ke enam halaman Master Data lain dan ke
Master Clauses.

## Yang berubah

### Tombol dan kontrol form

- **Tombol `sm` setinggi input (36px).** Perubahan di `Button` sehingga semua
  tombol ukuran `sm` ikut, termasuk yang dibuat nanti. Ukuran huruf tetap 14px.
- **Select `sm` setinggi input (36px),** jadi filter di toolbar sejajar dengan
  kolom pencarian dan tombol, misalnya di Manajemen Pengguna, Database Klien,
  Audit Trail, dan Master Clauses. Select ukuran halaman di pagination tetap
  32px supaya sama dengan tombol navigasinya.
- **Penimpa ukuran dibuang** dari tombol di Master Data, Audit Trail, dan popover
  notifikasi (`text-xs`, `h-8.5`, `h-9`). Tombol ringkas di dalam baris tabel
  tetap 28px, tapi hurufnya 14px.
- **Dialog Master Data seukuran form standar:**
  - input, select, label, dan deskripsi dialog 14px;
  - input dan select 36px, select dialog selebar kolom;
  - judul baris switch 14px.
- **Jarak tombol di footer dialog Klasifikasi OJK** kembali 8px seperti dialog
  lain.

### Tabel bergaya Manajemen Pengguna

Berlaku di delapan halaman Master Data dan Master Clauses:

- Toolbar tanpa card: pencarian dan filter di kiri, tombol tambah di kanan.
- Kolom Aksi (menu titik tiga) di kolom pertama. Edit, aktif/nonaktif, dan
  hapus pindah ke menu ini dari ikon pensil, switch, dan ikon sampah di ujung
  kanan.
- Pagination di bawah tabel, dan deskripsi singkat di bawah judul halaman.

Penyesuaian per halaman:

- **Halaman bertab** (Tarif Baku OJK, Asuransi & Adjuster, Rekening & Mata
  Uang): tab di baris sendiri di atas toolbar, sama seperti halaman Marketing.
  Ikon dan `text-xs` di tab dibuang.
- **Halaman bertingkat** (COB & Cover Type, Kendaraan): menu Aksi ada di baris
  induk dan di setiap baris anak. "Tambah sub-cover" dan "Tambah tipe" juga ada
  di menu baris induk dan langsung membuka barisnya.
- **Konfirmasi hapus** memakai dialog dari menu Aksi, menggantikan `confirm()`
  bawaan browser (Nilai Pilihan Dropdown, sub-cover, merek, dan tipe
  kendaraan).
- **Rekening bank** punya aksi "Edit rekening". Dialog mode edit sudah ada,
  tapi dulu tidak ada tombol yang membukanya.
- **Pencarian baru** di Wording Form dan Rekening & Mata Uang.
- **Tarif Baku OJK** tidak punya kolom Aksi karena tabelnya hanya acuan.
- **Master Clauses:**
  - daftar kartu menjadi tabel: judul dengan cuplikan wording, kelompok, class
    of business, dan type of cover;
  - tombol Tambah Clause pindah dari header halaman ke toolbar;
  - jumlah clause pindah ke pagination.

  Paginasi tetap di server, 20 per halaman, jadi pilihan ukuran halaman tidak
  ditampilkan. `listClauses` sekarang ikut mengembalikan `pageSize`.

Asumsi:
- Tombol di dalam baris tabel tetap ringkas supaya baris tidak membengkak.
- Tombol ikon tidak diubah.
- Banner "Menunggu Daftar Rekanan Final LCH" di Asuransi & Adjuster
  dipertahankan karena itu isi, bukan gaya.

## File utama

- `components/ui/button.tsx`, `components/ui/select.tsx`: tinggi ukuran `sm`.
- `components/shared/table-pagination.tsx`: select ukuran halaman tetap 32px.
- `components/master-data/*.tsx`: toolbar, kolom Aksi, pagination, dan ukuran
  kontrol dialog.
- `components/underwriting/master-clauses.tsx`, `lib/server/clauses.ts`: tabel
  Master Clauses dan `pageSize`.
- `app/(app)/master-data/*/page.tsx`: deskripsi halaman.
- `components/audit/audit-table.tsx`,
  `components/layout/notification-popover.tsx`: ukuran huruf tombol.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit` dan `npm run build`: lolos.
- `npx eslint` pada file yang diubah lolos, kecuali error lama
  `react-hooks/set-state-in-effect` di `notification-popover.tsx` baris 50.
  Error itu sudah ada di `main` dan tidak disentuh di sini.
- Ukuran terukur di localhost:
  - Dialog Tambah Klasifikasi OJK: input dan dua tombol 36px, huruf 14px,
    jarak antar tombol 8px.
  - Toolbar Wording Form, Manajemen Pengguna, dan Master Clauses: pencarian,
    filter, dan tombol tambah 36px.
  - Pagination: select ukuran halaman dan tombol navigasi 32px.
- Cek tampilan di localhost pada kesembilan halaman:
  - COB & Cover Type: baris Marine Cargo dibuka; tiap sub-cover punya menu
    Edit sub-cover, Nonaktifkan, dan Hapus.
  - Rekening & Mata Uang: "Edit rekening" membuka dialog berisi data rekening
    BCA. Dialog ditutup dengan Batal, tidak disimpan.
  - Master Clauses: 20 baris dengan pagination "Menampilkan 1–20 dari 595
    clause".
  - Asuransi & Adjuster, Kendaraan, Nilai Pilihan Dropdown, dan Tarif Baku OJK
    tampil dengan toolbar, kolom, dan pagination baru.

## Catatan untuk yang melanjutkan

- PR ini ditumpuk di atas #65, yang ditumpuk di atas #64. Merge berurutan
  #64, #65, lalu PR ini, dan pindahkan base ke `main` sebelum merge.
- Halaman tabel baru sebaiknya meniru `components/users/user-table.tsx`.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
