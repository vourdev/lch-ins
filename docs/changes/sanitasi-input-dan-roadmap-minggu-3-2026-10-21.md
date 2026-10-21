# Sanitasi Input Numerik Form & Analisis Roadmap Minggu 3

- **Tanggal:** 2026-10-21
- **Branch:** `fix/validasi-input-numerik-dan-roadmap-m2-m3`
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

1. Berdasarkan hasil audit frontend (`/frontend-code-review`), ditemukan sejumlah field formulir yang seharusnya hanya menerima input angka/numerik masih mengizinkan pengguna mengetik karakter alfabet atau string sembarang (misalnya nomor KTP PIC, nomor identitas nasabah, nomor rekening bank, dan nomor urut). Hal ini dapat menyebabkan data tidak bersih sebelum divalidasi oleh Zod di server.
2. Diperlukan dokumentasi resmi dan terstruktur yang merangkum pencapaian 5 modul fondasi Minggu 2 yang telah 100% selesai, sekaligus menjabarkan analisis arsitektur dan rencana kerja untuk modul Minggu 3 (*Placing slip, rate dan premium, klausula, dan tarif OJK*).

## Yang berubah

- **Komponen Input Dasar (`components/shared/form-fields.tsx`)**:
  - Menambahkan dukungan prop `digitsOnly`, `numericOnly`, dan `maxLength` pada komponen `TextField`.
  - Mengimplementasikan `handleChange` yang langsung menyaring karakter non-angka pada event `onChange` sebelum masuk ke state React component.

- **Penerapan Sanitasi Input pada Formulir**:
  - `components/marketing/client-form.tsx`:
    - No. KTP PIC: `digitsOnly={true}`, `maxLength={16}`, `inputMode="numeric"`.
    - Nomor Identitas Klien: `digitsOnly={draft.idType === "KTP"}`, `maxLength={draft.idType === "KTP" ? 16 : 30}`.
    - NPWP Korporasi & Perorangan: Filter karakter angka, titik, dan strip (`/[^0-9.-]/g`), `maxLength={20}`.
    - Nomor Telepon: Format tel resmi (`type="tel"`).
  - `components/marketing/sppa-form.tsx` & `lib/data/sppa.ts`:
    - Pertanyaan bertipe angka per COB (misal: *Jumlah lantai* properti dan *Jumlah tertanggung* Personal Accident) dilengkapi flag `digitsOnly`.
  - `components/master-data/finance-docs-tab.tsx`:
    - Nomor rekening bank operasional LCH disaring hanya angka dan tanda hubung (`/[^0-9-]/g`), `maxLength={30}`.
  - `components/master-data/lookup-values-tab.tsx`:
    - Input nomor urutan tampil (*sort order*) diproteksi integer non-negatif (`min={0}`, `step={1}`, regex non-digit).
  - `components/master-data/insurers-adjusters-tab.tsx`:
    - Nomor telepon rekanan asuransi & adjuster disaring karakter telepon (`/[^0-9+() -]/g`).
  - `components/master-data/cob-cover-tab.tsx`:
    - Kode COB 2 digit disaring hanya digit angka (`replace(/\D/g, "")`).

- **Dokumentasi Roadmap & Analisis (`docs/roadmap/analisa-modul-minggu-2-dan-3.md`)**:
  - Rangkuman checklist 5 modul fondasi Minggu 2 (Master Data, User Role, Audit Trail, Data Klien, Form SPPA).
  - Analisis mendalam modul Minggu 3: Arsitektur Placing Slip PostgreSQL, Rate & Premium Engine, Validasi Tarif Baku OJK (SE OJK No. 06/SEOJK.05/2017) beserta Rate Exception Guard, Pustaka Klausula Baku, dan tahapan roadmap eksekusi.

## File utama

- `components/shared/form-fields.tsx`: Komponen TextField dengan sanitasi numerik seketika.
- `components/marketing/client-form.tsx`: Sanitasi input KTP, NPWP, dan nomor kontak klien.
- `components/marketing/sppa-form.tsx`: Sanitasi pertanyaan angka per COB pada form SPPA.
- `lib/data/sppa.ts`: Definisi atribut tipe numerik pada daftar pertanyaan SPPA.
- `components/master-data/finance-docs-tab.tsx`: Sanitasi nomor rekening bank LCH.
- `components/master-data/lookup-values-tab.tsx`: Sanitasi urutan tampil lookup values.
- `components/master-data/insurers-adjusters-tab.tsx`: Sanitasi nomor telepon rekanan.
- `components/master-data/cob-cover-tab.tsx`: Sanitasi kode COB 2 digit.
- `docs/roadmap/analisa-modul-minggu-2-dan-3.md`: Dokumentasi komprehensif Minggu 2 & Minggu 3.

## Dampak

- **Database:** Tidak ada migrasi skema database baru.
- **Env:** Tidak ada variabel env baru.
- **Deploy:** Standar deployment Vercel melalui sinkronisasi branch `main`.

## Verifikasi

- `npx tsc --noEmit`: 0 error TypeScript.
- `npm run build`: Kompilasi Turbopack Next.js 16.2.6 sukses untuk 69/69 rute.
- `graphify update .`: Knowledge graph codebase berhasil diperbarui.

## Catatan untuk yang melanjutkan

- Setiap penambahan formulir baru yang membutuhkan input angka (seperti nilai pertanggungan, persentase share co-insurance, hari kredit, atau nomor telepon) wajib menggunakan komponen `NumberField` (untuk mata uang/persentase) atau `TextField` dengan prop `digitsOnly`/`numericOnly`.
- Rencana kerja Minggu 3 dapat langsung dimulai dari Tahap 1: pembuatan server data layer `lib/server/placing-slips.ts` dan Server Actions di `app/(app)/underwriting/actions.ts`.
