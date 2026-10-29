# Field Terstruktur Kendaraan KBM dan Master Data Tarif OJK Lampiran IV

- **Tanggal:** 2026-10-29
- **Branch:** `feat/kbm-structured-fields-and-ojk-lampiran-4`
- **PR:** (diisi setelah PR dibuka)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code (Claude Fable 5)

## Latar belakang

Berdasarkan masukan langsung dari user operasional:
1. **Penghapusan Free-Text Textarea Kendaraan (Image 1)**: Kolom free-text textarea deskripsi kendaraan di form placing slip (`LineItemList`) sering membuat underwriter mengetik ulang merek dan tipe secara bebas, sehingga saat mencetak dokumen Placing Slip (`InterestBlock` di `doc-blocks.tsx`), nama merek/tipe muncul ganda (dobel). Kolom bebas ini diminta dihilangkan dan diganti dengan field-field terstruktur: Jenis / Model Detail, Tahun Pembuatan, Plat Nomor, No. Rangka / VIN, No. Mesin, dan Warna.
2. **Ketiadaan Tarif Baku OJK Lampiran IV di Master Data (Image 2)**: Pada tab "Tarif Baku OJK" di `/master-data`, belum terdapat sub-tab untuk SE OJK No. 6/SEOJK.05/2017 Lampiran IV (Kendaraan Bermotor). Tabel IV.A (Tarif Casco Comprehensive & TLO untuk Kategori 1–8 dan Wilayah 1–3) serta Tabel IV.B (Perluasan Jaminan Banjir, Gempa, SRCC, TS, TJH Pihak Ketiga, dan PA Pengemudi/Penumpang) belum dapat dilihat underwriter di panel master data.
3. **Bug Duplikasi Label "Zona Zona"**: Pada tabel tarif Gempa Bumi dan Banjir di master data, label zona ter-render ganda menjadi "Zona Zona 1" karena data sumber sudah mengandung kata "Zona".

## Yang berubah

- **Input Terstruktur Kendaraan Bermotor**:
  - Menggantikan input free-text multiline textarea pada baris interest item kendaraan dengan grid 6 field terstruktur: `vehicleModel` (Model / Jenis), `year` (Tahun Pembuatan), `licensePlate` (Plat Nomor), `chassisNumber` (No. Rangka / VIN), `engineNumber` (No. Mesin), dan `color` (Warna).
  - Deskripsi kanonik string tetap otomatis disinkronkan di background (`buildVehicleDescription`) sehingga tersimpan rapi pada kolom database `slip_items.description` tanpa memerlukan downtime atau migrasi skema database yang memecah kompatibilitas.
  - Parser dua arah yang tangguh (`parseVehicleDescription`) membaca data lama (format slash maupun titik tengah) ke field-field terstruktur saat slip dibuka kembali.
- **Deduplikasi Tampilan Dokumen Cetak (`doc-blocks.tsx`)**:
  - Menata ulang komponen `InterestBlock`: judul kendaraan mencakup merek, tipe, dan model detail (`[Brand, Type, Model] (Year)`), diikuti baris atribut rapi (`Plat: ... · No. Rangka: ... · No. Mesin: ... · Warna: ...`).
  - Tidak ada lagi pengulangan nama merek atau tipe kendaraan pada output cetak Placing Slip.
- **Integrasi Sub-Tab "Kendaraan Bermotor (Lamp. IV)" di Master Data**:
  - Menambahkan sub-tab `motor` di `/master-data` (Tarif Baku OJK).
  - Menyajikan **Tabel IV.A**: Tarif Baku Casco Comprehensive & Total Loss Only untuk Kategori 1 sampai 8 pada Wilayah 1, 2, dan 3 dengan batas persentase minimal dan maksimal.
  - Menyajikan **Tabel IV.B**: Tarif Baku Perluasan Jaminan KBM (Banjir, Gempa Bumi, SRCC, TS, TJH Pihak Ketiga lapis 1–3, dan Kecelakaan Diri Pengemudi & Penumpang).
  - Menampilkan badge batas biaya akuisisi / brokerage maksimal 25% sesuai ketentuan resmi OJK.
- **Perbaikan Duplikasi Label Zona**:
  - Menambahkan helper `formatZone` yang menormalisasi string zona sehingga tidak terjadi duplikasi "Zona Zona".

## File utama

- `lib/data/types.ts`: Menambahkan properti terstruktur kendaraan pada interface `LineItem`.
- `lib/data/ojk-motor.ts`: Ekspor `MOTOR_ACQUISITION_CAP_PCT = 25`, parser `parseVehicleDescription`, dan builder `buildVehicleDescription`.
- `lib/data/index.ts`: Re-export seluruh tipe dan fungsi dari `ojk-motor`.
- `app/(app)/underwriting/actions.ts`: Pembaruan Zod `lineItemSchema` untuk memvalidasi atribut terstruktur kendaraan.
- `lib/server/placing-slips.ts`: Deserialisasi deskripsi kendaraan ke objek terstruktur di `toPlacingSlipRecord` dan serialisasi kanonik di mutasi server.
- `components/underwriting/line-items.tsx`: Implementasi 6 form input terstruktur kendaraan menggantikan textarea bebas.
- `components/documents/doc-blocks.tsx`: Formatting bersih dan deduplikasi nama merek/tipe kendaraan pada layout dokumen.
- `components/master-data/tariff-ojk-tab.tsx`: Sub-tab Kendaraan Bermotor (Lamp. IV), Tabel IV.A, Tabel IV.B, badge akuisisi 25%, dan perbaikan format zona.
- `components/underwriting/slip-model.ts`: Sinkronisasi jawaban kendaraan SPPA ke field terstruktur `LineItem`.

## Dampak

- **Database:** Tidak ada migrasi skema database baru; memanfaatkan kolom `description` yang ada secara backward-compatible.
- **Env:** Tidak ada perubahan environment variable.
- **Deploy:** Standar Next.js build.

## Verifikasi

1. `npx tsc --noEmit`: Lolos tanpa error (0 issues).
2. `npm run build`: Lolos kompilasi Turbopack dan build produksi Next.js.
3. `ego-browser`:
   - Navigasi ke `/master-data` -> tab "Tarif Baku OJK" -> sub-tab "Kendaraan Bermotor (Lamp. IV)": Tabel IV.A dan IV.B tampil lengkap, badge 25% aktif, label "Zona Zona" teratasi (0 duplicate).
   - Navigasi ke `/underwriting/new` -> ganti COB ke Motor Vehicle: Field terstruktur (Merek, Tipe, Model/Jenis, Plat, Tahun, Warna, Rangka, Mesin) tampil presisi tanpa textarea bebas.
4. Unit parsing & serialisasi TSX: Lolos verifikasi dua arah (round-trip) untuk format baru dan format lama.

## Catatan untuk yang melanjutkan

- Format deskripsi kanonik menggunakan pemisah titik tengah (` · `) dengan awalan tag (`Model: ...`, `Thn: ...`, `Plat: ...`, `Rangka: ...`, `Mesin: ...`, `Warna: ...`).
- Jika kelak dibuat tabel terpisah `vehicle_details`, parser `parseVehicleDescription` dapat dijadikan skrip migrasi data historis dengan zero data loss.
