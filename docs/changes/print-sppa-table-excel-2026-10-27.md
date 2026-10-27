# Cetak Daftar SPPA Format Spreadsheet Excel

- **Tanggal:** 2026-10-27
- **Branch:** `feat/print-sppa-table-excel`
- **PR:** #31
- **Dikerjakan oleh:** ZoD3V dengan Claude

## Latar belakang

Permintaan dari operasional LCH: pada modul Marketing tab SPPA, mekanisme cetak untuk keseluruhan tabel SPPA diinginkan dalam format spreadsheet menyerupai Microsoft Excel (grid tegas, sel bergaris penuh, header abu-abu rapat, angka rata kanan tabular, dan total akumulasi) agar mudah dibaca saat rekap fisik atau di-export ke PDF. Sebelumnya tombol print di toolbar SPPA belum terhubung ke route print dedicated daftar SPPA (hanya print bawaan layar paginasi).

## Yang berubah

- **Komponen Dokumen Excel SPPA (`SppaExcelDocument`):**
  - Grid tabel cetak A4/arsip dengan border sel penuh (`border-collapse`, `border border-neutral-400 dark:border-neutral-600`).
  - Header abu-abu padat (`bg-neutral-100`) dengan tipografi kompak (`text-[10.5px]`).
  - Nilai pertanggungan rata kanan dengan font monospace tabular nums (`font-mono tabular-nums`).
  - Status SPPA ditampilkan sebagai badge jelas (Submitted / Draft / Approved / Rejected).
  - Bagian `tfoot` menghitung total nilai pertanggungan terakumulasi per mata uang dengan garis akuntansi ganda (`border-b-4 border-double`).
- **Route Print Baru Server Component (`app/(print)/marketing/sppa/page.tsx`):**
  - Menerima `searchParams` filter: pencarian query `q`, `status`, `cob`, dan `clientId`.
  - Mengambil data langsung dari server via `listSppa` sehingga seluruh data terfilter masuk ke halaman cetak tanpa terpotong paginasi layar.
- **Dukungan Lebar Dokumen (`DocumentShell`):**
  - Menambahkan properti `wide?: boolean` dengan batas `max-w-[1100px]` untuk tabel rekonsiliasi/rekap multi-kolom, menjaga kontainer `max-w-[900px]` untuk formulir KYC/surat reguler.
- **Koneksi Toolbar SPPA ke Cetak:**
  - `ExportButtons` pada `SppaTable` kini menerima `printHref` dinamis yang sinkron dengan pencarian aktif (`/marketing/sppa?q=...`), memastikan aksi cetak membuka dokumen rekap lengkap.
- **Dokumentasi Bisnis Proses LCH (`docs/alur-kerja-sistem.md`):**
  - Ekspor panduan end-to-end proses bisnis pialang asuransi LCH (Master Data, Klien, SPPA, Slip Penutupan, Polis, Finance, Klaim, Renewal Notice, Matriks RBAC).

## File utama

- `components/documents/sppa-documents.tsx`: Implementasi komponen tabel cetak `SppaExcelDocument`.
- `app/(print)/marketing/sppa/page.tsx`: Server Component halaman print `/marketing/sppa`.
- `components/documents/document-shell.tsx`: Penambahan opsi kontainer lebar `wide`.
- `components/marketing/sppa-table.tsx`: Pengkabelan dynamic `printHref` pada `ExportButtons`.
- `docs/alur-kerja-sistem.md`: Dokumentasi alur kerja sistem dan bisnis operasional LCH.

## Dampak

- **Database:** Tidak ada perubahan skema atau migrasi data.
- **Env:** Tidak ada variabel baru.
- **Deploy:** Deploy standar melalui GitHub Actions / Vercel.

## Verifikasi

- `npx tsc --noEmit`: 0 error.
- `npm run build`: Berhasil tanpa warning.
- `npx eslint .`: Bersih (0 problem).
- Pengujian end-to-end via headless Chromium CDP (`ego-browser`):
  - Memverifikasi rendering tabel spreadsheet di `/marketing/sppa`.
  - Memverifikasi filter query search query bekerja dan tampil di judul dokumen.
  - Memverifikasi penjajaran angka tabular, garis grid, badge status, dan akumulasi footer per currency.
  - Memverifikasi output PDF cetak via `Page.printToPDF` menghasilkan layout A4 1 halaman presisi tanpa overflow.

## Catatan untuk yang melanjutkan

- Komponen `SppaExcelDocument` dapat digunakan kembali atau menjadi acuan untuk cetak rekap modul lain (misal daftar Polis atau daftar Klaim) jika diinginkan format serupa spreadsheet.
- Route print tunggal SPPA format KYC tetap berada di `/marketing/sppa/[id]`, sedangkan `/marketing/sppa` menangani cetak tabel keseluruhan.
