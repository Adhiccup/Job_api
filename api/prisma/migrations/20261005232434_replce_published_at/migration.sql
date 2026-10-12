-- DropIndex
DROP INDEX "Job_firstSeenAt_id_idx";

-- DropIndex
DROP INDEX "Job_publishedAt_idx";

-- CreateIndex
CREATE INDEX "Job_publishedAt_id_idx" ON "Job"("publishedAt", "id");
