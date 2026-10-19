-- CreateEnum
CREATE TYPE "BranchAssignmentMode" AS ENUM ('AUTOMATIC', 'PATIENT_CHOICE');

-- AlterTable LabStoreSettings
ALTER TABLE "LabStoreSettings" ADD COLUMN "branchAssignmentMode" "BranchAssignmentMode" NOT NULL DEFAULT 'AUTOMATIC';

-- AlterTable Collection
ALTER TABLE "Collection" ADD COLUMN "branchId" TEXT;
ALTER TABLE "Collection" ADD COLUMN "branchSnapshot" JSONB;

-- AlterTable Order
ALTER TABLE "Order" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "Order" ADD COLUMN "idempotencyHash" TEXT;
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");

-- CreateTable LabBranch
CREATE TABLE "LabBranch" (
    "id" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "locality" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "operatingHours" TEXT,
    "homeCollectionAvailable" BOOLEAN NOT NULL DEFAULT true,
    "homeCollectionFee" DECIMAL(10,2),
    "freeHomeCollectionThreshold" DECIMAL(10,2),
    "maxDailyCapacity" INTEGER DEFAULT 50,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabBranch_pkey" PRIMARY KEY ("id")
);

-- CreateTable LabServiceArea
CREATE TABLE "LabServiceArea" (
    "id" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "branchId" TEXT,
    "pincode" TEXT NOT NULL,
    "localityName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabServiceArea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LabBranch_labId_code_key" ON "LabBranch"("labId", "code");
CREATE INDEX "LabBranch_labId_isActive_idx" ON "LabBranch"("labId", "isActive");
CREATE INDEX "LabBranch_postalCode_idx" ON "LabBranch"("postalCode");

-- CreateIndex
CREATE UNIQUE INDEX "LabServiceArea_labId_branchId_pincode_key" ON "LabServiceArea"("labId", "branchId", "pincode");
CREATE INDEX "LabServiceArea_pincode_idx" ON "LabServiceArea"("pincode");
CREATE INDEX "LabServiceArea_labId_pincode_isActive_idx" ON "LabServiceArea"("labId", "pincode", "isActive");
CREATE INDEX "LabServiceArea_branchId_pincode_isActive_idx" ON "LabServiceArea"("branchId", "pincode", "isActive");

-- CreateIndex
CREATE INDEX "Collection_branchId_idx" ON "Collection"("branchId");

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "LabBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabBranch" ADD CONSTRAINT "LabBranch_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabServiceArea" ADD CONSTRAINT "LabServiceArea_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabServiceArea" ADD CONSTRAINT "LabServiceArea_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "LabBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
