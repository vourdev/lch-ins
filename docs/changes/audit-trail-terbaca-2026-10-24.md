# Audit Trail Menampilkan Nama, Bukan ID

- **Tanggal:** 2026-10-24
- **Branch:** `fix/audit-trail-terbaca`
- **PR:** [#22](https://github.com/vourdev/lch-ins/pull/22)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Halaman `/audit-trail` menampilkan UUID di kolom "ID Target", nama kolom
database di ringkasan perubahan, serta UUID, `true`/`false`, dan JSON mentah di
dialog detail. Aplikasi ini dipakai pengguna awam, jadi semua data harus
tampil dengan nama yang bisa dibaca.

## Yang berubah

- Kolom "ID Target" diganti kolom "Data" yang berisi nama data, misalnya nama
  klien, nomor polis, nomor klaim, atau nomor slip.
- Ringkasan perubahan memakai label bahasa Indonesia ("Premi, Grup
  tertanggung"). Tambah dan hapus ditulis "Data baru dibuat" dan "Data
  dihapus".
- Dialog detail:
  - menampilkan "Data: <nama>" sebagai ganti ID entitas dan ID audit;
  - nama isian memakai label;
  - nilai rujukan (klien, COB, okupasi, pengguna, nilai pilihan) tampil
    sebagai nama;
  - tanggal, angka, dan ya/tidak diformat;
  - isian internal (`id`, `_count`) dan isian yang kosong di kedua sisi
    disembunyikan;
  - tombol "Salin JSON" dihapus.
- Ekspor memakai kolom "Data" dan "Perubahan" serta label aksi bahasa
  Indonesia. Kolom "Target ID" tidak ada lagi.
- Filter Aksi dan Modul menampilkan label, bukan nilai mentah. Label modul
  dilengkapi untuk semua tabel yang diaudit.
- Pencarian mencari di nama data dan label isian, bukan di ID.

## File utama

- `lib/server/audit.ts`:
  - `toAuditRecords` menerjemahkan ID ke nama saat log dibaca, dengan satu
    query per tabel;
  - data yang sudah dihapus diambil namanya dari snapshot log Create atau
    Delete-nya;
  - `AuditLogRecord` mendapat `entityLabel` dan `refNames`.
- `components/audit/audit-fields.ts` (baru): label modul, aksi, dan isian,
  serta format nilai. Dipakai bersama oleh tabel dan dialog.
- `components/audit/audit-table.tsx`, `components/audit/audit-diff-dialog.tsx`.

## Dampak

- **Database:** tidak ada migrasi. Nama diterjemahkan saat dibaca, jadi log
  lama ikut terbaca.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`, `npx eslint`, dan `npm run build` lolos.
- Skrip lokal atas 100 log terbaru di database lokal: 0 UUID yang tampil,
  semua log punya nama data, dan semua rujukan berhasil diterjemahkan.
- Uji di browser, login admin lalu buka `/audit-trail`:
  - tabel tidak memuat UUID;
  - kolom "Data" berisi nama;
  - filter menampilkan "Semua Aksi" dan "Semua Modul";
  - dialog detail log SPPA menampilkan COB, klien, dan okupasi sebagai nama.

## Catatan untuk yang melanjutkan

- Tabel baru yang diaudit perlu didaftarkan di `ENTITY_MODEL` dan
  `NAME_RESOLVERS` (`lib/server/audit.ts`) serta `ENTITY_LABELS`
  (`audit-fields.ts`).
- Foreign key berakhiran `Id` yang tidak terdaftar di `FIELD_MODEL` dianggap
  merujuk `lookup_values`. Daftarkan foreign key baru ke tabel lain di sana.
- Isian tanpa label di `FIELD_LABELS` tampil dari nama kuncinya
  ("riskLocation" menjadi "Risk location"). Tambahkan label kalau perlu.
