# Standardisasi dropdown Audit Trail dan perbaikan header dialog/sheet

- **Tanggal:** 2026-10-25
- **Branch:** `fix/standardisasi-ui-audit-dialog`
- **PR:** #<nomor> (isi setelah PR dibuka)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Audit UI dari user menemukan tiga masalah di Audit Trail:

1. Dropdown filter Audit Trail berbentuk pill dengan label "Aksi:" / "Modul:"
   di dalamnya, beda dengan dropdown filter modul lain (misalnya Pengguna).
2. Di popup detail log, tanggal tertutup tombol close (X).
3. Popup detail terlalu sempit, sehingga tabel perubahan sulit dibaca.

Modul lain diperiksa untuk masalah serupa, lalu ikut diperbaiki.

## Yang berubah

- **Filter Audit Trail** sekarang memakai pola yang sama dengan Pengguna,
  Database Polis, Klien, Slip, dan Klaim: `SelectTrigger size="sm"` dengan
  lebar tetap, `aria-label`, item dibungkus `SelectGroup`, tanpa label teks di
  dalam pill. Input tanggal "Dari" dan "Sampai" dipisah tanda `–` dan diberi
  `aria-label`.
- **Master Data → Pilihan (lookup values):** dropdown kategori memakai pola
  yang sama dan menampilkan nama kategori lewat `items`, bukan label inline.
- **Header dialog dan sheet** (`DialogHeader`, `SheetHeader`) sekarang
  menyisakan ruang di kanan untuk tombol close, jadi judul, tanggal, atau
  deskripsi panjang tidak lagi tertimpa tombol X. Berlaku untuk semua dialog
  dan drawer form.
- **Popup detail Audit Trail** melebar sampai `max-w-4xl` (896px) dan tinggi
  maksimal 90vh. Kolom tabel dibagi Isian 1/4, Sebelum 3/8, Sesudah 3/8.
- **Softcopy Polis (sheet)** sekarang benar-benar memakai lebar `max-w-md`.
  Sebelumnya override lebarnya kalah oleh lebar bawaan sheet.
- **Dialog kata sandi sementara:** `max-w-md` diganti `sm:max-w-md`. Kelas
  lama tidak berefek, dan yang baru sama dengan dialog lain.

## Akar masalah

- **Lebar popup:** `DialogContent` bawaan memakai `sm:max-w-md`, sedangkan
  override `max-w-2xl` tidak punya prefix `sm:`. tailwind-merge tidak
  menganggap keduanya bentrok, jadi di layar ≥640px popup tetap 448px. Pola yang
  sama terjadi di sheet: `data-[side=right]:sm:max-w-sm` bawaan mengalahkan
  `sm:max-w-md`. Override lebar harus memakai varian yang sama dengan kelas
  bawaannya.
- **Tanggal tertutup:** tombol close diposisikan `absolute top-4 right-4`
  (menempati 16–48px dari kanan), tapi header tidak menyisakan ruang untuk itu.
- **Dropdown beda:** filter Audit Trail dibuat sendiri dengan kelas pill dan
  label inline, bukan memakai pola filter yang sudah ada.

## File utama

- `components/ui/dialog.tsx`, `components/ui/sheet.tsx`: header menyisakan
  ruang untuk tombol close (`pr-8` di dialog, `pr-14` di sheet).
- `components/audit/audit-diff-dialog.tsx`: lebar dan tinggi popup, kolom tabel.
- `components/audit/audit-table.tsx`: filter aksi, modul, dan tanggal.
- `components/master-data/lookup-values-tab.tsx`: dropdown kategori.
- `components/shared/form-drawer.tsx`, `components/policies/policy-files-sheet.tsx`:
  padding header tidak lagi menimpa ruang tombol close; lebar sheet softcopy.
- `components/users/temporary-password-dialog.tsx`: kelas lebar dialog.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan. Setelah merge, sinkronkan fork
  seperti biasa.

## Verifikasi

- `npx tsc --noEmit` lolos, `npx eslint` pada file yang diubah bersih,
  `npm run build` lolos.
- Browser lokal (viewport 1194px), halaman `/audit-trail`:
  - trigger filter aksi dan modul tingginya 32px, font 14px, punya
    `aria-label`, dan tidak ada lagi label inline;
  - popup detail lebarnya 896px, menampilkan 13 baris perubahan; teks header
    berakhir di x=989, tombol close mulai di x=997, jadi tidak bertumpuk.

## Catatan untuk yang melanjutkan

- Override lebar `DialogContent` pakai `sm:max-w-*`. Override lebar sheet sisi
  kanan pakai `data-[side=right]:sm:max-w-*`. Tanpa varian yang sama, override
  diam-diam tidak berlaku.
- Kalau header dialog atau sheet diberi padding sendiri, jangan pakai `px-*`
  atau `p-*` di `SheetHeader`, karena itu menghapus `pr-14` bawaan. Pakai
  `py-*` saja (lihat `form-drawer.tsx`), atau tulis ulang `pr-14` seperti di
  `audit-diff-dialog.tsx`.
- Toolbar kartu di tab Master Data (`rounded-lg border bg-card p-3.5`) sengaja
  dipertahankan karena itu konvensi di modul tersebut. Yang diseragamkan hanya
  dropdown-nya.
