# Implementasi Modul Audit Trail & Pencatatan Aktivitas Sistem

- **Tanggal:** 2026-10-21
- **Branch:** `feat/audit-trail-system`
- **PR:** #11
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Audit trail merupakan persyaratan kepatuhan utama bagi pialang asuransi (LCH) untuk mencatat transparansi aktivitas operasional ("siapa mengubah apa dan kapan") di seluruh sistem. Sebelum implementasi ini:
1. Skema relasional `audit_logs` sudah siap di PostgreSQL (`prisma/schema.prisma`), namun modul navigasi `/audit-trail` masih ditandai `soon: true`.
2. Halaman `/audit-trail` masih berupa mock statis dan belum terhubung ke database.
3. Mutasi pengguna (`users`), data klien (`clients`), dan `sppa` belum secara konsisten mencatat histori perubahan field ke tabel `audit_logs`.
4. Belum ada mekanisme masking / redaksi otomatis untuk data rahasia (kata sandi, hash, token autentikasi) pada diff log audit.
5. Antarmuka peninjau perubahan membutuhkan visualisasi diff yang jelas dan ramah pengguna sesuai standar `/frontend-code-review`.

## Yang berubah

- **Redaksi Kredensial Sensitif**: Menambahkan penyaringan otomatis pada `diffChanges` di `server/services/audit.ts` agar kata sandi (`password`, `passwordHash`, `temporaryPassword`), token sesi (`token`), dan rahasia API (`secret`, `salt`) tidak pernah bocor atau tersimpan ke dalam JSON diff audit log.
- **Dual-Mode Transaction-Safe Logging**: Fungsi `recordAudit` mendukung pemanggilan baik dengan Prisma Transaction Client (`recordAudit(tx, entry)`) demi atomisitas mutasi database maupun pemanggilan standalone (`recordAudit(entry)`).
- **Aktivitas Mutasi Pengguna Terlacak**: Operasi pembuatan user (`createUser`), pembaruan profil/peran (`updateUser`), perubahan status aktif/nonaktif (`toggleUserStatus`), dan reset kata sandi (`resetUserPassword`) pada `lib/server/users.ts` mencatat audit log secara transaksional.
- **Aktivitas Mutasi Klien Terlacak**: Operasi pembuatan klien, pembaruan data/KYC, toggle status aktif/inaktif, dan penghapusan data klien pada `lib/server/clients.ts` mencatat audit log dengan atribut pengguna yang mengeksekusi aksi dari sesi Server Action `requireAccess("/marketing")`.
- **Aktivitas Mutasi SPPA Terlacak**: Operasi pembuatan, pembaruan, transisi status `Draft` -> `Submitted`, dan penghapusan SPPA pada `lib/server/sppa.ts` mencatat audit log.
- **Server Data Access Layer Audit**: Menyediakan `lib/server/audit.ts` dengan fungsi `listAuditLogs` (pencarian fleksibel, filter aksi/entitas/rentang tanggal, paginasi aman), `getAuditLogById`, dan `listAuditEntities`.
- **Proteksi Akses Khusus Admin**: Halaman `/audit-trail` dilindungi oleh guard server `requireAdmin("/audit-trail")` sehingga hanya pengguna berhak akses admin yang dapat melihat rekam jejak sistem.
- **Visual Diff Modal & Antarmuka Responsif**:
  - Komponen `AuditTable` mengimplementasikan filter pencarian, select aksi & entitas, filter rentang tanggal, paginasi tabel terpadu, dan ekspor CSV/Excel.
  - Dialog modal `AuditDiffDialog` menampilkan perbandingan terstruktur sebelum vs sesudah untuk field yang berubah, dengan kemampuan salin JSON log lengkap.
  - Komponen status badge `StatusBadge` mendukung aksi audit (`Create`, `Update`, `Delete`, `Release`, `Cancel`) dengan warna semantik yang tepat.
  - Penyesuaian layout tabel sesuai rekomendasi audit frontend (`min-w-200` dan `overflow-x-auto`) guna mencegah pemotongan data pada berbagai resolusi layar.
- **Pengaktifan Menu Sidebar**: Menghapus flag `soon: true` pada item navigasi `Audit Trail` di `components/layout/nav-items.ts`.

## File utama

- `server/services/audit.ts`: Layanan inti pencatatan audit log dengan masking kredensial sensitif dan overload signature transaksi Prisma.
- `lib/server/audit.ts`: Lapisan server-only untuk query database, filter multi-kriteria, dan paginasi data audit log.
- `app/(app)/audit-trail/page.tsx`: Server component rute `/audit-trail` dengan proteksi `requireAdmin` dan prefetching data.
- `components/audit/audit-table.tsx`: Komponen tabel log audit interaktif dengan filter, paginasi, copy ID, dan tombol ekspor.
- `components/audit/audit-diff-dialog.tsx`: Modal dialog perbandingan nilai atribut sebelum dan sesudah perubahan.
- `components/shared/status-badge.tsx`: Ekstensi badge status untuk varian aksi audit log.
- `components/layout/nav-items.ts`: Pengaktifan menu navigasi Audit Trail pada sidebar.
- `lib/server/users.ts`: Integrasi pencatatan audit log pada mutasi pengguna.
- `lib/server/clients.ts`: Integrasi pencatatan audit log pada mutasi klien.
- `lib/server/sppa.ts`: Integrasi pencatatan audit log pada mutasi SPPA.
- `scripts/test-audit-e2e.ts`: Script uji integrasi end-to-end audit trail (23 skenario uji verifikasi lolos).

## Dampak

- **Database:** Tidak ada migrasi skema baru karena tabel `audit_logs` sudah tersedia di skema Prisma sebelumnya. Data aktivitas baru otomatis tersimpan di tabel `audit_logs`.
- **Env:** Tidak ada variabel lingkungan baru yang diperlukan.
- **Deploy:** Standar deploy Next.js ke Vercel tanpa dependensi eksternal tambahan.

## Verifikasi

1. **Uji Integrasi End-to-End**:
   - Menjalankan `node -r ./scripts/mock-server-only.cjs --import tsx --env-file=.env scripts/test-audit-e2e.ts`.
   - Hasil: **23 PASSED, 0 FAILED** (mencakup redaksi kredensial rahasia, audit insert klien/SPPA/user, audit update dengan snapshot diff, audit status toggle, audit delete, query filter entitas/aksi, dan pencarian).
2. **Uji Tipe TypeScript**:
   - `npx tsc --noEmit` lolos tanpa kesalahan (0 error).
3. **Uji Build Produksi Next.js**:
   - `npm run build` sukses mengompilasi seluruh 69 rute termasuk halaman dynamic `/audit-trail`.

## Catatan untuk yang melanjutkan

- Modul downstream berikutnya seperti Placing Slip (`placing_slips`), Polis (`policies`), dan Klaim (`claims`) dapat mengadopsi pola yang sama dengan memanggil `recordAudit(tx, ...)` saat menjalankan mutasi data.
- Entitas baru yang ditambahkan ke audit trail otomatis terdeteksi di dropdown filter modul pada `AuditTable` melalui fungsi `listAuditEntities()`.
