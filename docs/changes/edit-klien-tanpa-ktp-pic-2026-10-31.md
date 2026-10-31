# Edit klien tanpa No. KTP PIC

- **Tanggal:** 2026-10-31
- **Branch:** `fix/edit-klien-tanpa-ktp-pic`
- **PR:** [#59](https://github.com/agussusanto17/lch-ins/pull/59)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

SIT-012 pada 30 Oktober 2026 mencatat bahwa klien tanpa No. KTP PIC tidak bisa
diedit. Untuk klien korporasi muncul pesan mentah "Invalid input: expected
string, received undefined" di isian No. KTP PIC. Untuk klien perorangan,
simpan gagal tanpa pesan apa pun.

Penyebabnya satu. Skema form klien mewajibkan `contactPersonIdNumber` berupa
string. Klien yang belum punya KTP PIC datang dari database sebagai
`undefined`, jadi validasi gagal sebelum format nomornya diperiksa. Untuk
perorangan, isian KTP PIC tidak ditampilkan, sehingga pesan error-nya tidak
terlihat dan form tetap terbuka tanpa penjelasan.

Masalah lain di SIT-012 (perubahan alamat tidak tercatat di audit, label isian
audit masih nama kolom Inggris) belum disentuh di sini.

## Yang berubah

- No. KTP PIC boleh kosong, termasuk saat nilainya `undefined` dari database.
- Format 16 digit hanya diperiksa untuk klien korporasi. Untuk perorangan
  isiannya tersembunyi dan nilainya memang tidak ikut dikirim ke server, jadi
  tidak diperiksa lagi. Ini juga mencegah simpan gagal diam-diam bila tipe
  klien diganti ke Perorangan setelah KTP PIC diisi salah.

## File utama

- `components/marketing/client-form.tsx`: skema validasi form klien.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`: lolos.
- `npm run build`: lolos.
- `npx eslint components/marketing/client-form.tsx`: lolos.
- Uji manual di localhost dengan akun admin uji, memakai dua klien uji SIT yang
  `contact_person_id_number`-nya kosong di database:
  - Bapak SIT Perorangan: Edit KYC lalu Simpan tanpa perubahan, muncul toast
    "Data klien diperbarui".
  - PT SIT Korporasi Uji: No. KTP PIC diisi "1234" lalu Simpan, muncul pesan
    "Nomor KTP harus 16 digit angka" di bawah isiannya dan data tidak
    tersimpan. Setelah isian dikosongkan, file NPWP diganti lalu Simpan,
    muncul toast "Data klien diperbarui" dan berkas NPWP bisa dibuka.

## Catatan untuk yang melanjutkan

- Pesan bawaan zod masih berbahasa Inggris ("Invalid input: ..."). Form lain
  bisa menampilkan pesan serupa bila ada isian yang nilainya tidak sesuai tipe.
  Error map zod berbahasa Indonesia bisa jadi perbaikan terpisah.
- Saat menguji, timestamp yang ditulis aplikasi di database lokal tercatat
  tujuh jam lebih awal dari waktu sebenarnya (`now() - updated_at` sekitar
  tujuh jam untuk baris yang baru disimpan). Database lokal memakai TimeZone
  Asia/Jakarta. Ini di luar perubahan ini dan belum diperbaiki.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
