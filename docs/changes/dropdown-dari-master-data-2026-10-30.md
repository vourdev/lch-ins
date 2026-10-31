# Dropdown form dari master data

- **Tanggal:** 2026-10-30
- **Branch:** `fix/dropdown-dari-master-data`
- **PR:** [#54](https://github.com/agussusanto17/lch-ins/pull/54)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

SIT Minggu 2 pada 30 Oktober 2026 (sheet "Test Case SIT Sistem Back Office
LCH") menemukan lima kasus gagal dengan penyebab yang sama: pilihan dropdown
masih daftar tetap di `lib/data/reference.ts`, bukan dari master data.

- SIT-015: COB dan type of cover baru di master tidak muncul di form slip.
- SIT-016: menonaktifkan COB tidak berpengaruh ke form.
- SIT-018: asuransi baru tidak muncul di security panel, sedangkan PT Asuransi
  Kredit Indonesia yang tidak ada di master justru muncul.
- SIT-019: mata uang tidak bisa ditambah, dan wording baru tidak muncul di slip.
- SIT-021: nilai lookup baru (contoh tujuan asuransi) tidak muncul di form klien.

Aturannya sudah ditetapkan Agus sejak 11 September 2026: semua DDL di form
diambil dari master data supaya LCH bisa mengubahnya tanpa developer.

Saat ditelusuri, ada tiga hal yang membuat dropdown dari master berbahaya kalau
tidak ikut diperbaiki:

- `normalizeCob` memetakan semua COB yang tidak dikenal ke "Property".
- `resolveCob` di slip dan SPPA jatuh ke COB pertama bila nama tidak cocok, dan
  resolver klien mencocokkan nama sebagian. COB baru bisa tersimpan sebagai
  PROPERTY tanpa ada yang sadar.
- Cache lookup di `lib/server/clients.ts`, `placing-slips.ts`, dan `sppa.ts`
  disimpan seumur proses server, jadi isian master yang baru ditambah tidak
  dikenali sampai server restart.

## Yang berubah

### Sumber pilihan

Pilihan form dimuat per halaman oleh `getFormOptions()` (dibungkus
`React.cache`, berlaku satu request) lalu dibagikan lewat
`FormOptionsBoundary` dan `FormOptionsProvider`. Komponen membacanya dengan
`useFormOptions()`. Provider dipasang per halaman, bukan di layout, karena
layout tidak dirender ulang saat pindah halaman: COB yang baru ditambah tidak
akan muncul sampai reload.

Yang sekarang dibaca dari master, hanya yang berstatus aktif:

- COB di form slip, SPPA, klien, dan polis, serta filter "Semua COB" di tabel
  klien, slip, polis, klaim, dan renewal.
- Type of cover di form slip, SPPA, dan polis, yaitu cover aktif milik COB yang
  dipilih.
- Asuransi di security panel Quotation Slip.
- Mata uang di form slip dan SPPA. Form polis sudah memakai master sebelumnya.
- Wording form di slip.
- Lookup form klien: jenis identitas, sumber penghasilan, tujuan asuransi, jenis
  alamat, dan jenis berkas.

Nilai yang tersimpan di data tetapi sudah tidak ada di master, karena
dinonaktifkan atau label lama seperti "PAR + EQVET", tetap tampil di urutan
teratas supaya tidak hilang saat datanya diedit.

Konstanta yang tidak terpakai lagi dihapus dari `reference.ts`. `TYPE_OF_COVER`
tetap ada, hanya sebagai cadangan kode nomor slip untuk label lama.

### Nama COB

Label tampilan adalah nama di master dengan huruf besar di awal kata: "MARINE
HULL" menjadi "Marine Hull". GENERAL ACCIDENT sekarang tampil "General
Accident", sebelumnya "Personal Accident". Label lama "Personal Accident" di
data contoh tetap dikenali sebagai General Accident. Dengan begitu filter clause
per COB ikut cocok untuk lini ini.

### Penyimpanan

- Slip dan SPPA dengan COB yang tidak ada di master ditolak dengan pesan
  jelas. COB klien yang tidak cocok dibiarkan kosong, karena kolomnya memang
  boleh kosong.
- Type of cover hanya dicocokkan dengan cover milik COB yang sama.
- Cache lookup server berlaku satu request.
- Action polis tidak lagi memvalidasi COB dengan enum tetap; server yang
  menolak COB di luar master.

### Nomor slip

Token `{COVER}` memakai singkatan cover dari master (`cover_types.abbreviation`).
Slip lama yang belum punya cover type memakai kode bawaan dari labelnya,
misalnya "PAR + EQVET" tetap PAREQ. Ini cara yang sama dengan nomor klaim.

### Master Data

- Sub-cover punya isian "Singkatan di Nomor Slip" (huruf dan angka, otomatis
  huruf besar) dan tampil sebagai `PS-XXX` di daftarnya. Petunjuk kode sub-cover
  diperjelas, karena field itu sudah terisi kode COB dan mudah terketik dua kali.
- Mata uang bisa ditambah (kode ISO 4217 tiga huruf) dan diaktifkan atau
  dinonaktifkan. `audit_logs.entity_id` bertipe UUID, jadi audit mata uang
  memakai UUID tetap yang diturunkan dari kodenya.
- Dropdown mata uang di form rekening bank hanya menampilkan yang aktif.

### Cetak KYC

Form KYC LCH hanya punya kotak tetap untuk tujuan asuransi dan sumber
penghasilan. Nilai baru dari master dicentang sebagai "Lain-lain" dengan namanya
sebagai keterangan.

## File utama

- `lib/form-options.ts`: tipe pilihan dan helper `withCurrent`, `coversFor`.
- `lib/server/form-options.ts`: `getFormOptions()`.
- `components/shared/form-options-provider.tsx`,
  `components/shared/form-options-boundary.tsx`: context dan pemasangannya.
- `lib/server/cob.ts`: kunci pencarian COB, termasuk label lama.
- `lib/format.ts`: `normalizeCob`.
- `lib/server/placing-slips.ts`, `sppa.ts`, `clients.ts`: cache per request,
  resolver COB tanpa fallback, singkatan cover di nomor slip.
- `lib/server/master-data.ts`, `app/(app)/master-data/actions.ts`,
  `components/master-data/cob-cover-tab.tsx`, `finance-docs-tab.tsx`: mata uang
  dan singkatan cover.

## Dampak

- **Database:** tidak ada migrasi. Kolom `cover_types.abbreviation` sudah ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan. Setelah deploy, pilihan type of cover
  mengikuti daftar COB/TOC LCH di master. Label lama seperti "Property All Risks
  (PAR)", "PAR + EQVET", dan "Fire (FLEXAS)" tidak muncul lagi untuk slip baru.
  Kalau kombinasi seperti PAR + EQVET masih dipakai, tambahkan sebagai sub-cover
  dengan singkatan PAREQ.

## Verifikasi

- `npx tsc --noEmit`: lolos.
- `npm run build`: lolos.
- `npx eslint` pada folder yang disentuh: satu error lama di
  `components/claims/claim-detail-sheet.tsx`, file yang tidak diubah di sini.
- Uji manual di localhost dengan akun admin uji:
  - SIT-015: COB 98 SIT UJI COB dan cover "SIT Cover Uji" muncul di form slip.
    Draft tersimpan dengan COB SIT UJI COB dan cover tertaut (dicek di database).
  - Singkatan "SIT" diisi di master, lalu release slip itu menghasilkan
    `002/LCH-PLCMT/PS-SIT/X/2026`.
  - SIT-016: GENERAL ACCIDENT dinonaktifkan, hilang dari dropdown slip, lalu
    diaktifkan lagi.
  - SIT-018: PT Asuransi SIT Uji muncul di security panel, PT Asuransi Kredit
    Indonesia tidak lagi muncul.
  - SIT-019: JPY ditambah di master dan muncul di Currency slip. SIT Wording Uji
    2026 muncul di Wording Form, PSAKI yang tidak ada di master tidak lagi
    muncul.
  - SIT-021: SIT Tujuan Uji muncul di form klien. Klien tersimpan dengan
    `insurance_purpose` sit_uji.
  - Regresi: slip lama "PAR + EQVET" tetap menampilkan cover-nya saat diedit,
    form SPPA dan polis memakai COB dan cover dari master, filter COB tabel polis
    berisi COB master.

## Catatan untuk yang melanjutkan

- Belum dari master: status klien, tipe klien, status dan tahapan klaim, tipe
  polis, dan kelas konstruksi. Logika aplikasi membandingkan labelnya, jadi
  perlu diubah dulu ke kode lookup. Kalau langsung dibuka ke master, mengganti
  label di master akan memutus logikanya.
- Varian form dan satuan rate di master COB belum dibaca form slip. COB baru
  memakai tampilan standar dan rate per mil; perilaku khusus Property dan Motor
  Vehicle masih berdasarkan nama.
- Picker klien di form slip masih membaca store sesi berisi data contoh, jadi
  klien yang baru dibuat belum bisa dipilih langsung dari form slip, kecuali
  lewat SPPA atau tombol buat slip dari halaman klien.
- Slip dengan lebih dari satu type of cover (urutan `priority` A, B di
  `cover_types`) belum dibangun.
