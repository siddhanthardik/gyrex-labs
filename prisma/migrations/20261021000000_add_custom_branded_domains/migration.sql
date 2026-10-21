-- AlterTable SubscriptionPlan: Add customDomainEnabled defaulting to false
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "customDomainEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateEnum DomainStatus
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DomainStatus') THEN
        CREATE TYPE "DomainStatus" AS ENUM (
            'PENDING_VERIFICATION',
            'VERIFYING',
            'ACTIVE',
            'FAILED',
            'SUSPENDED',
            'REMOVED'
        );
    END IF;
END $$;

-- CreateEnum DomainSslStatus
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DomainSslStatus') THEN
        CREATE TYPE "DomainSslStatus" AS ENUM (
            'INITIALIZING',
            'PENDING_VALIDATION',
            'ACTIVE',
            'EXPIRED',
            'FAILED'
        );
    END IF;
END $$;

-- CreateTable LabDomain
CREATE TABLE IF NOT EXISTS "LabDomain" (
    "id" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "isApex" BOOLEAN NOT NULL DEFAULT false,
    "status" "DomainStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "sslStatus" "DomainSslStatus" NOT NULL DEFAULT 'INITIALIZING',
    "verificationToken" TEXT NOT NULL,
    "verificationRecordName" TEXT NOT NULL,
    "verificationRecordValue" TEXT NOT NULL,
    "cnameTarget" TEXT NOT NULL DEFAULT 'fallback.gyrex.in',
    "cloudflareHostnameId" TEXT,
    "cloudflareSslStatus" TEXT,
    "verificationErrors" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabDomain_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Globally unique domain name
CREATE UNIQUE INDEX IF NOT EXISTS "LabDomain_domain_key" ON "LabDomain"("domain");

-- CreateIndex: Partial unique index to enforce at most one active/pending domain per laboratory (Fix 6)
CREATE UNIQUE INDEX IF NOT EXISTS "LabDomain_active_labId_key" ON "LabDomain"("labId") WHERE status != 'REMOVED';

-- CreateIndexes: Standard lookups
CREATE INDEX IF NOT EXISTS "LabDomain_labId_idx" ON "LabDomain"("labId");
CREATE INDEX IF NOT EXISTS "LabDomain_domain_status_idx" ON "LabDomain"("domain", "status");
CREATE INDEX IF NOT EXISTS "LabDomain_status_idx" ON "LabDomain"("status");

-- AddForeignKey: Lab relationship with cascade delete
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'LabDomain_labId_fkey'
    ) THEN
        ALTER TABLE "LabDomain" ADD CONSTRAINT "LabDomain_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
