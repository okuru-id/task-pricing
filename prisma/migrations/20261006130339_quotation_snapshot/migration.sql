-- AlterTable
ALTER TABLE "estimations" ADD COLUMN     "assumptions" TEXT[];

-- AlterTable
ALTER TABLE "quotation_items" ADD COLUMN     "breakdown" TEXT[],
ADD COLUMN     "complexity" "Complexity",
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "priceMax" INTEGER,
ADD COLUMN     "type" "TaskType";

-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "totalMax" INTEGER;
