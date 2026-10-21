# Perbaikan Blank Screen & Race Condition Ganti Password Pertama Kali

- **Tanggal:** 2026-10-21
- **Branch:** `fix/change-password-blank-screen`
- **PR:** #14
- **Dikerjakan oleh:** Antigravity (Claude Fable 5) dengan ZoD3V

## Latar belakang

Pada pengujian di lingkungan production (`https://lch-ins.vercel.app/`), akun operasional dengan status `mustChangePassword: true` (seperti `claim@lch.co.id`, `tresna@lch.co.id`, `finance02@lch.co.id`, dll.) mengalami masalah *blank white screen* setelah berhasil submit form ganti kata sandi baru. Layar menjadi kosong dan dashboard baru muncul setelah pengguna melakukan refresh browser manual.

Investigasi mendalam menemukan akar masalah (*root cause*):
1. Terjadi tabrakan *race condition* antara Next.js Server Action redirect dan client-side script hard reload.
2. Server Action `changePasswordAction` mengembalikan state `{ success: true }`, sementara Server Component `/change-password` memicu redirect saat mendeteksi `mustChangePassword === false`.
3. Komponen client `ChangePasswordForm` memiliki `useEffect` yang memanggil `window.location.replace("/")` saat mendeteksi `state?.success === true`.
4. Pemanggilan `window.location.replace("/")` di sisi browser menginterupsi *streaming reconciliation* React 19 RSC dari server action redirect yang sedang berjalan di *flight*, menyebabkan DOM terkunci pada state kosong (`<div hidden=""></div>`).

## Yang berubah

- **Delegasi Navigasi Tunggal ke Next.js Server Action**:
  - Mengubah `changePasswordAction` di `app/(app)/change-password/actions.ts` agar langsung menjalankan `revalidatePath("/", "layout")` dan `redirect("/")` di sisi server setelah transaksi Prisma selesai.
- **Pembersihan Client-Side Race Trigger**:
  - Menghapus efek `useEffect` pemanggil `window.location.replace("/")` pada `components/auth/change-password-form.tsx`.
  - Mempertahankan penanganan error validasi inline (kata sandi lama salah, panjang kurang dari 10 karakter, konfirmasi tidak cocok, atau kata sandi baru sama dengan yang lama).
  - Tombol logout sekunder tetap disediakan untuk membatalkan proses dengan aman.

## File utama

- `app/(app)/change-password/actions.ts`: Server action yang mengupdate hash password di tabel `Account`, mengubah `mustChangePassword` menjadi `false` di tabel `User`, lalu mengeksekusi `revalidatePath` dan `redirect("/")`.
- `components/auth/change-password-form.tsx`: Form UI ganti password client component yang bersih dari race condition hard navigation.

## Dampak

- **Database:** Tidak ada perubahan skema (menggunakan field `mustChangePassword` pada tabel `User` yang sudah ada). Seluruh 6 akun operasional LCH telah diuji dan direset kembali ke status `mustChangePassword: true` dengan password awal `TestPassword123` untuk kesiapan demo/produksi.
- **Env:** Tidak ada perubahan env.
- **Deploy:** Standar deploy Vercel via pull request `fix/change-password-blank-screen` ke `main`.

## Verifikasi

1. **Uji Type & Build**:
   - `npx tsc --noEmit`: 0 error.
   - `npm run build`: Kompilasi Turbopack 69/69 rute berhasil 100%.
2. **Uji Integrasi Browser E2E**:
   - Menjalankan uji alur login dan ganti password untuk akun `claim@lch.co.id`, `tresna@lch.co.id`, dan `finance02@lch.co.id`.
   - Menguji validasi kegagalan: kata sandi lama salah menampilkan alert inline berwarna merah tanpa reload.
   - Menguji alur sukses: pengisian kata sandi baru valid langsung dialihkan (*smooth redirect*) seketika ke dashboard utama tanpa blank screen atau keharusan refresh manual.
3. **Reset Akun Pengujian**:
   - Menjalankan script database reset untuk 6 akun operasional (`harry@lch.co.id`, `aziz@lch.co.id`, `accounting@lch.co.id`, `finance02@lch.co.id`, `claim@lch.co.id`, `tresna@lch.co.id`) agar kembali memiliki `mustChangePassword: true`.

## Catatan untuk yang melanjutkan

- Alur guard `mustChangePassword` di `lib/server/session.ts` (`requireAccess` dan `assertPasswordChanged`) dan `app/(app)/change-password/page.tsx` bekerja selaras dengan Server Action `redirect("/")`. Jangan menambahkan navigasi client manual (`router.push` atau `window.location`) pada form setelah server action sukses, karena Next.js App Router mengoordinasikan transisi rute dan cache revalidation melalui respon RSC secara otomatis.
