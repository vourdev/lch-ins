# Master Data Merek dan Tipe Kendaraan untuk SPPA dan Placing Slip

- **Tanggal:** 2026-10-24
- **Branch:** `feat/merek-tipe-kendaraan`
- **PR:** #25
- **Dikerjakan oleh:** Antigravity dengan Claude Code

## Latar belakang

Sebelumnya, data kendaraan di SPPA Motor Vehicle disimpan dalam teks bebas tunggal (`answers.vehicle` berisi "Merk, tipe, dan tahun"), dan di Placing Slip ditulis secara bebas di baris deskripsi item Interest (`SlipItem.description`). Hal ini menyebabkan ketidakkonsistenan penulisan merk dan tipe kendaraan, menyulitkan pencarian, rekapitulasi, dan pelaporan polis kendaraan bermotor.

LCH meminta 2 hal:
1. Merek dan tipe kendaraan diambil dari master data saat menambah SPPA.
2. Di placing slip Motor Vehicle, merek dan tipe kendaraan bisa diinput mengambil master data.

Keputusan perancangan yang disepakati:
- Hierarki parent-child: Tipe adalah model per merek (contoh: Toyota -> Avanza, Innova Zenix). Dropdown tipe baru aktif setelah merek dipilih, dan berganti merek otomatis mengosongkan tipe.
- Opsi terstruktur: Pilihan wajib berasal dari master data. Merek/tipe baru didaftarkan lewat menu Master Data.
- Placing slip per baris Interest: Setiap baris pertanggungan (interest item) pada slip Motor Vehicle dapat memilih merek dan tipe kendaraan masing-masing (mendukung armada multi-kendaraan).
- Seed awal: Merek umum di Indonesia (Toyota, Daihatsu, Honda, Mitsubishi, Suzuki, Nissan, Hyundai, Wuling, Isuzu, Mazda, Hino) beserta model-model populernya.

## Yang berubah

- **Master Data Kendaraan:**
  - Tab baru "Kendaraan" di menu Master Data (`/master-data`) dengan penghitung jumlah merek.
  - Tabel merek menampilkan nama, urutan tampilan, jumlah tipe, pemakaian transaksi (`usage`), dan status aktif.
  - Baris merek dapat di-expand untuk menampilkan daftar tipe kendaraan di bawah merek tersebut.
  - Dialog tambah dan ubah merek kendaraan dengan validasi keunikan nama (case-insensitive).
  - Dialog tambah dan ubah tipe kendaraan per merek dengan validasi keunikan nama per merek.
  - Toggle aktif/nonaktif merek dan tipe secara cepat.
  - Tombol hapus merek dan tipe dilindungi: ditolak bila sudah digunakan oleh SPPA atau placing slip (dengan pesan ramah menyarankan untuk dinonaktifkan saja), serta merek tidak dapat dihapus sebelum semua tipenya dihapus.
  - Seluruh mutasi dicatat di audit trail (`vehicle_brands` dan `vehicle_types`) dengan nama entitas yang ramah pengguna.
- **Form SPPA Motor Vehicle:**
  - Field pertanyaan teks bebas `vehicle` ("Merk, tipe, dan tahun") diganti menjadi `year` ("Tahun pembuatan", numeric).
  - Menambahkan pasangan pilihan `SearchSelect` terstruktur: "Merek kendaraan" dan "Tipe kendaraan" yang wajib diisi untuk Class of Business Motor Vehicle.
  - Tipe dinonaktifkan dengan placeholder "Pilih merek terlebih dahulu" sampai merek dipilih. Mengubah merek otomatis mereset pilihan tipe.
  - Data historis dengan isian teks lama `answers.vehicle` tetap aman dan ditampilkan sebagai teks bantuan "Isian lama: ..." agar pengguna dapat memetakan ke master data.
- **Form Placing Slip Motor Vehicle:**
  - Untuk COB Motor Vehicle, baris Interest dirender dalam kartu kendaraan per unit ("Kendaraan #1", "Kendaraan #2", dst.) dengan pilihan SearchSelect Merek dan Tipe, deskripsi rincian (plat nomor, nomor rangka/mesin, tahun), serta nilai pertanggungan.
  - Tombol "+ Tambah kendaraan" mempermudah penambahan armada unit berikutnya.
  - Pembuatan placing slip dari SPPA Motor Vehicle (`slipFromSppa`) otomatis menyalin merek dan tipe kendaraan ke baris Interest pertama dan menggabungkan rincian SPPA ke deskripsi.
- **Pratinjau Dokumen:**
  - Baris Interest pada dokumen cetak/pratinjau placing slip otomatis menampilkan badge tebal nama kendaraan `[Merek] [Tipe] — [Deskripsi]` bila berelasi dengan master kendaraan.
- **Audit Trail & Audit Resolver:**
  - Bidang `vehicleBrandId` dan `vehicleTypeId` otomatis diselesaikan menjadi nama merek dan nama tipe (bukan UUID mentah) pada riwayat audit trail.

## File utama

- `prisma/schema.prisma`: Model baru `VehicleBrand` dan `VehicleType` serta relasi FK opsional di `Sppa` dan `SlipItem`.
- `prisma/migrations/20261024120000_vehicle_brands_types/migration.sql`: Migrasi DDL skema database PostgreSQL.
- `prisma/seed-data/kendaraan.csv` & `prisma/seed.ts`: Seed data awal 11 merek dan 56 tipe kendaraan umum Indonesia.
- `lib/server/vehicles.ts`: Query options, query master dengan hitungan penggunaan, validasi relasi pasangan (`checkVehiclePair`), dan mutasi CRUD dengan pencatatan audit.
- `app/(app)/master-data/actions.ts`: Server Actions untuk operasi CRUD merek dan tipe kendaraan.
- `components/master-data/vehicles-tab.tsx`: Komponen UI tab Kendaraan di Master Data.
- `components/marketing/sppa-form.tsx`: Form SPPA terintegrasi pilihan merek dan tipe berkondisi Motor Vehicle.
- `components/underwriting/line-items.tsx`: Render baris Interest kendaraan dengan pilihan merek dan tipe.
- `components/underwriting/placing-slip-form.tsx` & `slip-model.ts`: Integrasi opsi kendaraan dan prefill dari SPPA Motor Vehicle.
- `components/documents/doc-blocks.tsx`: Render label cetak nama kendaraan pada baris Interest dokumen slip.
- `components/audit/audit-fields.ts` & `lib/server/audit.ts`: Pelabelan dan nama resolver untuk audit trail.

## Dampak

- **Database:**
  - Tabel baru: `vehicle_brands` dan `vehicle_types`.
  - Kolom baru: `sppa.vehicle_brand_id`, `sppa.vehicle_type_id`, `slip_items.vehicle_brand_id`, `slip_items.vehicle_type_id`.
  - Migrasi `20261024120000_vehicle_brands_types` dan penambahan fungsi seed kendaraan di `prisma/seed.ts`.
- **Env:** Tidak ada variabel baru.
- **Deploy:**
  - Jalankan `npx prisma migrate deploy` di database produksi.
  - Jalankan seed kendaraan (`npm run db:seed`) di produksi setelah konfirmasi/izin pengguna.

## Verifikasi

1. **Keutuhan Tipe:** `npx tsc --noEmit` lolos tanpa error (0 errors).
2. **Linter:** `npx eslint` pada seluruh file terdampak lolos tanpa error dan tanpa warning (0 errors, 0 warnings).
3. **Build Produksi:** `npm run build` sukses mengompilasi dan mengoptimasi 21 rute Next.js.
4. **Verifikasi Browser E2E (`ego-browser`):**
   - Halaman `/master-data` memuat tab "Kendaraan (11)" dengan tabel merek dan expand tipe berfungsi lancar.
   - Halaman `/marketing` dialog "SPPA Baru" dengan COB Motor Vehicle menampilkan dropdown "Merek Kendaraan *" dan "Tipe Kendaraan *" (disabled sebelum merek dipilih).
   - Halaman `/underwriting/new` dengan COB Motor Vehicle menampilkan kartu "Kendaraan #1" beserta input SearchSelect merek & tipe, serta penambahan unit melalui "+ Tambah kendaraan" (muncul "Kendaraan #2").
   - Probe TreeWalker memverifikasi 0 UUID mentah yang bocor pada elemen UI yang dirender.
5. **Aksesibilitas dan E2E ulang (2026-10-25, `ego-browser`, login admin lokal):**
   - Tab Kendaraan: 35 tombol ikon semuanya punya `aria-label` (contoh "Buka tipe Toyota", "Edit merek Toyota", "Edit tipe Agya"), 11 switch status semuanya berlabel. Expand Toyota menampilkan tipenya.
   - SPPA Motor Vehicle: tipe disabled dengan placeholder "Pilih merek terlebih dahulu"; memilih Toyota membuka tipe Toyota saja; mengganti merek ke Honda mengosongkan tipe dan menampilkan tipe Honda saja.
   - Placing slip Motor Vehicle: kartu "Kendaraan #1", pilih Mitsubishi lalu Pajero Sport, "+ Tambah kendaraan" memunculkan "Kendaraan #2"; tombol hapus berlabel "Hapus kendaraan #1/#2".
   - Probe UUID: 0 di teks dan input yang terlihat. Satu UUID ada di hidden input bawaan base-ui Select (`aria-hidden`, 1px), bukan tampilan pengguna.
   - Belum diuji di putaran ini: menyimpan SPPA dan membuat slip dari SPPA (prefill).

## Catatan untuk yang melanjutkan

- Format pemetaan opsi kendaraan di server menggunakan pola `OR: [{ isActive: true }, { sppa: { some: {} } }, { slipItems: { some: {} } }]`, sehingga merek/tipe yang dinonaktifkan tetap terbaca namanya pada transaksi historis, namun di-filter dari pilihan transaksi baru melalui filter client `isActive || id === selectedValue`.
- Pembaruan tipe kendaraan (`updateVehicleType`) tidak memindahkan `brandId` ke merek lain karena pasangan merek dan tipe disimpan bersama di transaksi SPPA dan Placing Slip.
