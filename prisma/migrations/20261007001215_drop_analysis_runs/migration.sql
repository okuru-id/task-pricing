/*
  Warnings:

  - You are about to drop the `analysis_runs` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "analysis_runs" DROP CONSTRAINT "analysis_runs_workspaceId_fkey";

-- DropTable
DROP TABLE "analysis_runs";
