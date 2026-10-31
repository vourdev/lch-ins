# COB di master data hanya bisa diaktifkan atau dinonaktifkan

- **Tanggal:** 2026-10-31
- **Branch:** `feat/kunci-cob-master-data`
- **PR:** [#61](https://github.com/agussusanto17/lch-ins/pull/61)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

COB baru tidak bisa langsung dipakai hanya dengan diinput di master data.
Placing slip, SPPA, dan dokumen cetak masih memilih perilaku khusus dari nama
COB ("Property" dan "Motor Vehicle"). Isian Varian Form dan Satuan Rate di
master COB belum dibaca. Tarif OJK, dokumen cetak, dan laporan juga bisa perlu
disesuaikan. Mengganti nama COB yang sudah ada bahkan bisa menghilangkan form
khususnya.

Agus mengusulkan perubahan ini ke Harry (LCH) dan disetujui lewat chat pada
31 Oktober 2026:

- Penambahan dan perubahan COB dilakukan developer, sebagai change request.
- Tim LCH tetap bisa menonaktifkan dan mengaktifkan kembali COB.
- Type of cover di COB yang sudah ada, serta master data lain, tetap dikelola
  sendiri oleh LCH.

## Yang berubah

- Halaman Master Data → COB & Cover Type tidak lagi punya tombol Tambah COB,
  Edit COB, dan Hapus COB, tanpa keterangan pengganti (permintaan Agus). Switch
  aktif/nonaktif COB tetap ada.
- Server Action `createCobAction`, `updateCobAction`, dan `deleteCobAction`
  dihapus, jadi tidak bisa dipanggil langsung dari browser.
- Type of cover (sub-cover) tidak berubah: tetap bisa ditambah, diedit,
  dinonaktifkan, dan dihapus oleh role yang berhak Kelola.
- `createCob`, `updateCob`, dan `deleteCob` di `lib/server/master-data.ts`
  dipertahankan untuk skrip developer, salah satunya
  `scripts/test-master-data-e2e.ts`.

## Cara menambah COB baru (untuk developer)

Tambahkan lewat migrasi supaya ikut ke demo dan production saat
`prisma migrate deploy` jalan. `updated_at` tidak punya default di database,
jadi wajib diisi. Pilihan `rate_mode` saat ini `permil` dan `percent`;
`form_variant` saat ini `property`, `motor`, dan `standard`.

```sql
INSERT INTO "classes_of_business" ("code", "name", "rate_mode_id", "form_variant_id", "updated_at")
SELECT '15', 'NAMA COB BARU', rm."id", fv."id", CURRENT_TIMESTAMP
FROM "lookup_values" rm, "lookup_values" fv
WHERE rm."lookup_type" = 'rate_mode' AND rm."code" = 'permil'
  AND fv."lookup_type" = 'form_variant' AND fv."code" = 'standard';
```

Sebelum COB baru dirilis, cek juga:

- Form placing slip dan SPPA. COB selain Property dan Motor Vehicle memakai
  form standar. Perilaku seperti Property atau Motor masih ditentukan dari nama
  COB, jadi butuh perubahan kode.
- Tarif OJK yang berlaku, dokumen cetak, master clause, dan kolom laporan.
- Type of cover awal, bila perlu, bisa ditambah LCH sendiri setelah COB ada.

COB yang ditambah lewat migrasi tidak tercatat di audit trail.

## File utama

- `components/master-data/cob-cover-tab.tsx`: tombol dan dialog COB dihapus.
- `app/(app)/master-data/actions.ts`: Server Action tambah, ubah, dan hapus
  COB dihapus.
- `app/(app)/master-data/cob/page.tsx`: tidak lagi memuat pilihan satuan rate
  dan varian form.
- `lib/server/master-data.ts`: keterangan bahwa fungsi mutasi COB hanya untuk
  skrip developer.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`: lolos.
- `npm run build`: lolos.
- `npx eslint` pada file yang diubah: lolos.
- Uji manual di localhost dengan akun admin uji, di Master Data → COB & Cover
  Type:
  - Tombol Tambah COB, Edit COB, dan Hapus COB tidak ada, dan toolbar hanya
    berisi kotak pencarian.
  - SIT UJI COB dinonaktifkan lalu diaktifkan lagi: toast "COB dinonaktifkan"
    dan "COB diaktifkan", status ikut berubah.
  - Sub-cover tetap punya tombol Tambah, Edit, Hapus, dan switch aktif.
    Dialog Tambah Sub-Cover terbuka dengan kode COB terisi.

## Catatan untuk yang melanjutkan

- PRD A-04 dan skenario SIT-015 serta SIT-016 ikut disesuaikan dengan
  kesepakatan ini.
- Enhance supaya form membaca Varian Form dan Satuan Rate dari master belum
  dikerjakan. Selama belum ada, COB baru dengan perilaku Property atau Motor
  tetap butuh perubahan kode.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
