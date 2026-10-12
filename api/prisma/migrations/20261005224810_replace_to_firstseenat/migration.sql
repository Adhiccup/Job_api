-- DropIndex
DROP INDEX "Job_publishedAt_id_idx";

-- CreateIndex
CREATE INDEX "Job_firstSeenAt_id_idx" ON "Job"("firstSeenAt", "id");
