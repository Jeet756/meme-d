-- CreateEnum
CREATE TYPE "Role" AS ENUM ('brand', 'creator');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('instagram', 'youtube');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'live', 'completed');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'live',
    "budgetPaise" INTEGER NOT NULL,
    "spentPaise" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "minViews" INTEGER NOT NULL,
    "payoutPaise" INTEGER NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "creatorId" UUID NOT NULL,
    "postUrl" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "earnedPaise" INTEGER NOT NULL DEFAULT 0,
    "suspicious" BOOLEAN NOT NULL DEFAULT false,
    "viewsUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutLedgerEntry" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "creatorId" UUID NOT NULL,
    "milestoneId" UUID NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "previousEarnedPaise" INTEGER NOT NULL,
    "newEarnedPaise" INTEGER NOT NULL,
    "viewsAtAward" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayoutLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Campaign_brandId_createdAt_idx" ON "Campaign"("brandId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Campaign_status_createdAt_idx" ON "Campaign"("status", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_campaignId_minViews_key" ON "Milestone"("campaignId", "minViews");

-- CreateIndex
CREATE INDEX "Submission_creatorId_createdAt_idx" ON "Submission"("creatorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Submission_campaignId_createdAt_idx" ON "Submission"("campaignId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Submission_campaignId_postUrl_key" ON "Submission"("campaignId", "postUrl");

-- CreateIndex
CREATE UNIQUE INDEX "PayoutLedgerEntry_idempotencyKey_key" ON "PayoutLedgerEntry"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PayoutLedgerEntry_creatorId_createdAt_idx" ON "PayoutLedgerEntry"("creatorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "PayoutLedgerEntry_campaignId_createdAt_idx" ON "PayoutLedgerEntry"("campaignId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "PayoutLedgerEntry_submissionId_idx" ON "PayoutLedgerEntry"("submissionId");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutLedgerEntry" ADD CONSTRAINT "PayoutLedgerEntry_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutLedgerEntry" ADD CONSTRAINT "PayoutLedgerEntry_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutLedgerEntry" ADD CONSTRAINT "PayoutLedgerEntry_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutLedgerEntry" ADD CONSTRAINT "PayoutLedgerEntry_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hand-written integrity constraints (not representable in schema.prisma).
-- These are the last line of defence: even buggy application code cannot
-- overspend a campaign or write a non-positive payout.
-- ---------------------------------------------------------------------------
ALTER TABLE "Campaign"
  ADD CONSTRAINT "Campaign_budget_positive_chk" CHECK ("budgetPaise" > 0),
  ADD CONSTRAINT "Campaign_spent_within_budget_chk" CHECK ("spentPaise" >= 0 AND "spentPaise" <= "budgetPaise");

ALTER TABLE "Milestone"
  ADD CONSTRAINT "Milestone_values_positive_chk" CHECK ("minViews" > 0 AND "payoutPaise" > 0);

ALTER TABLE "Submission"
  ADD CONSTRAINT "Submission_nonnegative_chk" CHECK ("viewCount" >= 0 AND "earnedPaise" >= 0);

ALTER TABLE "PayoutLedgerEntry"
  ADD CONSTRAINT "PayoutLedger_amount_positive_chk" CHECK ("amountPaise" > 0),
  ADD CONSTRAINT "PayoutLedger_arithmetic_chk" CHECK ("newEarnedPaise" = "previousEarnedPaise" + "amountPaise");
