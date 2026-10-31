# Matriks hak akses 7 role dan Klaim tanpa akses Laporan Keuangan

- **Tanggal:** 2026-10-31
- **Branch:** `fix/rbac-laporan-keuangan-klaim`
- **PR:** #<nomor> (isi setelah PR dibuka)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Saat diuji langsung dengan akun Marketing, menu Jurnal, Laporan Keuangan,
Master Clauses, Master Data, Report, dan Pengguna masih tampil, padahal sheet
hak akses LCH menyatakan Marketing tidak punya akses ke menu-menu itu.

LCH lalu mengirim spesifikasi lengkap untuk tujuh role, termasuk role baru
Direksi, beserta arti tiap tingkat:

- **Kelola:** lihat, tambah, ubah, hapus, dan release.
- **Lihat:** menu tampil, hanya bisa melihat dan export.
- **Tidak:** menu tidak tampil sama sekali, dan alamatnya ditolak.

PR #55 menyesuaikan `ACCESS_MATRIX` dengan spesifikasi itu, tetapi di-merge
tanpa catatan perubahan, dan satu sel masih salah: Klaim mendapat Lihat di
Laporan Keuangan, padahal seharusnya Tidak. Catatan ini menutup keduanya.

## Yang berubah

Matriks yang berlaku sekarang (K = Kelola, L = Lihat, T = Tidak):

| Menu | Admin | Mkt | Teknik | Klaim | Finance | Accounting | Direksi |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard | K | L | L | L | L | L | L |
| Marketing | K | K | K | L | T | T | L |
| Underwriting | K | L | K | L | L | L | L |
| Policy Database | K | L | K | L | L | L | L |
| Klaim | K | L | K | K | L | L | L |
| DN/CN | K | L | L | L | K | L | L |
| Pembayaran | K | L | L | L | K | K | L |
| Piutang | K | L | L | L | K | K | L |
| Jurnal | K | T | T | T | K | K | L |
| Laporan Keuangan | K | T | T | T | L | K | L |
| Master Clauses | K | T | K | T | T | T | L |
| Master Data | K | T | K | T | T | T | L |
| Report | K | L | K | K | K | K | L |
| Pengguna | K | T | T | T | T | T | L |

Audit Trail dan Pengaturan tidak ada di sheet LCH, jadi tetap khusus Admin.

Dari PR #55:

- Role `direksi` ditambahkan ke `CANONICAL_ROLES` dan `ROLE_LABELS`, sehingga
  bisa dipilih di form pengguna dan punya warna badge sendiri.
- Kolom matriks diurutkan ulang menjadi Admin, Marketing, Teknik, Klaim,
  Finance, Accounting, Direksi, sama dengan urutan sheet LCH.
- Konstanta tingkat `N` diganti `T` supaya cocok dengan istilah "Tidak" di
  sheet.

Dari branch ini:

- Klaim di Laporan Keuangan: Lihat → Tidak.
- Lookup `role` di seed mendapat baris `direksi`, supaya daftar role di Master
  Data sama dengan `CANONICAL_ROLES`.
- Dua komentar di `lib/access.ts` yang masih menyebut enam role diperbarui.

## File utama

- `lib/access.ts`: matriks hak akses dan daftar role.
- `components/users/user-role-badge.tsx`: warna badge Direksi (PR #55).
- `prisma/seed.ts`: baris lookup `role` untuk Direksi.

## Dampak

- **Database:** tidak ada migrasi. Baris lookup `direksi` baru masuk kalau
  `npm run db:seed` dijalankan. Seed memakai upsert, jadi aman diulang.
  Pengguna Direksi tetap bisa dibuat tanpa baris itu, karena role pengguna
  disimpan di kolom `roles` (array string), bukan di relasi lookup.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan. Akun Klaim yang sedang login
  kehilangan menu Laporan Keuangan pada render berikutnya.

## Verifikasi

- Skrip sekali pakai memanggil `accessLevel()` untuk 14 menu × 7 role dan
  membandingkannya dengan spesifikasi LCH: semua sel cocok.
- `npx tsc --noEmit` lolos.
- `npm run build` lolos.

## Catatan untuk yang melanjutkan

- Tombol tambah, ubah, hapus, dan release disembunyikan untuk role Lihat oleh
  `feat/rbac-ui-action-guard` (sudah di `main`). Mutasi di server dijaga
  `requireManage`. Kalau menambah aksi baru, pakai keduanya.
- Pengguna multi-role mendapat tingkat paling longgar dari role-rolenya. Akun
  uji seperti Admin + Marketing + Teknik akan melihat semua menu, jadi uji hak
  akses dengan akun satu role.
- `lib/server/users.ts` membandingkan `target.roleId === "admin"`, padahal
  `roleId` berisi UUID. Fallback itu tidak pernah benar, tetapi tidak
  berdampak selama `roles` terisi. Belum disentuh di sini.
