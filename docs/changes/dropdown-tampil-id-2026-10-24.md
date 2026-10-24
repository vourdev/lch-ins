# Dropdown Menampilkan Nama, Bukan ID

- **Tanggal:** 2026-10-24
- **Branch:** `fix/dropdown-tampil-id`
- **PR:** [#23](https://github.com/vourdev/lch-ins/pull/23)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Beberapa dropdown menampilkan nilai mentah setelah dipilih. Contohnya UUID
pada satuan rate dan varian form di dialog COB, UUID bank di dialog rekening
bank, dan kode seperti `account_type` pada kategori nilai pilihan. Komponen
Select Base UI hanya bisa menampilkan label di tombolnya kalau diberi prop
`items`. Tanpa prop itu, yang tampil adalah `value`-nya.

Di form polis dan form klausul, label sudah diberikan, tetapi daftar opsinya
hanya memuat data aktif. Akibatnya, polis atau klausul yang memakai data yang
sudah dinonaktifkan akan menampilkan UUID.

Aplikasi ini dipakai pengguna awam, jadi semua pilihan harus tampil dengan
nama.

## Yang berubah

- Master Data, dialog COB: satuan rate dan varian form tampil sebagai
  "Nama (kode)".
- Master Data, dialog rekening bank: bank tampil dengan namanya.
- Master Data, tab Nilai Pilihan:
  - kategori tampil dengan labelnya;
  - akhiran kode mentah `(account_type)` dihapus dari daftar dan dari judul
    dialog;
  - label ditambahkan untuk kategori `account_type`, `payment_model`,
    `placement_location`, `rate_line_kind`, dan `reset_period`.
- Form polis: klasifikasi OJK dan lokasi penempatan yang sudah nonaktif tetap
  tampil dengan namanya kalau masih dipakai polis tersebut. Opsi nonaktif
  tidak muncul untuk polis lain.
- Form klausul: aturannya sama untuk COB dan type of cover. Filter COB di
  daftar klausul juga memuat COB nonaktif yang masih dipakai klausul, supaya
  tetap bisa dipakai untuk menyaring.

## File utama

- `components/master-data/cob-cover-tab.tsx`,
  `components/master-data/finance-docs-tab.tsx`,
  `components/master-data/lookup-values-tab.tsx`: prop `items` pada Select.
- `lib/server/policies.ts` (`listPolicyFormOptions`) dan
  `lib/server/clauses.ts` (`listCobOptions`, `listCoverTypeOptions`):
  - opsi mencakup data nonaktif yang masih dipakai;
  - setiap opsi membawa `isActive`.
- `components/policies/policy-form.tsx`, `components/underwriting/clause-form.tsx`:
  opsi nonaktif disaring, kecuali yang sedang terpilih.

## Dampak

- **Database:** tidak ada migrasi.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`, `npx eslint`, dan `npm run build` lolos.
- Browser lokal (ego-browser), dengan pengecekan teks UUID yang terlihat di
  halaman:
  - dialog edit COB menampilkan "Per mil (permil)" dan "Property (property)";
  - dialog tambah rekening bank menampilkan "BCA";
  - kategori nilai pilihan menampilkan "Jenis Akun Perkiraan";
  - form edit klausul menampilkan "Cargo";
  - Select di form edit polis tidak menampilkan UUID.
- UUID hanya tersisa di `<input aria-hidden>` milik Base UI. Itu nilai form
  yang tidak terlihat oleh pengguna.

## Catatan untuk yang melanjutkan

- Setiap Select baru yang `value`-nya ID atau kode wajib diberi `items`
  berisi `{ label, value }`.
- Kalau daftar opsi disaring ke data aktif saja, sertakan nilai yang sedang
  terpilih. Kalau tidak, data lama yang nonaktif akan tampil sebagai ID.
- Form polis masih menampilkan ID slip di baris "terhubung ke slip" kalau
  nomor slip kosong. Ini diperbaiki di branch `fix/pesan-error-tanpa-id`.
