# Audit Trail menampilkan semua log, dropdown tidak terpotong, data kendaraan aktual

- **Tanggal:** 2026-10-25
- **Branch:** `fix/audit-trail-log-dan-dropdown`
- **PR:** #27
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Hasil cek live setelah PR #26 menemukan tiga masalah:

1. Item dropdown yang panjang terpotong, misalnya "Manajemen Pengguna" di
   filter modul Audit Trail.
2. Audit Trail terlihat hanya berisi log admin. Penyebabnya ada dua:
   - Halaman hanya memuat 100 log terbaru lalu memfilter di browser, sehingga
     log yang lebih lama, termasuk aktivitas user lain, tidak bisa dijangkau
     lewat filter maupun paging.
   - Perubahan dokumen klaim dan catatan follow-up klaim sama sekali tidak
     dicatat ke audit.
3. Master data kendaraan di production masih kosong. Diminta diisi 10 merek
   dengan data aktual.

## Yang berubah

- **Dropdown:** popup `Select` sekarang minimal selebar trigger dan melebar
  mengikuti item terpanjang, dibatasi lebar layar. Perubahan ada di
  komponen dasar, jadi berlaku untuk semua dropdown filter. Pengecekan di
  Marketing, Underwriting, Polis, Klaim, Pengguna, dan Audit Trail: tidak ada
  item yang terpotong. Combobox (`SearchSelect`) tidak diubah karena teksnya
  sudah membungkus ke baris berikut, tidak terpotong.
- **Audit Trail:**
  - Filter (cari, aksi, modul, pengguna, rentang tanggal) dan paging sekarang
    berjalan di database, dan statusnya disimpan di URL (`q`, `action`,
    `entity`, `user`, `from`, `to`, `page`, `size`). Semua log bisa dijangkau.
  - Ada filter baru **Pengguna**.
  - Pencarian mencocokkan nama, email, dan jabatan pengguna serta nama modul.
  - Export mengambil seluruh hasil filter dari server (maksimal 5.000 baris),
    bukan hanya halaman yang sedang tampil.
- **Audit klaim:**
  - Mencatat log untuk: tandai dokumen diterima, edit dokumen, tambah atau
    hapus dokumen, serta tambah atau hapus catatan follow-up.
  - Log disimpan di bawah klaimnya sehingga kolom Data menampilkan nomor
    klaim.
  - Opsi baru `context` di `recordAudit` menyimpan nama dokumen bersama
    perubahan, supaya detail log menyebut dokumen mana yang diubah.
- **Kendaraan:**
  - `kendaraan.csv` diganti dengan 10 merek mobil penumpang terlaris
    Januari–September 2026 versi data wholesales Gaikindo: Toyota, Daihatsu,
    Suzuki, Mitsubishi, BYD, Honda, Jaecoo, Isuzu, Wuling, Hyundai.
  - Total 57 tipe yang masih dijual tahun ini.
  - Dihapus dari daftar: Nissan, Mazda, dan Hino (bukan sepuluh besar; Hino
    truk), Isuzu Panther (sudah berhenti produksi), dan Colt Diesel (merek
    Fuso).

## File utama

- `components/ui/select.tsx`: lebar popup mengikuti isi.
- `lib/server/audit.ts`: `buildAuditWhere`, `listAuditLogs` berhalaman,
  `listAuditLogsForExport`, `listAuditUsers`.
- `components/audit/audit-filter.ts`: parsing filter dari URL.
- `components/audit/audit-table.tsx`: filter dan paging lewat URL, filter
  pengguna, dan export penuh.
- `app/(app)/audit-trail/page.tsx`, `app/(app)/audit-trail/actions.ts`:
  halaman membaca `searchParams`; action export khusus admin.
- `lib/export.ts`, `components/shared/table-toolbar.tsx`: `loadRows` opsional
  untuk export yang mengambil data saat tombol diklik.
- `server/services/audit.ts`: opsi `context`.
- `lib/server/claims.ts`, `app/(app)/claims/actions.ts`: audit dokumen dan
  follow-up klaim.
- `components/audit/audit-fields.ts`: label kolom dokumen dan follow-up.
- `prisma/seed-data/kendaraan.csv`: data merek dan tipe baru.

## Dampak

- **Database:**
  - Tidak ada migrasi.
  - Production perlu menjalankan `npm run db:seed -- vehicles` agar tab
    Kendaraan terisi.
  - Seed ini hanya menambah dan tidak pernah menghapus atau mengubah baris
    yang sudah ada.
- **Env:** tidak ada.
- **Deploy:**
  - Setelah merge, sinkronkan fork: `gh repo sync vourdev/lch-ins -b main`.
  - Seed kendaraan ke production dijalankan terpisah setelah ada izin.

## Verifikasi

- `npx tsc --noEmit` lolos, ESLint pada file yang diubah bersih, dan
  `npm run build` lolos.
- `scripts/test-claim-docs-followups.ts`:
  - Semua langkah PASS.
  - 7 baris audit tercatat di bawah klaim.
  - Log toggle menyebut nama dokumennya.
- Seed lokal: tabel kendaraan dikosongkan lalu `npm run db:seed -- vehicles`
  menghasilkan 10 merek dan 57 tipe.
- Browser (ego-browser, lokal):
  - Login sebagai user Marketing, menambah follow-up klaim dan menandai
    dokumen diterima.
  - Login kembali sebagai admin: kedua log muncul paling atas atas nama user
    Marketing. Filter Pengguna dan pencarian "aziz" menampilkan 2 log
    tersebut. Detail log menyebut dokumennya.
  - Paging ke halaman 10 dan 11 menampilkan log di luar 100 terbaru, dengan
    total 158.
  - Export CSV menghasilkan 158 baris.
  - Pengukuran dropdown di 6 modul: tidak ada item terpotong, dan popup
    melebar bila item lebih panjang dari trigger.

## Catatan untuk yang melanjutkan

- Ditemukan bug lain di luar topik, belum diperbaiki di branch ini:
  - Gejala: edit klien selalu ditolak "Klien dengan nama ini sudah terdaftar".
  - Penyebab: `components/marketing/client-form.tsx` mengecek duplikat
    terhadap data contoh di `lib/store.ts`, bukan data database. ID klien
    contoh tidak sama dengan ID di database, sedangkan namanya sama.
  - Dampak: klien hasil seed tidak bisa diedit.
  - Perlu branch tersendiri.
- Export dibatasi 5.000 baris (`EXPORT_LIMIT` di `lib/server/audit.ts`). Kalau
  log tumbuh lebih besar, export perlu dipecah atau dipersempit dengan filter.
- Daftar kendaraan dirujuk dari: data wholesales Gaikindo Januari–September
  2026 dan daftar model di situs resmi masing-masing merek.
- Catatan terkait:
  - [standardisasi-ui-audit-dialog-2026-10-25.md](standardisasi-ui-audit-dialog-2026-10-25.md)
  - [merek-tipe-kendaraan-2026-10-24.md](merek-tipe-kendaraan-2026-10-24.md)
