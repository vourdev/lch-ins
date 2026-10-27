# Alur Kerja dan Proses Bisnis Sistem Back Office LCH

Dokumen ini menjelaskan proses bisnis operasional **PT. LCH Insurance Brokers** dan panduan *step-by-step* pengoperasian sistem back office mulai dari input klien baru hingga klaim dan perpanjangan polis.

---

## 1. Peran dan Posisi LCH dalam Ekosistem Asuransi

**PT. LCH Insurance Brokers** adalah perusahaan **Pialang Asuransi (Insurance Broker)** resmi yang terdaftar dan diawasi oleh **Otoritas Jasa Keuangan (OJK)** serta anggota **APPARINDO** (No. 237-2016).

### Prinsip Utama Pialang:
- **LCH mewakili kepentingan Klien (Tertanggung/Insured)**, bukan perusahaan asuransi (*underwriter/insurer*).
- LCH tidak menanggung risiko sendiri, melainkan menganalisis kebutuhan risiko klien, mencari penawaran terbaik dari beberapa asuransi rekanan, membantu negosiasi syarat & tarif premi, serta mendampingi klien saat proses klaim hingga ganti rugi cair.

---

## 2. Diagram Siklus Hidup Dokumen dan Transaksi

```
┌────────────────────────────────────────────────────────────────────────┐
│                        0. Master Data (Admin)                         │
│       • Asuransi Rekanan    • Class of Business (COB)   • Klausula     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   1. Input Data Klien & KYC (Marketing)                │
│       • Korporasi / Perorangan                                         │
│       • Kepatuhan KYC OJK (NPWP, KTP, Tujuan Asuransi, Sumber Dana)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         2. Input SPPA (Marketing)                      │
│       • Surat Permintaan Penutupan Asuransi dari Klien                 │
│       • Nilai Pertanggungan, Objek Risiko, Kuesioner COB              │
│       • Output: Form KYC bilingual + Ringkasan SPPA (Cetak PDF)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    3. Placing Slip (Underwriting)                      │
│       • Penawaran ke Asuransi Rekanan (Single / Konsorsium)            │
│       • Rate Premi, Komisi Pialang (Brokerage), Klausula Proteksi      │
│       • Status: Draft -> Released -> Quoted -> Closed                 │
│       • (Opsi): Penerbitan Cover Note Sementara                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   4. Pencatatan Polis Resmi (Underwriting)             │
│       • Penerbitan Nomor Polis Resmi dari Asuransi Rekanan             │
│       • Lampiran Dokumen Polis, Jadwal Pembayaran                      │
│       • Perubahan berjalan: Endorsement / Pembatalan                   │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌───────────────────────────────┐  ┌─────────────────────────────────────┐
│  5. Finance & Penagihan       │  │  6. Klaim & Renewal (Operasional)   │
│  • Debit Note (ke Klien)      │  │  • Lapor & Dampingi Klaim           │
│  • Credit Note (ke Asuransi)  │  │  • Monitoring Renewal Notice        │
│  • Settlement Premi           │  │    (Cetak Surat Perpanjangan Polis) │
└───────────────────────────────┘  └─────────────────────────────────────┘
```

---

## 3. Alur Kerja Langkah Demi Langkah (Step-by-Step)

### Tahap 0: Persiapan Master Data *(Hanya Perlu Diawal oleh Admin)*
Sebelum modul operasional digunakan, data referensi di menu **Master Data** harus siap:
1. **Perusahaan Asuransi (Insurers):** Daftar asuransi mitra LCH (contoh: PT Asuransi Astra Buana, PT Asuransi Jasa Indonesia, PT Zurich Asuransi Indonesia, dll).
2. **Class of Business (COB) & Type of Cover:** Lini bisnis asuransi (Property, Motor Vehicle, Marine Cargo, Marine Hull, Engineering, Liability, Personal Accident, dll).
3. **Pustaka Klausula (Clauses):** Klausula standar perluasan jaminan dan pengecualian polis.
4. **Master Kendaraan:** Merek dan tipe kendaraan (khusus COB Motor Vehicle).

---

### Tahap 1: Registrasi Klien & Kepatuhan KYC *(Marketing -> Database Klien)*
Setiap calon nasabah wajib didaftarkan terlebih dahulu untuk memenuhi standar kepatuhan KYC (*Know Your Customer*) OJK.

1. Buka menu **Marketing** > tab **Database Klien** > klik tombol **+ Tambah Klien**.
2. Pilih **Tipe Klien**:
   - **Korporasi (Badan Usaha):**
     - Nama Perusahaan / Lembaga
     - Nomor Pokok Wajib Pajak (NPWP)
     - Alamat Kantor / Perusahaan
     - Alamat Korespondensi / Pabrik
     - Nama PIC (Person in Charge) dan Nomor KTP PIC
     - Kontak resmi (Email dan Nomor Telepon)
   - **Perorangan (Individu):**
     - Nama Lengkap (sesuai identitas resmi)
     - Tempat & Tanggal Lahir
     - Nomor KTP / SIM / Paspor
     - Alamat Domisili
     - Nomor Telepon
     - Sumber Penghasilan (Hasil Usaha, Gaji Bulanan, Wirausaha, atau Lain-lain)
3. Lengkapi **Kepatuhan Asuransi**:
   - Pilih **Tujuan Menutup Asuransi** (Perlindungan Aset, Syarat Kredit Bank/Leasing, dll).
   - Lampirkan salinan dokumen identitas (Copy KTP / NPWP).
4. Klik **Simpan**. Klien tersimpan dengan status `Prospect` atau `Active`.

---

### Tahap 2: Pengisian SPPA *(Marketing -> SPPA)*
SPPA (*Surat Permintaan Penutupan Asuransi*) adalah surat permohonan resmi dari klien yang merinci objek yang ingin diasuransikan.

1. Buka menu **Marketing** > tab **SPPA** > klik tombol **+ Tambah SPPA**.
2. Pilih **Klien** yang sudah dibuat di Tahap 1.
3. Isi parameter pertanggungan pokok:
   - **Class of Business (COB):** Jenis asuransi yang dibutuhkan.
   - **Nama Tertanggung (Insured Name):** Sesuai nama klien atau pihak berkepentingan (misal: *PT Delta Manufaktur QQ PT Bank Mandiri (Persero) Tbk*).
   - **Nilai Pertanggungan (Sum Insured):** Nilai total aset/objek yang dipertanggungkan.
   - **Mata Uang:** IDR, USD, EUR, SGD, dll.
   - **Periode Asuransi:** Tanggal mulai s.d. tanggal berakhir proteksi.
   - **Lokasi Risiko:** Alamat fisik aset atau rute pengiriman (khusus Marine Cargo).
4. Isi **Kuesioner Tambahan Spesifik COB**:
   - **Motor Vehicle:** Merek, tipe kendaraan, nomor polisi, nomor rangka/mesin, jenis penggunaan (pribadi/komersial).
   - **Property:** Konstruksi bangunan (kelas 1/2/3), jumlah lantai, okupasi/kegiatan industri, alat pemadam kebakaran (hydrant, sprinkler, APAR).
5. Klik **Simpan**.
6. **Cetak Dokumen SPPA & KYC:**
   - Di baris tabel SPPA, buka menu aksi **Cetak SPPA**.
   - Sistem menghasilkan dokumen 2 halaman:
     - **Halaman 1:** Formulir KYC standar LCH lengkap dengan logo resmi, pita navy, isian data klien, checkbox otomatis, dan kolom tanda tangan.
     - **Halaman 2:** Ringkasan rincian SPPA dan jawaban kuesioner risiko.
   - Dokumen ini dicetak/dikirim ke klien untuk ditandatangani.

---

### Tahap 3: Pembuatan Placing Slip & Penempatan ke Asuransi *(Underwriting)*
Setelah SPPA disetujui klien, tim Underwriting menyusun *Placing Slip* untuk ditawarkan ke perusahaan asuransi rekanan.

1. Buka menu **Underwriting** > klik **+ Buat Placing Slip**.
   *(Bisa ditarik langsung dari data SPPA yang sudah ada agar tidak perlu mengetik ulang).*
2. Tentukan **Struktur Penanggung (Security Panel)**:
   - **Single Underwriter:** 100% risiko diambil oleh 1 asuransi (misal Asuransi Astra 100%).
   - **Ko-asuransi (Co-insurance/Konsorsium):** Risiko dibagi ke beberapa asuransi (misal Leader: Asuransi Astra 60%, Member: Asuransi Jasindo 40%).
3. Masukkan **Kondisi Finansial**:
   - **Rate Premi:** Persentase premi (persen atau per mil).
   - **Brokerage (%):** Persentase komisi pialang untuk LCH.
4. Pilih **Klausula Tambahan (Clauses)**: Tambahkan klausula perlindungan yang relevan dari master data klausula.
5. **Alur Status Placing Slip:**
   - `Draft`: Dokumen sedang disusun oleh tim underwriting.
   - `Released`: Placing slip diterbitkan dan dikirim ke pihak asuransi.
   - `Quoted`: Asuransi membalas dengan penawaran resmi (*quotation*).
   - `Closed`: Klien dan asuransi sepakat atas syarat dan besaran premi (*Deal*).
6. *(Opsional)* **Cover Note:** Jika klien membutuhkan bukti proteksi segera sementara polis definitif masih dalam proses cetak di asuransi, tim Underwriting dapat mencetak *Cover Note*.

---

### Tahap 4: Penerbitan dan Pencatatan Polis Resmi *(Policy Database)*
Ketika kesepakatan tercapai dan dokumen polis dari asuransi terbit, data dimasukkan ke dalam database polis aktif.

1. Buka menu **Policy Database** > klik **+ Tambah Polis** (atau dikonversi langsung dari Placing Slip yang berstatus `Closed`).
2. Masukkan rincian polis definitif:
   - **Nomor Polis:** Nomor resmi yang diterbitkan oleh perusahaan asuransi rekanan.
   - Hubungkan ke Klien, Placing Slip, COB, dan Asuransi Penanggung.
   - Masukkan nominal premi final, biaya administrasi, dan bea meterai.
   - Unggah berkas salinan polis (*softcopy PDF*).
3. Simpan polis. Status polis kini menjadi **Active**.
4. **Perubahan Selama Periode Polis Berjalan:**
   - **Endorsement:** Tambahan/perubahan klausula, perubahan uang pertanggungan, penambahan unit armada, atau perubahan alamat risiko.
   - **Cancellation:** Pembatalan polis sebelum masa berlaku berakhir.

---

### Tahap 5: Penagihan dan Keuangan *(Finance)*
Pengelolaan arus kas premi antara Klien, LCH, dan Asuransi Penanggung.

1. **Debit Note (DN):**
   - Diterbitkan oleh LCH dan ditujukan kepada **Klien**.
   - Berisi tagihan total premi kotor (*Gross Premium*) + biaya polis/meterai yang harus dibayarkan klien ke rekening LCH.
2. **Credit Note (CN):**
   - Diterbitkan oleh LCH dan ditujukan kepada **Perusahaan Asuransi**.
   - Berisi rincian premi bersih (*Net Premium*) setelah dipotong komisi *Brokerage* yang menjadi hak pendapatan LCH.
3. **Pencatatan Pelunasan (Payment Settlement):**
   - Mencatat tanda terima pembayaran dari klien.
   - Mencatat penyetoran premi bersih ke kas asuransi penanggung.

---

### Tahap 6: Pendampingan Klaim *(Klaim)*
Jika terjadi kerugian atau insiden atas objek yang dipertanggungkan.

1. Buka menu **Klaim** > klik **+ Lapor Klaim**.
2. Pilih **Nomor Polis** klien yang bersangkutan (sistem otomatis memvalidasi apakah polis masih aktif).
3. Masukkan rincian insiden:
   - Tanggal kejadian (*Date of Loss*) dan lokasi insiden.
   - Estimasi nilai kerugian (*Estimated Loss Amount*).
   - Kronologi singkat kejadian.
4. Unggah kelengkapan berkas klaim (Foto kerusakan, formulir klaim, laporan kepolisian/BAP, estimasi bengkel/kontraktor).
5. **Pengawalan Proses Klaim:**
   - Tim Klaim LCH menyerahkan berkas ke asuransi dan mendampingi proses survei oleh *Loss Adjuster*.
   - Memantau negosiasi nilai klaim yang disetujui (*Approved Claim*).
   - Memastikan dana ganti rugi (*Claim Settlement*) cair dan diterima oleh klien.

---

### Tahap 7: Pemantauan Perpanjangan Polis *(Marketing -> Renewal Notice)*
Polis asuransi umumnya berjangka waktu 1 (satu) tahun. LCH memantau polis yang mendekati masa kedaluwarsa secara proaktif.

1. Buka menu **Marketing** > tab **Renewal Notice**.
2. Sistem otomatis menampilkan daftar polis yang akan berakhir dalam rentang **30, 60, 90, atau 180 hari ke depan**.
3. Filter daftar berdasarkan periode hari atau jenis COB.
4. **Fasilitas Cetak:**
   - **Cetak Daftar Renewal:** Klik tombol **Print** di toolbar untuk mencetak rekap seluruh daftar renewal yang sedang difilter beserta total premi berjalan (cocok untuk rapat internal marketing).
   - **Cetak Surat Pemberitahuan Perpanjangan (Per Polis):** Di menu aksi baris polis, klik **Cetak surat pemberitahuan**. Sistem menghasilkan surat resmi 1 halaman A4 berkop LCH, lengkap dengan alamat klien, nama PIC, rincian polis, serta permohonan konfirmasi perpanjangan proteksi sebelum jatuh tempo.

---

## 4. Matriks Tanggung Jawab Berdasarkan Peran (Role)

| Modul / Fitur | Marketing | Underwriting | Klaim | Finance | Admin / Management |
|---|:---:|:---:|:---:|:---:|:---:|
| **Master Data** | Lihat | Lihat | Lihat | Lihat | Kelola Penuh |
| **Database Klien & KYC** | Kelola Penuh | Lihat | Lihat | Lihat | Kelola Penuh |
| **SPPA (Input & Cetak)** | Kelola Penuh | Lihat | Lihat | - | Kelola Penuh |
| **Placing Slip & Cover Note** | Lihat | Kelola Penuh | Lihat | Lihat | Kelola Penuh |
| **Policy Database** | Lihat | Kelola Penuh | Lihat | Lihat | Kelola Penuh |
| **Debit & Credit Note** | Lihat | Lihat | - | Kelola Penuh | Kelola Penuh |
| **Modul Klaim** | Lihat | Lihat | Kelola Penuh | - | Kelola Penuh |
| **Renewal Notice** | Kelola Penuh | Lihat | - | - | Kelola Penuh |

---

## 5. Glosarium Istilah Operasional Pialang Asuransi

- **Insured (Tertanggung):** Pihak yang memiliki kepentingan atas aset/jiwa yang diasuransikan (nasabah LCH).
- **Insurer / Underwriter (Penanggung):** Perusahaan asuransi yang menerima risiko dan menerbitkan polis.
- **KYC (Know Your Customer):** Prosedur verifikasi identitas nasabah dan tujuan keuangan sesuai regulasi OJK & PPATK.
- **SPPA (Surat Permintaan Penutupan Asuransi):** Formulir pengajuan dari tertanggung berisi data objek risiko sebelum polis dibuat.
- **Placing Slip:** Dokumen penempatan yang dikirim pialang ke perusahaan asuransi berisi syarat pertanggungan yang diminta.
- **Quotation:** Surat penawaran tarif premi dan klausula dari asuransi atas placing slip yang diajukan.
- **Cover Note:** Surat keterangan jaminan sementara yang dikeluarkan pialang/asuransi saat polis definitif sedang dalam proses pencetakan.
- **Brokerage:** Imbal jasa / komisi resmi yang diterima pialang dari perusahaan asuransi atas penempatan polis yang berhasil.
- **Endorsement:** Dokumen amandemen resmi yang menjadi lampiran polis untuk mengubah isi atau data dalam polis yang sedang aktif.
- **Loss Adjuster:** Pihak independen yang ditunjuk untuk menilai fakta teknis dan nominal kerugian saat terjadi klaim besar.
