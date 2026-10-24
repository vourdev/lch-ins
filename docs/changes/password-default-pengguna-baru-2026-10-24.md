# Sandi Awal Seragam untuk Pengguna Baru

- **Tanggal:** 2026-10-24
- **Branch:** `feat/password-default-pengguna-baru`
- **PR:** (isi setelah PR dibuka)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Sandi acak 17 karakter yang dibuat saat admin menambah pengguna menyulitkan
serah terima akun. Diputuskan memakai satu sandi awal seragam, karena alur
wajib ganti sandi saat login pertama sudah berjalan.

## Yang berubah

- Pengguna baru yang dibuat admin di `/users` mendapat sandi awal `Default1234`.
- Dialog setelah pembuatan tetap menampilkan sandi tersebut untuk diteruskan ke
  pengguna.
- Reset sandi oleh admin **tidak berubah**: tetap membuat sandi acak sementara.

## File utama

- `lib/server/users.ts`: konstanta `DEFAULT_USER_PASSWORD` dipakai di `createUser`.

## Dampak

- **Database:** tidak ada. Pengguna lama tidak tersentuh.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit` dan `npm run build` lolos.
- Uji manual: login admin, buat pengguna di `/users`, login sebagai pengguna itu
  dengan `Default1234`, pastikan diarahkan ke ganti sandi dan sandi baru tidak
  boleh `Default1234`.

## Catatan untuk yang melanjutkan

- Keamanan bergantung pada `mustChangePassword: true` saat pembuatan dan
  penolakan sandi baru yang sama dengan sandi lama
  (`app/(app)/change-password/actions.ts`). Jangan longgarkan salah satunya.
- Akun yang belum pernah login tetap bisa dimasuki siapa pun yang tahu sandi
  default, jadi segera minta pengguna baru login dan mengganti sandinya.
