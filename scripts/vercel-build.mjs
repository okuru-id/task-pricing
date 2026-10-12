/**
 * Build untuk Vercel: terapkan migrasi database LALU build aplikasi.
 * Vercel menjalankan script `vercel-build` (jika ada) menggantikan `build`; `npm run build` lokal tidak berubah.
 *
 * - Migrasi hanya dijalankan untuk deployment PRODUCTION (VERCEL_ENV=production). Deployment lain
 *   (preview) tidak menyentuh database, supaya branch uji tidak mengubah skema production.
 * - Jika migrasi gagal, build berhenti dan deployment TIDAK dipromosikan: production tetap di versi sebelumnya.
 */
import { spawnSync } from "node:child_process";

const run = (label, command, args) => {
  console.log(`\n▶ ${label}`);
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) {
    console.error(`\n✖ ${label} gagal (exit ${result.status ?? result.signal}). Build dihentikan.`);
    process.exit(result.status ?? 1);
  }
};

const env = process.env.VERCEL_ENV;

if (env === "production") {
  if (!process.env.DATABASE_URL) {
    console.error("✖ DATABASE_URL belum diisi di Environment Variables Vercel — migrasi tidak bisa dijalankan.");
    process.exit(1);
  }
  run("prisma migrate deploy", "npx", ["prisma", "migrate", "deploy"]);
} else {
  console.log(`↷ Lewati migrasi database (VERCEL_ENV=${env ?? "tidak diset"}; hanya production yang memigrasi).`);
}

run("next build", "npx", ["next", "build"]);
