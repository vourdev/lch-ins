# Analisis Modul Minggu 2 & Rencana Kerja Minggu 3

Dokumen ini memuat rangkuman teknis dari 5 modul fondasi yang telah selesai dikerjakan pada **Minggu 2**, serta analisis mendalam, arsitektur data, dan rencana implementasi untuk modul **Minggu 3** (*Placing slip, rate dan premium, klausula, dan tarif OJK*).

---

## Bagian I: Checklist & Status Modul Minggu 2 (Selesai 100%)

Seluruh modul fondasi operasional pada Minggu 2 telah berhasil dimigrasikan dari mock store in-memory ke database PostgreSQL berbasis Prisma 7, dilindungi otorisasi per-role, divalidasi dengan schema Zod, dan dilengkapi pencatatan audit trail otomatis.

| No | Modul | Route / Path | Status Persistensi | Guard & Keamanan | Integrasi E2E |
|:---|:---|:---|:---|:---|:---|
| 1 | **Master Data Management** | `/master-data` | PostgreSQL (12 tabel Prisma) | `requireAccess("/master-data")` + Reference Guards | 31/31 Pass |
| 2 | **User Role & Akses** | `/users` | PostgreSQL (`users`, `user_roles`) | Multi-role (`hasRole`, `requireRole`) + Better Auth | Lolos |
| 3 | **Audit Trail** | `/audit-trail` | PostgreSQL (`audit_logs`) | Pencatatan mutasi otomatis via `recordAudit` | Lolos |
| 4 | **Data Klien KYC** | `/marketing` (Tab Klien) | PostgreSQL (`clients`, `client_addresses`, `client_documents`) | Zod (`clientInputSchema`) + Unique Name Check | Lolos |
| 5 | **Form SPPA** | `/marketing` (Tab SPPA) | PostgreSQL (`sppa`) | Relasi FK ke Klien, COB, Cover Type, Okupasi, Currency | Lolos |

### Rincian Pencapaian per Modul

#### 1. Master Data Management (`/master-data`)
- **Fungsi Utama**: Sumber kebenaran tunggal (*single source of truth*) seluruh pilihan sistem LCH Insurance Brokers.
- **Fitur Selesai**:
  - **Tab 1: COB & Cover Type**: Manajemen hierarki Class of Business dan Sub-Cover Type dengan counter relasi transaksi aktif.
  - **Tab 2: Tarif Baku OJK**: Referensi tabel okupasi properti (K1, K2, K3), tarif gempa bumi (zona 1–5), banjir (zona 1–4), dan skala Business Interruption (BI).
  - **Tab 3: Rekanan Asuransi & Adjuster**: Direktori rekanan asuransi dan penilai kerugian.
  - **Tab 4: Keuangan & Dokumen**: Rekening bank operasional, rekening titipan premi klien (`is_premium_trust = true`), daftar valuta ISO, dan template wording form polis.
  - **Tab 5: Nilai Pilihan (Lookup Values)**: Pengelolaan terpusat dropdown sistem dengan proteksi entitas sistem (`is_system = true`).
- **Keamanan & Guard**:
  - *Relational Reference Guard*: Mencegah penghapusan entitas master jika telah digunakan pada data SPPA, Placing Slip, Polis, atau Rekening.
  - *Frontend Input Sanitization*: Input angka disaring seketika (`digitsOnly`, sanitasi rekening bank, dan nomor telepon).

#### 2. User Role & Manajemen Akses (`/users`)
- **Fungsi Utama**: Manajemen akun tim LCH dengan pembagian wewenang multi-role.
- **Fitur Selesai**:
  - Multi-role permission system: `Admin`, `Marketing`, `Underwriting`, `Claim`, `Finance`, `Technical`.
  - Otentikasi Better Auth dengan session cookies terenkripsi dan auto-redirect.
  - Role gating berbasis Server Component & Server Action (`requireAccess`, `requireRole`).
  - Ganti password dengan dialog modal terproteksi dan feedback visual.

#### 3. Audit Trail (`/audit-trail`)
- **Fungsi Utama**: Kepatuhan regulasi pialang asuransi untuk mencatat seluruh aktivitas data pengguna.
- **Fitur Selesai**:
  - Service terpusat `recordAudit()` yang mencatat `actorId`, `action` (`CREATE`, `UPDATE`, `DELETE`, `STATUS_CHANGE`), `entityName`, `entityId`, `oldData`, `newData`, IP address, dan user agent.
  - Antarmuka audit trail dengan filter aktor, rentang tanggal, jenis entitas, pencarian, dan paginasi.

#### 4. Data Klien & KYC (`/marketing` - Tab Klien)
- **Fungsi Utama**: Administrasi profil nasabah korporasi maupun perorangan sesuai ketentuan KYC perantara asuransi.
- **Fitur Selesai**:
  - Pembedaan profil Korporasi (PIC, KTP PIC, NPWP Perusahaan) dan Perorangan (NIK 16 digit, NPWP, Tempat & Tgl Lahir, Sumber Penghasilan).
  - Multi-alamat dengan penanda alamat korespondensi utama (`isPrimary`).
  - Berkas digital KYC (PDF/gambar dokumen legalitas).
  - Sanitasi ketat input numerik NIK/KTP dan NPWP.

#### 5. Form SPPA (`/marketing` - Tab SPPA)
- **Fungsi Utama**: Pencatatan Surat Permintaan Penutupan Asuransi sebelum diterbitkan menjadi penawaran slip.
- **Fitur Selesai**:
  - Relasi relasional ke `clients`, `classes_of_business`, `cover_types`, `occupations`, dan `currencies`.
  - Pertanyaan dinamis per COB (Property, Motor Vehicle, Marine Cargo, PA, Engineering) dengan pengetatan input numerik.
  - Transisi status operasional (`Draft` -> `Submitted`).
  - Integrasi satu-klik konversi ke modul Underwriting (`/underwriting/new?sppa=<id>`).

---

## Bagian II: Analisis Teknis & Rencana Kerja Minggu 3

**Topik Kerja:** *Placing slip, rate dan premium, klausula, dan tarif OJK*  
**Menu Terkait:** `/underwriting`, `/underwriting/new`, `/underwriting/edit/[id]`, `/underwriting/master-clauses`

### 1. Placing Slip Management (`/underwriting`)

#### Kondisi Saat Ini (As-Is):
- Pembuatan dan pengeditan slip pada `components/underwriting/placing-slip-form.tsx` saat ini masih mengandalkan mock store lokal (`lib/store.ts`).
- Skema database di `prisma/schema.prisma` sudah memiliki tabel `placing_slips`, `placing_slip_insurers`, dan `placing_slip_clauses` yang belum dihubungkan ke UI.

#### Target Implementasi (To-Be):
1. **Server Data Layer (`lib/server/placing-slips.ts`)**:
   - Fungsi CRUD berbasis Prisma: `listPlacingSlips()`, `getPlacingSlipById()`, `createPlacingSlip()`, `updatePlacingSlip()`, `deletePlacingSlip()`.
   - Relasi relasional lengkap: `client`, `cob`, `coverType`, `sppa`, `insurers`, `clauses`.
2. **Next.js Server Actions (`app/(app)/underwriting/actions.ts`)**:
   - `createPlacingSlipAction`, `updatePlacingSlipAction`, `changeSlipStatusAction`.
   - Proteksi otorisasi `requireAccess("/underwriting")` (Admin dan Teknik / Underwriting).
   - Revalidasi cache rute `/underwriting` dan `/underwriting/[id]`.
3. **Siklus Hidup & Status Slip**:
   - `Draft`: Tahap penyusunan struktur risiko dan suku premi.
   - `Quoted`: Slip penawaran telah diajukan ke panel asuransi atau disetujui klien.
   - `Signed`: Slip telah ditandatangani oleh underwriter asuransi leader/co-insurers.
   - `Closed`: Slip final yang siap diterbitkan polis resminya ke Policy Database.
4. **Co-Insurance & Panel Asuransi**:
   - Dukungan panel multi-asuransi dengan pemisahan peran (`As Leader` vs `As Co-insurer`).
   - Validasi pembagian share total persentase tepat 100% (`sumPercent(insurers.map(i => i.share)) === 100`).

---

### 2. Rate & Premium Engine (`lib/calc.ts` & Server Engine)

#### Kondisi Saat Ini:
- Perhitungan kalkulasi premi dasar sudah ada di `lib/calc.ts` (`calcPremium`, `sumPremium`, `rateMultiplier`).
- Unit rate mendukung persen (`%`) dan permil (`‰`).

#### Target Implementasi & Penguatan:
1. **Kalkulasi Suku Premi Berlapis**:
   - Premi Dasar = Nilai Pertanggungan (TSI) × (Rate Pokok / Unit Divisor).
   - Premi Perluasan / Sub-cover (Gempa Bumi, Banjir, Riot/Strike, dll) dihitung per baris rate (`RateLine`).
   - Total Premi Bruto (*Gross Premium*) = Penjumlahan seluruh rate line.
2. **Biaya & Potongan**:
   - Biaya Akuisisi / Brokerage Fee LCH = Gross Premium × Brokerage %.
   - Verifikasi batas maksimum brokerage fee OJK (misal maks 25% untuk lini usaha properti/kendaraan sesuai SEOJK).
   - Biaya Polis & Bea Meterai (Stamp Duty).
   - Net Premi yang wajib disetorkan ke asuransi leader.

---

### 3. Validasi & Penegakan Regulasi Tarif OJK (SE OJK No. 06/SEOJK.05/2017)

Regulasi OJK menetapkan batas bawah (*lower bound*) dan batas atas (*upper bound*) untuk lini usaha Harta Benda (Property) dan Kendaraan Bermotor (Motor Vehicle).

#### Target Implementasi:
1. **Pengecekan Otomatis Batas Tarif OJK**:
   - Okupasi Properti: Mencocokkan kode okupasi 4 digit terhadap tabel `tariff_occupations` berdasarkan kelas konstruksi (Kelas 1, 2, 3).
   - Gempa Bumi: Mencocokkan zona wilayah (Zona 1 s/d 5) pada `tariff_eq_properties`.
   - Banjir: Mencocokkan zona risiko banjir (Zona 1 s/d 4) pada `tariff_floods`.
2. **Mekanisme Pengecualian Tarif (Rate Exception Guard)**:
   - Jika underwriter memasukkan suku premi **di bawah batas bawah OJK** (misal karena potongan volume besar / *loss record* sangat baik):
     - Sistem mewajibkan pencatatan alasan resmi dari dropdown `RATE_EXCEPTION_REASONS`.
     - Menyimpan catatan justifikasi ke relasi `rate_exceptions`.
   - Jika suku premi **di atas batas atas OJK** (karena perluasan jaminan khusus / risiko tinggi):
     - Wajib mendokumentasikan dasar pertimbangan teknis underwriting.
   - Slip tidak dapat di-submit ke status `Quoted` jika ada rate di luar batas OJK tanpa disertai alasan pengecualian.

---

### 4. Pustaka Klausula Baku & Pelampiran Klausula Slip (`/underwriting/master-clauses`)

#### Kondisi Saat Ini:
- Pustaka master clauses sudah memiliki Server Actions (`app/(app)/underwriting/master-clauses/actions.ts`) dan tabel database `master_clauses`.

#### Target Implementasi:
1. **Integrasi Clause Picker pada Placing Slip**:
   - Komponen `ClausePicker` pada formulir slip menarik data klausula langsung dari database PostgreSQL.
   - Kategorisasi klausula:
     - Klausula Wajib (*Mandatory Clauses*) sesuai PSAKBI / PSAKI.
     - Klausula Tambahan (*Endorsement / Extended Clauses*).
     - Klausula Khusus (*Special Warranties / Conditions*).
2. **Kustomisasi Wording per Slip**:
   - Underwriter dapat menyesuaikan teks parameter klausula (misal: jumlah hari *72 Hours Clause*, nilai deductible *Water Damage Clause*).
   - Perubahan teks pada level slip tidak mengubah master template di pustaka klausula.
3. **Dokumen Output & Cetak PDF**:
   - Integrasi pelampiran klausula pada lembar Placing Slip, Cover Note, dan Quotation Slip siap cetak / PDF.

---

## Bagian III: Roadmap Tahapan Eksekusi Minggu 3

```
┌────────────────────────────────────────────────────────────────────────┐
│ MINGGU 3: PLACING SLIP, RATE ENGINE, TARIF OJK & KLAUSULA               │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
  ┌────────────────────────────────────────────────────────────────────┐
  │ TAHAP 1: Server Data Layer & Server Actions Placing Slip           │
  │ • lib/server/placing-slips.ts (Prisma CRUD + relasi panel)         │
  │ • app/(app)/underwriting/actions.ts (Validasi Zod + requireAccess)  │
  └────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
  ┌────────────────────────────────────────────────────────────────────┐
  │ TAHAP 2: Integrasi UI Placing Slip ke PostgreSQL                   │
  │ • components/underwriting/placing-slip-form.tsx                    │
  │ • components/underwriting/slip-table.tsx                           │
  │ • Pre-fill instan dari SPPA terbit (/underwriting/new?sppa=<id>)   │
  └────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
  ┌────────────────────────────────────────────────────────────────────┐
  │ TAHAP 3: Penguatan Rate Engine & Penegakan Batas Tarif OJK         │
  │ • Validasi real-time suku premi terhadap database tarif OJK        │
  │ • RateException modal dialog mandatory check                       │
  │ • Audit compliance brokerage cap OJK                               │
  └────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
  ┌────────────────────────────────────────────────────────────────────┐
  │ TAHAP 4: Integrasi Klausula & Dokumen Underwriting                 │
  │ • ClausePicker tersambung ke tabel master_clauses Prisma           │
  │ • Preview & Cetak Placing Slip / Quotation / Cover Note            │
  └────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
  ┌────────────────────────────────────────────────────────────────────┐
  │ TAHAP 5: Verifikasi E2E, Dokumentasi & Build Produksi              │
  │ • Skrip uji integrasi E2E scripts/test-underwriting-e2e.ts         │
  │ • npx tsc --noEmit && npm run build (0 error)                      │
  │ • Pembaruan graph knowledge graphify update .                      │
  └────────────────────────────────────────────────────────────────────┘
```

---

*Dokumen ini disusun sebagai panduan resmi arsitektur dan eksekusi teknis tim engineering LCH Insurance Brokers.*
