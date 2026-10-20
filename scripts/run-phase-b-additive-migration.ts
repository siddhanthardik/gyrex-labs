import { prisma } from "../lib/db/prisma";

async function runPhaseBAdditiveMigration() {
  console.log("\n=======================================================");
  console.log("   APPLYING PHASE B ADDITIVE SCHEMA MIGRATION LOCALLY  ");
  console.log("=======================================================\n");

  // Set search_path to the active PostgreSQL schema (gyrex_labs)
  await prisma.$executeRawUnsafe(`SET search_path TO "gyrex_labs", public;`);
  console.log("  ✓ Configured search_path to gyrex_labs");

  // 1. Add imageUrl to Package if not exists
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Package" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
  `);
  console.log("  ✓ Altered Package: added nullable imageUrl column");

  // 2. Create LabGalleryImage table if not exists
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "LabGalleryImage" (
      "id" TEXT NOT NULL,
      "labId" TEXT NOT NULL,
      "imageUrl" TEXT NOT NULL,
      "caption" TEXT,
      "displayOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "LabGalleryImage_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "LabGalleryImage_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  console.log("  ✓ Created table LabGalleryImage (or already exists)");

  // 3. Create indexes for LabGalleryImage
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "LabGalleryImage_labId_idx" ON "LabGalleryImage"("labId");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "LabGalleryImage_labId_displayOrder_idx" ON "LabGalleryImage"("labId", "displayOrder");
  `);
  console.log("  ✓ Created indexes on LabGalleryImage");

  console.log("\n=======================================================");
  console.log("  PHASE B LOCAL ADDITIVE MIGRATION COMPLETED");
  console.log("=======================================================\n");
}

runPhaseBAdditiveMigration()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
