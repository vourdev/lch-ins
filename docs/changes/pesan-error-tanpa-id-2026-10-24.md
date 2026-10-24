# Pesan Error dan Form Polis Tanpa ID

- **Tanggal:** 2026-10-24
- **Branch:** `fix/pesan-error-tanpa-id`
- **PR:** [#24](https://github.com/vourdev/lch-ins/pull/24)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Beberapa pesan error yang sampai ke pengguna memuat UUID, misalnya "Placing
Slip dengan ID 3f2a… tidak ditemukan." Sebagian juga masih berbahasa Inggris
("Claim not found: …"). Selain itu, form edit polis menampilkan UUID slip di
baris "Terhubung ke placing slip". Ini terjadi karena nomor slip dicari dari
store di browser, yang belum tentu terisi di halaman `/policies`.

Lanjutan dari [audit-trail-terbaca](audit-trail-terbaca-2026-10-24.md) dan
[dropdown-tampil-id](dropdown-tampil-id-2026-10-24.md). Aplikasi ini dipakai
pengguna awam, jadi ID tidak boleh tampil di layar.

## Yang berubah

- Pesan "tidak ditemukan" untuk klaim, placing slip, dan klien tidak lagi
  memuat ID dan semuanya berbahasa Indonesia:
  - "Klaim tidak ditemukan."
  - "Placing slip tidak ditemukan."
  - "Klien tidak ditemukan di database."
- Form edit polis menampilkan nomor slip dari server. Kalau nomor slip tidak
  ada, yang tampil hanya "Terhubung ke placing slip", tanpa ID.

## File utama

- `lib/server/claims.ts`, `lib/server/placing-slips.ts`: teks pesan error.
- `lib/server/policies.ts`:
  - `policyInclude` ikut mengambil `placingSlip.slipNo`;
  - record polis mendapat `placingSlipNo`.
- `lib/data/types.ts`: `Policy.placingSlipNo` (opsional).
- `components/policies/policy-form.tsx`: memakai `placingSlipNo` sebagai
  pengganti ID.

## Dampak

- **Database:** tidak ada migrasi.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`, `npx eslint`, dan `npm run build` lolos. Satu warning
  `_userId` di `claims.ts` sudah ada sebelum perubahan ini.
- Browser lokal (ego-browser): dialog edit polis menampilkan "Terhubung ke
  placing slip 004/LCH-PLCMT/PS-CAR/VII/2026" dan tidak ada teks UUID yang
  terlihat.
- Pencarian `throw new Error(` dengan interpolasi di `lib/`, `app/`, dan
  `server/`: pesan yang tersisa hanya memuat nama, kode, nomor polis, email,
  atau status, tidak ada ID.

## Catatan untuk yang melanjutkan

- Jangan memasukkan ID ke pesan error yang dikembalikan ke pengguna. Kalau ID
  diperlukan untuk debugging, tulis ke `console.error` di server.
- `placingSlipNo` hanya untuk ditampilkan. Nilai itu dibuang oleh skema Zod
  saat polis disimpan.
