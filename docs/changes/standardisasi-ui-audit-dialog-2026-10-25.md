# Standardisasi dropdown Audit Trail dan perbaikan header dialog/sheet

- **Tanggal:** 2026-10-25
- **Branch:** `fix/standardisasi-ui-audit-dialog`
- **PR:** #26
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
  maksimal 90vh. Kolom tabel dibagi Isian 1/4, Sebelum 3/8, Sesudah 3/8, dan
  tabelnya `table-fixed` supaya di layar HP kolom Sesudah tidak terpotong.
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
- **Kolom Sesudah hilang di HP** (ditemukan saat uji end to end): tabel
  `table-auto` melebar mengikuti isi terpanjang (398px di wadah 340px), dan
  wadahnya `overflow-hidden`, jadi kolom terakhir terpotong.
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
- Uji end to end di browser lokal (ego-browser, viewport 1194px kecuali
  disebut lain):
  - `/audit-trail`: trigger filter aksi dan modul sama dengan `/users`
    (tinggi 32px, radius dan font 14px sama), punya `aria-label`, tanpa label
    inline. Filter Hapus: 100 → 18 log, semua baris Hapus. Ditambah modul
    Polis: 6 log. Filter tanggal dari 23 Okt: 3 log; rentang 23–22 Okt: 0 log
    dengan pesan kosong; hanya 22 Okt: 3 log. Reset Filter mengembalikan semua
    filter dan 100 log.
  - Popup detail: 896×671px (90vh), kolom 212/317/317px, teks header berakhir
    di x=989 dan tombol close mulai di x=997. Isi bisa di-scroll sampai baris
    terakhir. Tutup lewat X dan Escape berjalan, fokus kembali ke tombol
    Detail.
  - Viewport 390px: filter tidak meluber (lebar dokumen 390px), popup tidak
    bertumpuk dengan tombol close, dan ketiga kolom tabel muat setelah
    perbaikan `table-fixed`.
  - Master Data → Nilai Pilihan Dropdown: trigger kategori sama dengan pola
    filter lain, opsi tampil sebagai nama, dan memilih Daftar Bank mengganti
    isi tabel.
  - Drawer Tambah Polis (`FormDrawer`): padding kanan header 56px, teks
    berakhir di x=1138 dan tombol X mulai di x=1146.
  - Sheet Softcopy Polis: lebar 448px (`max-w-md`, sebelumnya tertahan 384px),
    header tidak bertumpuk dengan X.

## Catatan untuk yang melanjutkan

- Dialog kata sandi sementara tidak diuji di browser karena memicunya berarti
  mereset kata sandi akun. Perubahannya hanya kelas lebar.

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
