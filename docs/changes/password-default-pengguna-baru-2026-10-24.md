# Sandi Awal Seragam untuk Pengguna Baru

- **Tanggal:** 2026-10-24
- **Branch:** `feat/password-default-pengguna-baru`
- **PR:** [#19](https://github.com/vourdev/lch-ins/pull/19)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Sandi acak 17 karakter yang dibuat saat admin menambah pengguna menyulitkan
serah terima akun. Diputuskan memakai satu sandi awal seragam, karena alur
wajib ganti sandi saat login pertama sudah berjalan.

## Yang berubah

- Pengguna baru yang dibuat admin di `/users` mendapat sandi awal `Default1234`.
- Dialog setelah pembuatan tetap menampilkan sandi tersebut untuk diteruskan ke
  pengguna.
- Reset sandi oleh admin juga mengembalikan sandi ke `Default1234`, mencabut
  sesi aktif, dan mewajibkan ganti sandi lagi.
- Generator sandi acak (`generateTemporaryPassword`) dihapus karena tidak
  dipakai lagi.

## File utama

- `lib/server/users.ts`: konstanta `DEFAULT_USER_PASSWORD` dipakai di
  `createUser` dan `resetUserPassword`.

## Dampak

- **Database:** tidak ada. Pengguna lama tidak tersentuh.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit` dan `npm run build` lolos.
- Uji manual: login admin, buat pengguna di `/users`, login sebagai pengguna itu
  dengan `Default1234`, pastikan diarahkan ke ganti sandi dan sandi baru tidak
  boleh `Default1234`.
- Uji reset: reset sandi pengguna lain dari menu aksi di `/users`, login
  dengan `Default1234`, pastikan diarahkan ke ganti sandi lagi.

## Catatan untuk yang melanjutkan

- Keamanan bergantung pada `mustChangePassword: true` saat pembuatan dan
  penolakan sandi baru yang sama dengan sandi lama
  (`app/(app)/change-password/actions.ts`). Jangan longgarkan salah satunya.
- Akun yang baru dibuat atau direset tetap bisa dimasuki siapa pun yang tahu
  sandi default sampai pemiliknya login dan mengganti sandi. Risiko ini
  diterima karena ganti sandi wajib di server (`requireAccess`).
