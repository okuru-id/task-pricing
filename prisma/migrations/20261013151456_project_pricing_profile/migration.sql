-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "pricingProfileId" TEXT;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_pricingProfileId_fkey" FOREIGN KEY ("pricingProfileId") REFERENCES "pricing_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: project yang sudah ada memakai tarif yang selama ini dipakai aplikasi, yaitu
-- pricing profile default workspace. Tanpa ini harga project lama berubah diam-diam saat
-- pemilihan tarif per project mulai berlaku.
UPDATE "projects" p
SET "pricingProfileId" = (
  SELECT pp."id" FROM "pricing_profiles" pp
  WHERE pp."workspaceId" = p."workspaceId"
  ORDER BY pp."isDefault" DESC, pp."createdAt" ASC
  LIMIT 1
)
WHERE p."pricingProfileId" IS NULL;
