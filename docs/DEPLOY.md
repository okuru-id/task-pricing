# Deploy ke Vercel

## Pengaturan project
- **Production Branch:** `main`.
- **Ignored Build Step:** `Only build production` — branch lain (mis. `claude/*`) tidak dibangun dan tidak menyentuh database.
- **Build Command:** biarkan default (Override mati). Vercel otomatis memakai script `vercel-build` di `package.json`.
- **Node.js:** 22.x.

## Environment Variables (Production)
| Variabel | Keterangan |
|---|---|
| `DATABASE_URL` | URL Postgres **langsung** (`postgres://...`). Dengan Prisma Postgres, salin dari variabel `POSTGRES_URL` bila integrasi tidak membuat `DATABASE_URL`. URL `prisma+postgres://` (Accelerate) tidak cocok untuk klien biasa yang dipakai aplikasi ini |
| `AUTH_SECRET` | Buat sekali (`openssl rand -base64 32`) dan **jangan diganti**: API key AI tersimpan terenkripsi dengan kunci turunannya |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Opsional, hanya jika memakai login Google |

Jangan isi `AI_ALLOW_PRIVATE_ENDPOINTS` dan `DEV_LOGIN_*`. Provider, model, dan API key AI diisi tiap user di menu **Settings** (BYOK), bukan lewat env.

## Migrasi database (otomatis)
`scripts/vercel-build.mjs` dijalankan Vercel sebagai `vercel-build`:

1. `VERCEL_ENV=production` → `prisma migrate deploy`, lalu `next build`.
2. Selain production → migrasi dilewati, hanya `next build`.
3. Jika migrasi gagal → build berhenti, deployment **tidak dipromosikan**; production tetap di versi sebelumnya.

`npm run build` lokal tetap hanya `next build` (tidak pernah memigrasi database Anda).

### Menulis migrasi yang aman untuk deploy otomatis
Migrasi diterapkan **sebelum** kode baru aktif, dan jika build gagal setelahnya, kode lama tetap melayani lalu lintas dengan skema baru. Karena itu:
- Utamakan perubahan yang kompatibel mundur: tambah kolom/tabel dulu; hapus/ganti nama di deploy terpisah setelah kode tidak lagi memakainya (expand → contract).
- Migrasi destruktif (`DROP`, mengubah tipe) jalan tanpa review manusia — periksa isinya di PR.

### Menjalankan manual (cadangan)
```bash
DATABASE_URL="postgres://..." npx prisma migrate deploy
```

## Setelah deploy pertama
1. Buat akun lewat halaman login.
2. Buka **Settings**, isi provider, model, dan API key, lalu **Tes koneksi**.
3. Jika memakai Google login, tambahkan redirect URI `https://<domain>/api/auth/callback/google`.
