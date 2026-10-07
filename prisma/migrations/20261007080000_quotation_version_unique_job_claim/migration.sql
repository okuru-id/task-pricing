-- Quotation: nomor versi harus unik per estimation. Sebelum constraint dipasang, nomori ulang duplikat
-- (jika ada akibat dua permintaan bersamaan sebelumnya) dengan nomor di atas versi tertinggi, urut menurut waktu dibuat.
WITH ranked AS (
  SELECT id, "estimationId",
         ROW_NUMBER() OVER (PARTITION BY "estimationId", version ORDER BY "generatedAt", id) AS rn
  FROM "quotations"
),
dups AS (
  SELECT r.id, r."estimationId",
         ROW_NUMBER() OVER (PARTITION BY r."estimationId" ORDER BY q."generatedAt", r.id) AS n
  FROM ranked r JOIN "quotations" q ON q.id = r.id
  WHERE r.rn > 1
),
maxv AS (
  SELECT "estimationId", MAX(version) AS mv FROM "quotations" GROUP BY "estimationId"
)
UPDATE "quotations" q
SET version = m.mv + d.n
FROM dups d JOIN maxv m ON m."estimationId" = d."estimationId"
WHERE q.id = d.id;

-- AlterTable
ALTER TABLE "analysis_jobs" ADD COLUMN     "claimToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "quotations_estimationId_version_key" ON "quotations"("estimationId", "version");
