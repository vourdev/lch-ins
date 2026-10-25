# Cetak Renewal Notice dan SPPA format KYC, logo LCH dipasang

- **Tanggal:** 2026-10-25
- **Branch:** `feat/print-renewal-sppa-logo`
- **PR:** #29
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Ada tiga kebutuhan dari LCH:

- Renewal Notice harus bisa dicetak sebagai daftar dan per polis. Sebelumnya
  tombol Print hanya memanggil `window.print()` pada layar, jadi yang tercetak
  cuma 10 baris di halaman tabel yang sedang aktif, tanpa kop.
- SPPA dicetak dengan format form KYC resmi LCH, sesuai PDF KYC Korporasi dan
  KYC Perorangan yang dikirim LCH.
- Logo `logo-lch.jpg` dipasang di aplikasi menggantikan badge "L".

Selain itu, nomor telepon kantor di kop dokumen salah (`2605 1071/1072`). Yang
benar sesuai PDF KYC adalah `2605 1671/1672`, dan sudah dikonfirmasi user.

## Yang berubah

- **Renewal Notice:**
  - Tombol Print membuka `/marketing/renewal?days=..&cob=..`. Halaman itu
    berisi daftar lengkap tanpa paginasi, memakai kop, menampilkan total
    premium, dan mengikuti filter periode dan COB yang sedang dipilih.
  - Tiap baris punya aksi "Cetak surat pemberitahuan" yang membuka
    `/marketing/renewal/<id>`. Halaman itu berisi surat pemberitahuan
    perpanjangan polis yang muat satu halaman A4, lengkap dengan alamat
    utama klien dan "Up." PIC untuk klien korporasi.
  - Data diambil dari database lewat server, tidak lagi dari store in-memory.
    Dulu, kalau tab ini dibuka sebelum Policy Database, yang tampil adalah data
    contoh.
  - Layar dan halaman cetak memakai fungsi filter yang sama
    (`renewalCandidates`), jadi isinya selalu identik.
- **SPPA:**
  - Aksi baris "Cetak SPPA" membuka `/marketing/sppa/<id>`, yang terdiri dari
    dua halaman.
  - Halaman 1 adalah form KYC yang meniru PDF LCH: pita navy, baris bernomor
    bilingual, dan checkbox untuk sumber penghasilan, tujuan asuransi, serta
    dokumen pendukung. Checkbox tercentang otomatis dari data klien. Versi
    Korporasi atau Perorangan dipilih dari tipe klien.
  - Halaman 2 berisi detail SPPA dan jawaban kuesioner per COB.
- **Tombol Kembali** di halaman cetak mendarat di tab asal: `?tab=renewal`
  dengan filter yang sama, atau `?tab=sppa`. Halaman Marketing kini membaca
  `?tab=`, `?days=`, dan `?cob=`.
- **Logo:**
  - Kop semua dokumen cetak (slip, quotation, cover note, closing, renewal,
    SPPA) memakai logo penuh. Teks nama perusahaan dan SKOJK dihapus karena
    sudah ada di dalam gambar.
  - Sidebar memakai emblem di tile putih.
  - Halaman login memakai logo penuh.
  - Favicon dan apple icon memakai emblem.
- Pita navy KYC tetap tercetak walaupun opsi "Background graphics" di dialog
  print tidak dicentang (`print-color-adjust: exact` pada `.print-sheet`).

## File utama

- `lib/renewal.ts`: filter kandidat renewal, parsing `days`/`cob` dari URL,
  dan helper link Kembali.
- `components/documents/renewal-documents.tsx`: dokumen daftar renewal dan
  surat pemberitahuan.
- `components/documents/sppa-documents.tsx`: form KYC dan halaman detail SPPA.
- `app/(print)/marketing/renewal/page.tsx`,
  `app/(print)/marketing/renewal/[id]/page.tsx`,
  `app/(print)/marketing/sppa/[id]/page.tsx`: route cetak baru.
- `lib/server/policies.ts`: `listRenewalPolicies(today)` mengambil polis yang
  berakhir dalam 180 hari ke depan. Batasnya diterapkan di query, jadi tidak
  memuat seluruh tabel.
- `components/documents/letterhead.tsx`: `LchLogo`, kop baru, telepon
  diperbaiki.
- `components/documents/printed-at.tsx`: `PrintedAt` dipindah dari
  `slip-documents.tsx` supaya bisa dipakai bersama.
- `components/shared/table-toolbar.tsx`: `ExportButtons` menerima prop
  opsional `printHref`. Kalau diisi, tombol Print menjadi link. Kalau tidak,
  perilaku `window.print()` tetap sama untuk modul lain.
- `public/images/logo-lch.jpg`, `public/images/logo-lch-mark.png`,
  `app/icon.png`, `app/apple-icon.png`: aset logo. `app/favicon.ico` bawaan
  Next dihapus.

## Dampak

- **Database:** tidak ada migrasi.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah khusus selain sinkron fork
  `gh repo sync vourdev/lch-ins -b main` setelah merge. Route cetak baru
  otomatis ikut hak akses baris `/marketing`, dan semua role minimal punya
  akses Lihat.

## Verifikasi

- `npx tsc --noEmit` dan `npm run build` lolos. ESLint pada file yang berubah
  bersih.
- Uji manual di dev server, termasuk cetak ke PDF A4 dari browser:
  - Renewal 90 hari menampilkan 0 polis, 180 hari menampilkan 3 polis. Daftar
    cetak berisi 3 baris dan total yang sama dengan layar.
  - Surat pemberitahuan untuk polis MV/FLT/2026/0088 muat satu halaman, dengan
    nama, alamat, dan Up. klien.
  - SPPA Korporasi (PT Delta Manufaktur) dan Perorangan (Mr. Harry Mulyono)
    masing-masing pas dua halaman. Checkbox tujuan, sumber penghasilan, dan
    dokumen tercentang sesuai data. Pita navy tercetak.
  - Tombol Kembali dari daftar dan surat kembali ke tab Renewal dengan filter
    yang sama. Dari SPPA, kembali ke tab SPPA.
  - ID yang tidak valid di ketiga route cetak menghasilkan 404.
  - Logo tampil di sidebar, kop dokumen, dan login.

## Catatan untuk yang melanjutkan

- Surat pemberitahuan belum punya nomor surat karena LCH belum memberi skema
  penomoran. Kalau skema sudah ada, tambahkan di bawah tanggal surat.
- Kota di form KYC dan surat ditulis tetap "Jakarta".
- `InfoTable` punya opsi `dense` khusus untuk surat yang harus muat satu
  halaman. Kalau isi surat bertambah, cek ulang hasil cetaknya.
- Logo OJK dan APPARINDO di footer KYC ditulis sebagai teks karena file logonya
  belum ada.
- Periode renewal terpanjang (180 hari) menjadi batas query di
  `listRenewalPolicies`. Kalau periode baru ditambahkan ke `RENEWAL_PERIODS`,
  batas query ikut menyesuaikan.
