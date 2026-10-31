# Login akun nonaktif ditolak tanpa loop

- **Tanggal:** 2026-10-31
- **Branch:** `fix/login-akun-nonaktif`
- **PR:** [#62](https://github.com/agussusanto17/lch-ins/pull/62)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

SIT-003 pada 30 Oktober 2026 gagal. Sesi yang sedang berjalan memang langsung
berakhir saat akun dinonaktifkan. Tetapi login baru dengan akun nonaktif tidak
ditolak: browser bolak-balik antara `/login` dan `/change-password` tanpa pesan,
ratusan request dalam beberapa detik.

Penyebabnya:

1. Better Auth tidak mengenal kolom `isActive`, jadi login dengan kata sandi
   yang benar tetap membuat sesi.
2. Halaman aplikasi memeriksa `isActive` lewat `currentUser()`, menolak sesi
   itu, lalu mengarahkan ke `/login`.
3. Form login memeriksa sesi di browser lewat `authClient.getSession()`,
   menemukan sesi yang sama, lalu mengarahkan lagi ke halaman tujuan.

Langkah 2 dan 3 terus berulang.

## Yang berubah

- Hook `databaseHooks.session.create.before` di `lib/auth.ts` menolak
  pembuatan sesi untuk akun nonaktif dengan status 403 dan kode
  `ACCOUNT_INACTIVE`. Hook ini mengikuti saran dokumentasi Better Auth untuk
  memblokir login email dan kata sandi.
- Hook berjalan setelah kata sandi cocok. Kata sandi salah tetap mendapat pesan
  umum "Email atau kata sandi salah", jadi status akun tidak terbuka bagi orang
  yang tidak tahu kata sandinya.
- Form login menampilkan "Akun ini sudah dinonaktifkan. Hubungi Admin untuk
  mengaktifkan kembali." untuk kode itu.
- Bila browser masih memegang sesi milik akun yang sudah nonaktif, misalnya
  sesi lama dari sebelum perbaikan ini, form login mengeluarkan sesi itu dan
  menampilkan pesan yang sama, bukan mengalihkan halaman.

## File utama

- `lib/auth.ts`: hook penolak sesi untuk akun nonaktif.
- `components/auth/login-form.tsx`: pesan akun nonaktif dan penanganan sesi
  lama.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`: lolos.
- `npm run build`: lolos.
- `npx eslint lib/auth.ts components/auth/login-form.tsx`: lolos.
- Uji di localhost lewat API sign-in Better Auth (cookie terpisah dari
  browser):
  - Akun uji `sit.nonaktif` dinonaktifkan lewat menu Pengguna, sesinya ikut
    terhapus.
  - Login dengan kata sandi yang benar: HTTP 403, kode `ACCOUNT_INACTIVE`,
    dan tidak ada sesi baru di tabel `sessions`.
  - Login akun yang sama dengan kata sandi salah: HTTP 401
    `INVALID_EMAIL_OR_PASSWORD`, sama seperti akun aktif.
  - Login akun aktif (`sit.marketing`): HTTP 200.
- Uji form login di browser belum dijalankan, karena butuh kata sandi akun uji
  diketik di form.

## Catatan untuk yang melanjutkan

- Menonaktifkan akun di modul Pengguna sudah menghapus semua sesinya
  (`lib/server/users.ts`). Hook ini menutup celah login baru.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
