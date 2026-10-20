-- AlterTable Package
ALTER TABLE "Package" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

-- CreateTable LabGalleryImage
CREATE TABLE IF NOT EXISTS "LabGalleryImage" (
    "id" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "caption" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabGalleryImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LabGalleryImage_labId_displayOrder_idx" ON "LabGalleryImage"("labId", "displayOrder");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LabGalleryImage_labId_idx" ON "LabGalleryImage"("labId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'LabGalleryImage_labId_fkey'
    ) THEN
        ALTER TABLE "LabGalleryImage" ADD CONSTRAINT "LabGalleryImage_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
