# Validasi duplikat nama klien dialihkan ke server saat edit dan tambah

- **Tanggal:** 2026-10-25
- **Branch:** `fix/edit-klien-duplikat-nama`
- **PR:** #28
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Ditemukan bug saat mencoba mengedit data klien di `/marketing`:
- Mengedit klien hasil seed selalu ditolak dengan pesan error "Klien dengan nama ini sudah terdaftar".
- Penyebab: `components/marketing/client-form.tsx` sebelumnya memeriksa duplikasi nama di sisi klien menggunakan koleksi in-memory mock `useCollection("clients")` dari `lib/store.ts`. ID klien di database PostgreSQL berbeda dengan ID klien contoh mock, sehingga pengecekan `c.id !== draft.id` menganggap klien yang sedang diedit adalah baris berbeda yang memiliki nama sama.

## Yang berubah

- Pengecekan nama duplikat di sisi klien pada `components/marketing/client-form.tsx` dihapus.
- Validasi keunikan nama klien sepenuhnya diserahkan ke server (`createClient` dan `updateClient` di `lib/server/clients.ts` via server actions):
  - Saat membuat klien baru: server memastikan tidak ada klien lain dengan nama yang sama (case-insensitive).
  - Saat mengubah klien yang sudah ada: server mengecualikan ID klien yang bersangkutan (`id: { not: existing.dbId }`), sehingga nama klien dapat disimpan tanpa memicu false-positive duplikat.
  - Jika nama memang bentrok dengan klien lain di database, server action mengembalikan error yang ditampilkan rapi melalui toast Sonner dan form tetap terbuka agar user dapat memperbaiki.

## File utama

- `components/marketing/client-form.tsx`: hapus pengecekan duplikat berbasis mock store dan import `useCollection` yang tidak lagi dipakai.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan khusus.

## Verifikasi

- `npx tsc --noEmit` dan `npm run build` berhasil tanpa error.
- ESLint pada `components/marketing/client-form.tsx` bersih.
- Pengujian E2E (ego-browser):
  - Edit klien hasil seed ("PT Anugerah Retail Indonesia") tanpa mengubah nama: berhasil disimpan, toast sukses muncul, drawer tertutup.
  - Edit klien tersebut dan ubah namanya menjadi nama klien lain yang sudah ada ("PT Bahtera Samudra Line"): server menolak dengan pesan `Klien dengan nama "PT Bahtera Samudra Line" sudah terdaftar.`, drawer tetap terbuka.

## Catatan untuk yang melanjutkan

- Pemeriksaan duplikasi pada entitas yang tersimpan di PostgreSQL sebaiknya selalu divalidasi di level database / server action, bukan terhadap mock memory store.
- Catatan terkait:
  - [audit-trail-log-dropdown-kendaraan-2026-10-25.md](audit-trail-log-dropdown-kendaraan-2026-10-25.md)
