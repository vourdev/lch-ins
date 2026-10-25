# Otomatisasi deploy ke VPS saat push atau perubahan di main

- **Tanggal:** 2026-10-25
- **Branch:** `chore/ci-cd-vps-auto-deploy`
- **PR:** #30
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Aplikasi dideploy ke server VPS (Instabox sandbox) di `https://lch-ins.adhinugroho.tech`. Diperlukan pipeline otomatisasi (CI/CD) agar setiap kali ada perubahan kode atau push yang masuk ke branch `main`, server production otomatis memperbarui kode, menjalankan migrasi database, membangun ulang aplikasi Next.js, dan merefresh container web tanpa intervensi manual.

## Yang berubah

- **GitHub Actions Workflow (`.github/workflows/deploy.yml`):**
  - Berjalan otomatis pada setiap event `push` ke branch `main` (serta mendukung trigger manual `workflow_dispatch`).
  - Menghubungi server VPS melalui SSH dan mengeksekusi script `/data/workspace/app/deploy.sh`.
- **Script Deploy di Server (`/data/workspace/app/deploy.sh`):**
  - Melakukan `git fetch` dan `git reset --hard origin/main`.
  - Menjalankan `npm ci --prefer-offline` untuk sinkronisasi dependensi.
  - Menerapkan migrasi database Prisma yang tertunda (`npx prisma migrate deploy`).
  - Membangun aplikasi Next.js versi production (`npm run build`).
  - Memperbarui image Docker `lch_web:latest` dan me-restart container `lch_web` dengan konfigurasi `.env` yang tersambung ke PostgreSQL internal dan Cloudflare Tunnel.

## File utama

- `.github/workflows/deploy.yml`: workflow GitHub Actions untuk auto-deploy.
- `/data/workspace/app/deploy.sh` (di VPS): script orkestrasi pembaruan server.

## Dampak

- **Database:** tidak ada perubahan skema. Migrasi otomatis diterapkan jika ada file migrasi baru.
- **Env:** mendukung environment variables `VPS_SSH_USER`, `VPS_SSH_HOST`, `VPS_SSH_PORT` pada GitHub Secrets (opsional, sudah memiliki default fallback).
- **Deploy:** setiap merge ke `main` otomatis memicu deploy ke `https://lch-ins.adhinugroho.tech`.

## Verifikasi

- Script `/data/workspace/app/deploy.sh` diuji langsung di VPS dan berhasil mengeksekusi siklus pull -> migrate -> build -> restart container `lch_web` secara utuh.
- `npx tsc --noEmit` dan `npm run build` lolos tanpa error.
