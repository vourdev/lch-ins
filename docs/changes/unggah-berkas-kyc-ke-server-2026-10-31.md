# Unggah berkas KYC ke server

- **Tanggal:** 2026-10-31
- **Branch:** `fix/unggah-berkas-kyc`
- **PR:** [#58](https://github.com/agussusanto17/lch-ins/pull/58)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

SIT Minggu 2 pada 30 Oktober 2026 mencatat SIT-023 gagal: nama berkas KYC
tersimpan, tetapi isinya tidak pernah sampai ke server.
`client_documents.file_path` berisi blob URL dari browser pengunggah, jadi
setelah halaman dimuat ulang tombol Buka tidak membuka apa-apa.

Saat ditelusuri, ada tiga masalah lain di jalur yang sama:

- Menambah berkas lewat Edit KYC pada klien yang sudah ada selalu gagal. Baris
  baru dari form memakai id sementara (`d-...`), lalu `updateClient` mencarinya
  dengan query per id ke kolom UUID, dan Postgres menolak dengan "invalid input
  syntax for type uuid".
- `updateClient` hanya menambah baris. Berkas yang dihapus di form muncul lagi,
  dan file pengganti di baris lama diabaikan.
- Berkas data contoh menunjuk ke `/mock/docs/...` yang tidak ada, jadi tombol
  Buka-nya mengarah ke 404.

## Yang berubah

- Isi file dikirim saat Simpan di form klien lewat Server Action
  `uploadClientDocumentAction`, disimpan di tabel baru `stored_files`, lalu
  `client_documents.file_path` diisi `stored_files/<id>`.
- Berkas dibuka lewat `/api/files/<id>`. Rute ini memeriksa login, status wajib
  ganti kata sandi, dan hak akses menu Marketing (minimal Lihat). Respons
  memakai `Cache-Control: private, no-store` dan `X-Content-Type-Options:
  nosniff`.
- Hanya PDF, JPG, PNG, dan WebP, maksimal 4 MB. Jenis dicek di browser supaya
  pengguna langsung tahu, lalu dicek ulang di server dari byte awal file. SVG
  ditolak karena bisa berisi skrip yang ikut jalan saat dibuka dari domain
  aplikasi.
- Batas body Server Action dinaikkan dari 1 MB ke 5 MB di `next.config.ts`.
- Edit KYC menyamakan berkas dengan isi form: baris yang dihapus ikut dihapus
  beserta isinya, file pengganti menggantikan isi lama, dan perubahan jenis
  berkas tersimpan.
- Menghapus klien ikut menghapus isi berkasnya.
- Berkas tanpa isi di server (data contoh dan unggahan masa prototipe) tidak
  lagi punya tombol Buka. Gantinya keterangan "Belum diunggah" dengan petunjuk
  unggah ulang lewat Edit KYC.

### Kenapa disimpan di database

PRD bagian 9 mengusulkan disk server yang ikut di-backup, dengan asumsi deploy
di VPS. Demo sekarang berjalan di Vercel yang disknya tidak permanen, jadi file
di disk akan hilang. Di database, file ikut backup harian yang sudah diwajibkan
PRD bagian 8, dan tidak perlu env atau layanan baru. Semua akses lewat
`lib/server/stored-files.ts`. Kalau nanti pindah ke disk VPS, yang diubah cukup
modul itu dan rute `/api/files`, ditambah skrip untuk memindahkan isi yang
sudah ada.

## File utama

- `prisma/schema.prisma`, `prisma/migrations/20261031180000_stored_files/`:
  tabel `stored_files`.
- `lib/server/stored-files.ts`: simpan, baca, validasi jenis file, tautkan, dan
  hapus isi berkas.
- `lib/uploads.ts`: batas ukuran dan jenis file, dipakai browser dan server.
- `app/api/files/[id]/route.ts`: membuka isi berkas dengan pemeriksaan akses.
- `app/(app)/marketing/actions.ts`: `uploadClientDocumentAction` dan `fileId`
  di skema input klien.
- `lib/server/clients.ts`: berkas saat klien dibuat, disinkronkan saat diedit,
  dan dihapus bersama klien.
- `components/marketing/client-form.tsx`: kirim file saat Simpan.
- `components/marketing/client-detail.tsx`: keterangan "Belum diunggah".
- `next.config.ts`: batas body Server Action.

## Dampak

- **Database:** migrasi baru `20261031180000_stored_files` (tabel
  `stored_files`), jalan otomatis lewat `prisma migrate deploy` saat build.
  Baris `client_documents` yang lama tidak diubah. Ukuran database bertambah
  sebesar file yang diunggah.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan. Batas 4 MB per file berada di bawah
  batas body request Vercel 4,5 MB.

## Verifikasi

- `npx tsc --noEmit`: lolos.
- `npm run build`: lolos.
- `npx eslint` pada file yang diubah: lolos.
- Uji manual di localhost dengan akun admin uji:
  - Edit KYC PT Graha Sentosa Properti: file NPWP data contoh diganti PDF baru
    dan berkas KTP (PNG) ditambah. Keduanya tampil dengan tombol Buka, terbuka
    dengan Content-Type yang benar dan ukuran yang sama dengan file asal, dan
    tetap ada setelah halaman dimuat ulang.
  - Klien baru PT SIT Upload Uji dengan berkas NPWP tersimpan, dan berkasnya
    bisa dibuka dari detail klien (langkah SIT-023). Setelah klien uji itu
    dihapus, isi berkasnya ikut hilang dari `stored_files`.
  - Baris KTP dihapus di Edit KYC: baris dan isi berkasnya terhapus.
  - File 5 MB dan file SVG ditolak di browser. File SVG yang diberi nama
    `.png` dengan type `image/png` lolos dari browser, lalu ditolak server, dan
    tidak ada baris yang tersimpan.
  - `/api/files/<id>`: tanpa login 401, id tidak dikenal 404, role Marketing
    (Kelola) dan Klaim (Lihat) 200, Finance (Tidak) 403.

## Catatan untuk yang melanjutkan

- Softcopy polis (`policy-form.tsx`, `policy-files-sheet.tsx`) masih menyimpan
  file sebagai blob URL di store sesi dan belum menulis ke database. Jadwalnya
  Minggu 4 (upload polis). Pakai `saveUploadedFile` dengan pemakaian baru,
  misalnya `policy_file` yang dipetakan ke menu `/policies` di `PURPOSE_MENU`.
- Unggahan yang tidak jadi tertaut (file sudah terkirim, simpan gagal, lalu
  form ditutup) tetap tersisa di `stored_files`. Jumlahnya kecil dan belum ada
  pembersihan otomatis.
- Berkas KYC dari masa prototipe dan data contoh perlu diunggah ulang lewat
  Edit KYC.
- Edit KYC untuk klien yang belum punya No. KTP PIC tertahan validasi form
  ("Invalid input: expected string, received undefined"). Ini masalah terpisah
  (SIT-012) yang belum disentuh di sini. Sampai diperbaiki, uji unggah di klien
  yang KTP PIC-nya terisi.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
