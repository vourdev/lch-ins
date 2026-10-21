# Perbaikan 24 Error ESLint dan Type Safety Codebase

- **Tanggal:** 2026-10-21
- **Branch:** `fix/eslint-errors`
- **PR:** #15
- **Dikerjakan oleh:** Antigravity (Claude Fable 5) dengan ZoD3V

## Latar belakang

Audit linting pada branch `main` menemukan akumulasi 24 error dan 3 warning ESLint yang tersebar di modul server (`clients.ts`, `sppa.ts`, `users.ts`), komponen UI (`components/users/*`, `line-items.tsx`, `components/master-data/*`), serta script pengujian. Meskipun build produksi tetap berhasil, aturan linting React 19 (`react-hooks/refs`, `react-hooks/set-state-in-effect`) dan TypeScript (`@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-unused-vars`) penting untuk dijaga agar tidak terjadi regresi runtime, memory leak, atau render cascading.

## Yang berubah

1. **Eliminasi Render Ref Access (`react-hooks/refs`)**:
   - Menghapus mutasi dan pembacaan `idsRef.current` selama siklus render pada `components/underwriting/line-items.tsx`.
   - Menggunakan index stabil untuk daftar string dinamis terkontrol, menyelesaikan 6 error render ref.

2. **Pembersihan Cascading Render (`react-hooks/set-state-in-effect`)**:
   - `components/users/user-table.tsx`: Menghilangkan `useState` redundan yang menduplikasi prop `initialUsers`. Menggunakan nilai prop langsung karena Server Component revalidasi dan `router.refresh()` secara otomatis mengalirkan data terkini.
   - `components/users/user-form-dialog.tsx`: Memecah form modal menjadi sub-komponen `UserFormContent` dengan `key={user?.id ?? "new"}`. Menghilangkan `useEffect` sinkronisasi state saat modal dibuka dan memastikan form selalu ter-reset secara deklaratif dan bersih.
   - `components/master-data/*` (`cob-cover-tab.tsx`, `finance-docs-tab.tsx`, `insurers-adjusters-tab.tsx`, `lookup-values-tab.tsx`): Menghapus `useEffect` pemanggil `setState` sinkron dan menggantinya dengan pola standar React "adjust state during render" ketika props berubah.
   - `components/shared/table-pagination.tsx`: Menghapus `useEffect` reset halaman saat `items.length` berubah dan menggantinya dengan pengecekan state transisi render.

3. **Pengetatan Tipe Data & Eliminasi `any` (`@typescript-eslint/no-explicit-any`)**:
   - `lib/server/clients.ts`: Mengganti parameter `any` dengan tipe Prisma tergenerasi `PrismaClientWithRelations` via `Prisma.ClientGetPayload`, serta mengetikkan array kondisi query `whereAnd` sebagai `Prisma.ClientWhereInput[]`.
   - `lib/server/sppa.ts`: Mengetikkan `raw` dengan payload Prisma tergenerasi `PrismaSppaWithRelations` dan menggunakan enum status `PrismaSppaStatus`.
   - `lib/server/users.ts`: Mengetikkan array kondisi query filter pengguna sebagai `Prisma.UserWhereInput[]`.
   - `components/marketing/client-table.tsx`: Mengganti pengecekan `(c as any).isUsedInDocuments` dengan interface bertipe `ClientWithUsage`.
   - `scripts/test-sppa-e2e.ts`: Mengganti `catch (err: any)` dengan penanganan aman `catch (err: unknown)` bertipe `err instanceof Error`.

4. **Pembersihan Variabel Tidak Digunakan (`@typescript-eslint/no-unused-vars`)**:
   - Menghapus unused import `useRouter` di `components/layout/app-sidebar.tsx`.
   - Menghapus unused import `User as UserIcon` di `components/layout/app-topbar.tsx`.
   - Menghapus unused catch binding `(err: unknown)` di `scripts/test-master-data-e2e.ts`.

## File utama

- `components/underwriting/line-items.tsx`: Perbaikan render ref.
- `components/users/user-form-dialog.tsx` & `user-table.tsx`: Perbaikan deklaratif state pengguna.
- `components/master-data/*`: Penanganan sinkronisasi data master tanpa cascading render.
- `lib/server/clients.ts`, `lib/server/sppa.ts`, `lib/server/users.ts`: Pengetatan tipe data relasional Prisma.

## Dampak

- **Database:** Tidak ada perubahan database atau skema.
- **Env:** Tidak ada perubahan env.
- **Deploy:** Standar deploy tanpa konfigurasi tambahan.

## Verifikasi

- `npm run lint`: **0 errors, 0 warnings** (sebelumnya 24 errors, 3 warnings).
- `npx tsc --noEmit`: **0 error** (TypeScript lolos 100%).
- `npm run build`: **69/69 rute terkompilasi sukses** dengan Next.js 16.2.6 (Turbopack).
