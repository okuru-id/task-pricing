-- CreateEnum
CREATE TYPE "AnalysisJobStatus" AS ENUM ('RUNNING', 'FAILED', 'DONE');

-- CreateTable
CREATE TABLE "analysis_jobs" (
    "id" TEXT NOT NULL,
    "estimationId" TEXT NOT NULL,
    "status" "AnalysisJobStatus" NOT NULL DEFAULT 'RUNNING',
    "stage" INTEGER NOT NULL DEFAULT 0,
    "data" JSONB NOT NULL DEFAULT '{}',
    "error" TEXT,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analysis_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analysis_jobs_estimationId_createdAt_idx" ON "analysis_jobs"("estimationId", "createdAt");

-- AddForeignKey
ALTER TABLE "analysis_jobs" ADD CONSTRAINT "analysis_jobs_estimationId_fkey" FOREIGN KEY ("estimationId") REFERENCES "estimations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
