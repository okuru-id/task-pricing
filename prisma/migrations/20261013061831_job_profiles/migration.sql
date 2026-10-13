-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "jobProfileId" TEXT;

-- CreateTable
CREATE TABLE "job_profiles" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "aiInstruction" TEXT,
    "simpleGuide" TEXT,
    "mediumGuide" TEXT,
    "complexGuide" TEXT,
    "veryComplexGuide" TEXT,
    "thirdPartyHints" TEXT,
    "migrationHints" TEXT,
    "exclusions" TEXT[],
    "pricingProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_task_types" (
    "id" TEXT NOT NULL,
    "jobProfileId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "job_task_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_profiles_pricingProfileId_key" ON "job_profiles"("pricingProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "job_profiles_workspaceId_slug_key" ON "job_profiles"("workspaceId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "job_task_types_jobProfileId_code_key" ON "job_task_types"("jobProfileId", "code");

-- AddForeignKey
ALTER TABLE "job_profiles" ADD CONSTRAINT "job_profiles_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_profiles" ADD CONSTRAINT "job_profiles_pricingProfileId_fkey" FOREIGN KEY ("pricingProfileId") REFERENCES "pricing_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_task_types" ADD CONSTRAINT "job_task_types_jobProfileId_fkey" FOREIGN KEY ("jobProfileId") REFERENCES "job_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_jobProfileId_fkey" FOREIGN KEY ("jobProfileId") REFERENCES "job_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: tiap workspace yang sudah ada mendapat profil "Software Development" berisi
-- persis perilaku yang berlaku sebelum migrasi ini (teks prompt dan regex guardrail yang
-- dulu dipaku di src/lib/ai/prompt.ts dan src/lib/ai/analyze.ts). Tanpa ini, workspace lama
-- tidak punya profil dan analisis kehilangan konteks profesinya.
INSERT INTO "job_profiles" (
  "id", "workspaceId", "name", "slug", "isDefault",
  "aiInstruction", "simpleGuide", "mediumGuide", "complexGuide", "veryComplexGuide",
  "thirdPartyHints", "migrationHints", "exclusions", "pricingProfileId", "updatedAt"
)
SELECT
  'jp_' || w."id",
  w."id",
  'Software Development',
  'software',
  true,
  'Anda menganalisis pekerjaan pengembangan perangkat lunak untuk freelancer Indonesia.',
  'Perubahan kecil yang polanya sudah jelas. Contoh: tambah menu, ubah label, tambah field, validasi sederhana.',
  'Frontend + backend, query DB, business logic sederhana. Contoh: CRUD relasi, filter tanggal, search/pagination, export data.',
  'Beberapa module, business logic penting, perubahan DB, workflow existing berubah. Contoh: approval workflow, multi-step transaction, reporting kompleks.',
  'Module baru, integrasi payment, external API signifikan, perubahan arsitektur, migrasi data besar, real-time, atau AI/ML.',
  'payment|pembayaran|midtrans|xendit|stripe|qris|gateway|whatsapp|\bapi\b|integrasi|integration|webhook|oauth|\bsso\b|google login',
  'migrasi|migration|import data|pindah data',
  ARRAY[
    'Perubahan atau penambahan fitur di luar daftar pekerjaan pada penawaran ini',
    'Biaya hosting, domain, dan lisensi perangkat lunak'
  ],
  (SELECT p."id" FROM "pricing_profiles" p
    WHERE p."workspaceId" = w."id"
    ORDER BY p."isDefault" DESC, p."createdAt" ASC
    LIMIT 1),
  CURRENT_TIMESTAMP
FROM "workspaces" w;

-- Tipe task profil bawaan = nilai enum TaskType yang berlaku sekarang, dengan kode yang sama
-- supaya migrasi enum -> kode string berikutnya tidak perlu memetakan ulang data.
INSERT INTO "job_task_types" ("id", "jobProfileId", "code", "label", "order")
SELECT 'jtt_' || jp."id" || '_' || t."code", jp."id", t."code", t."label", t."order"
FROM "job_profiles" jp
CROSS JOIN (VALUES
  ('BUG', 'Bug', 0),
  ('ENHANCEMENT', 'Enhancement', 1),
  ('NEW_FEATURE', 'New Feature', 2),
  ('INTEGRATION', 'Integration', 3),
  ('INFRASTRUCTURE', 'Infrastructure', 4),
  ('INVESTIGATION', 'Investigation', 5),
  ('MAINTENANCE', 'Maintenance', 6),
  ('CHANGE_REQUEST', 'Change Request', 7)
) AS t("code", "label", "order")
WHERE jp."slug" = 'software';

-- Project yang sudah ada ikut profil default workspace-nya.
UPDATE "projects" p
SET "jobProfileId" = jp."id"
FROM "job_profiles" jp
WHERE jp."workspaceId" = p."workspaceId" AND jp."isDefault" = true;
