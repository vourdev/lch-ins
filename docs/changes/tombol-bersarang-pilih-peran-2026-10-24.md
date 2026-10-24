# Tombol Bersarang di Pilihan Peran

- **Tanggal:** 2026-10-24
- **Branch:** `fix/tombol-bersarang-pilih-peran`
- **PR:** [#21](https://github.com/vourdev/lch-ins/pull/21)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Pilihan peran di form tambah/edit pengguna memunculkan error React
`<button> cannot contain a nested <button>` begitu ada peran yang dipilih.
Tombol X "Kosongkan pilihan" berada di dalam tombol trigger popover, padahal
HTML tidak mengizinkan tombol di dalam tombol.

## Yang berubah

- Tombol X dipindah keluar dari trigger dan diletakkan absolut di atasnya,
  di posisi yang sama seperti sebelumnya (kiri ikon panah).
- Trigger menyisakan ruang kosong selebar tombol X supaya badge peran tidak
  tertimpa.
- Perilaku tidak berubah: klik X mengosongkan pilihan tanpa membuka popover.

## File utama

- `components/users/role-multi-select.tsx`

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`, `npx eslint`, dan `npm run build` lolos.
- Uji browser di `/users`: buka "Tambah Pengguna", pilih Marketing dan Teknik.
  Tombol X muncul di dalam kotak trigger dan tidak bersarang di `<button>`.
  Klik X mengembalikan isi trigger ke "Pilih peran…". Log dev server bersih
  dari error tombol bersarang dan hydration.

## Catatan untuk yang melanjutkan

- Posisi X (`right-8`) mengikuti padding trigger (`px-3`), lebar ikon panah,
  dan jarak antar ikon. Kalau salah satunya diubah, sesuaikan juga `right-8`.
