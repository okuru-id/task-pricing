-- AlterTable
ALTER TABLE "estimation_tasks" ADD COLUMN     "milestoneId" TEXT;

-- AddForeignKey
ALTER TABLE "estimation_tasks" ADD CONSTRAINT "estimation_tasks_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
