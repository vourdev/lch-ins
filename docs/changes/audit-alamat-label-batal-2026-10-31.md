# Audit alamat klien, label isian, dan pembatalan slip

- **Tanggal:** 2026-10-31
- **Branch:** `fix/audit-alamat-label-batal`
- **PR:** [#60](https://github.com/agussusanto17/lch-ins/pull/60)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

SIT pada 30 Oktober 2026 mencatat dua kasus audit trail yang gagal:

- **SIT-012:** perubahan alamat klien tidak tercatat. Snapshot audit hanya
  berisi baris tabel `clients`, sedangkan alamat ada di `client_addresses`.
  Label isian di detail audit juga masih nama kolom Inggris, misalnya "Contact
  person id number". Masalah ketiga di kasus ini, klien tanpa No. KTP PIC tidak
  bisa diedit, sudah diperbaiki di
  [edit-klien-tanpa-ktp-pic-2026-10-31.md](edit-klien-tanpa-ktp-pic-2026-10-31.md).
- **SIT-013:** pembatalan slip tercatat sebagai Ubah (Status), padahal enum
  `AuditAction` punya `Cancel`.

## Yang berubah

- Audit klien (tambah, ubah, hapus) kini menyertakan alamat dan berkas KYC
  sebagai daftar teks, misalnya "Alamat korespondensi (utama): Jl. ...". Daftar
  diurutkan, jadi alamat yang disimpan ulang dengan urutan sama tidak terbaca
  sebagai perubahan. Snapshot sebelum hapus kini diambil di dalam transaksi
  yang sama.
- Detail audit menampilkan alamat dan berkas per baris, karena isinya sendiri
  memuat koma.
- Label isian audit dilengkapi untuk semua kolom yang muncul di log tapi belum
  punya label: Nama PIC, No. KTP PIC, Tempat lahir, Tanggal lahir, Tanggal KYC,
  Keterangan tujuan asuransi, Alamat, Berkas KYC, Prioritas, Jenis daftar,
  Bawaan sistem, Rekening titipan premi, Akun COA, dan Reset kata sandi.
- Membatalkan slip tercatat dengan aksi Cancel, tampil sebagai "Batal". Status
  lain tetap tercatat sebagai Ubah.

## File utama

- `lib/server/clients.ts`: `clientAuditSnapshot` dipakai di audit tambah,
  ubah, dan hapus klien.
- `components/audit/audit-fields.ts`: label isian dan tampilan daftar per baris.
- `lib/server/placing-slips.ts`: aksi audit saat status slip diubah.

## Dampak

- **Database:** tidak ada migrasi. Log audit yang sudah ada tidak diubah. Label
  baru langsung berlaku juga untuk log lama, karena label dipasang saat
  ditampilkan.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`: lolos.
- `npm run build`: lolos.
- `npx eslint` pada file yang diubah: lolos.
- Uji manual di localhost dengan akun admin uji, mengikuti langkah SIT:
  - SIT-012: klien PT SIT Audit Uji ditambah, alamatnya diubah dari "Jl. Audit
    Awal No. 1, Jakarta Pusat" ke "Jl. Audit Baru No. 2, Jakarta Selatan", lalu
    dihapus. Audit Trail mencatat Tambah, Ubah, dan Hapus dengan nama klien.
    Ringkasan baris Ubah berbunyi "Alamat", dan detailnya menampilkan alamat
    sebelum dan sesudah. Detail baris Tambah memakai label Indonesia: Nama,
    Class of Business, Tanggal KYC, Status, Alamat, Jenis klien, Nama PIC.
  - SIT-013: slip uji 002/LCH-PLCMT/PS-SIT/X/2026 dibatalkan dan tercatat
    sebagai Batal dengan nomor slipnya.

## Catatan untuk yang melanjutkan

- Perubahan berkas KYC kini ikut tercatat lewat daftar "Berkas KYC" (jenis dan
  nama file), bukan isi filenya.
- `coaAccountId` diberi label, tetapi nilainya masih dicari di
  `lookup_values` oleh `lib/server/audit.ts`, jadi bisa tampil "Data tidak
  ditemukan". Belum disentuh di sini.
- Timestamp di database lokal tersimpan tujuh jam lebih awal (lihat catatan
  edit klien tanpa KTP PIC). Jam di halaman Audit Trail tetap benar karena
  Prisma membalik pergeseran yang sama saat membaca. Yang bergeser hanya nilai
  mentah di database, misalnya bila dibaca lewat SQL.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
