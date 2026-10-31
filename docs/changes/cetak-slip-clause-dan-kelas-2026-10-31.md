# Cetak slip: clause muncul, Wording Form di bawah Type of Cover, Class I/II/III

- **Tanggal:** 2026-10-31
- **Branch:** `fix/cetak-slip-clause-dan-kelas`
- **PR:** [#63](https://github.com/agussusanto17/lch-ins/pull/63)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Agus meninjau cetakan Placing Slip 005/LCH-PLCMT/PS-IAR/VIII/2026 pada
31 Oktober 2026 dan menemukan tiga hal:

1. Baris Wording Form ada di paling bawah tabel data, seharusnya tepat di
   bawah Type of Cover.
2. Construction Class tercetak "Kelas 2 (K2)", seharusnya "Class II" dengan
   angka romawi.
3. Clause tidak muncul sama sekali, padahal slip itu punya delapan clause di
   database.

Penyebab nomor 3: tabel `slip_clauses` menyimpan salinan judul dan wording
setiap clause. Saat slip dimuat, salinan itu hanya diteruskan untuk clause yang
diedit di slip (`clauseOverrides`). Clause lain dicari ke daftar data contoh
lama di `lib/data/clauses.ts`. Master clause sekarang sudah di database dan
id-nya tidak ada di daftar itu, jadi clause tersebut terbuang dan blok CLAUSES
tidak dirender.

## Yang berubah

- Data slip membawa `clauseCopies`, yaitu salinan semua clause dari
  `slip_clauses`. Dokumen cetak memakai salinan ini, sesuai aturan PRD bahwa
  wording clause disalin ke slip saat dipilih, sehingga perubahan master
  sesudahnya tidak mengubah slip.
- Wording Form dicetak tepat di bawah Type of Cover.
- Construction Class dicetak "Class I", "Class II", atau "Class III".
- Ketiga perubahan berlaku di keempat dokumen yang memakai tabel data yang sama:
  Placing Slip, Quotation Slip, Draft Cover Note, dan Closing Instruction.

## File utama

- `lib/server/placing-slips.ts`: `clauseCopies` dari `slip_clauses`.
- `lib/data/types.ts`: field `clauseCopies` di `PlacingSlip`.
- `components/documents/doc-blocks.tsx`: urutan baris tabel data dan clause
  dari salinan slip.
- `lib/data/reference.ts`: label kelas konstruksi untuk dokumen.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`: lolos.
- `npm run build`: lolos.
- `npx eslint` pada file yang diubah: lolos.
- HTML hasil render server keempat dokumen slip 005/LCH-PLCMT/PS-IAR/VIII/2026
  diambil di localhost dengan sesi akun uji:
  - Urutan baris: Type of Cover, Wording Form, Insured Name, Correspondence
    Address, lalu baris lainnya.
  - Construction Class tercetak "Class II".
  - Blok CLAUSES berisi sembilan butir, yaitu Munich Re Property All Risks
    Wording ("As Attached") dan delapan clause slip. Placing Slip juga
    memuat lampiran CLAUSE WORDING.

## Catatan untuk yang melanjutkan

- Dropdown kelas konstruksi di form slip masih memakai daftar di
  `lib/data/reference.ts` ("Kelas 1/2/3"), belum dari master
  `lookup_values`. Label "Class" hanya dipakai di dokumen cetak.
- Clause picker di form slip belum memakai `clauseCopies` dan tetap membaca
  master clause.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
