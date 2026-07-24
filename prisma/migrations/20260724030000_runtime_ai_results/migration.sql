CREATE TABLE "AiRuntimeResult" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "feature" TEXT NOT NULL,
  "input" JSONB NOT NULL,
  "output" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiRuntimeResult_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AiRuntimeResult_clinicId_createdAt_idx" ON "AiRuntimeResult"("clinicId", "createdAt");
