-- TaskType berhenti jadi enum: tiap profil pekerjaan punya tipe task sendiri
-- (fotografer "sesi_foto", developer "new_feature"), jadi satu enum global tidak berlaku.
--
-- Prisma menghasilkan DROP COLUMN + ADD COLUMN untuk perubahan ini, yang akan menghapus
-- tipe dari seluruh task yang sudah ada. Diganti ALTER ... USING: Postgres bisa meng-cast
-- enum ke text, sehingga nilai lama ("NEW_FEATURE", "INTEGRATION", …) tetap utuh dan cocok
-- dengan kode JobTaskType profil "Software Development" hasil backfill sebelumnya.

ALTER TABLE "estimation_tasks"
  ALTER COLUMN "type" TYPE TEXT USING "type"::text;

ALTER TABLE "quotation_items"
  ALTER COLUMN "type" TYPE TEXT USING "type"::text;

-- Enum tidak lagi dirujuk kolom mana pun.
DROP TYPE "TaskType";
