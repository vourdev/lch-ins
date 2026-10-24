# Teks UI Sandi Awal Default1234

- **Tanggal:** 2026-10-24
- **Branch:** `fix/teks-sandi-default`
- **PR:** [#20](https://github.com/vourdev/lch-ins/pull/20)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Sejak [password-default-pengguna-baru-2026-10-24.md](password-default-pengguna-baru-2026-10-24.md),
pembuatan pengguna dan reset sandi memakai sandi awal `Default1234`. Uji end to
end di browser menemukan teks UI yang masih menggambarkan sandi acak.

## Yang berubah

- Konfirmasi reset sandi di `/users` kini menyebut sandi akan dikembalikan ke
  `Default1234`, bukan "membuat kata sandi sementara baru".
- Notifikasi setelah reset: "Kata sandi berhasil direset ke sandi awal."
- Dialog sandi tidak lagi berkata "hanya ditampilkan satu kali", karena
  sandinya selalu sama. Deskripsinya kini "Sandi awal untuk akun ...".

## File utama

- `components/users/user-table.tsx`
- `components/users/temporary-password-dialog.tsx`

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`, `eslint`, dan `npm run build` lolos.
- Uji manual: di `/users`, buka aksi baris lalu Reset Kata Sandi. Cek teks
  konfirmasi, notifikasi, dan dialog hasil.

## Catatan untuk yang melanjutkan

- Teks "kata sandi sementara" di form ganti sandi (`components/auth/`) sengaja
  dibiarkan: sandi itu memang sementara sampai pengguna menggantinya.
