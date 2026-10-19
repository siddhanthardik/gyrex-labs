import { prisma } from "../lib/db/prisma";
import * as fs from "fs";
import * as path from "path";

async function runLocalAdditiveMigration() {
  console.log("\n=======================================================");
  console.log("   APPLYING ADDITIVE SCHEMA MIGRATION LOCALLY          ");
  console.log("=======================================================\n");

  const sqlPath = path.join(
    __dirname,
    "../prisma/migrations/20261020020000_add_branches_and_service_areas/migration.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf-8");

  console.log("1. Inspecting SQL statements to execute...");
  console.log("-------------------------------------------------------");
  console.log(sql);
  console.log("-------------------------------------------------------\n");

  // Execute in PostgreSQL using raw query
  console.log("2. Executing additive migration against local/dev database...");

  // Set search_path to the active PostgreSQL schema (gyrex_labs)
  await prisma.$executeRawUnsafe(`SET search_path TO "gyrex_labs", public;`);
  console.log("  ✓ Configured search_path to gyrex_labs");

  // First, create enum if not exists
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "BranchAssignmentMode" AS ENUM ('AUTOMATIC', 'PATIENT_CHOICE');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
  console.log("  ✓ Created enum BranchAssignmentMode (or already exists)");

  // Alter LabStoreSettings
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "LabStoreSettings" ADD COLUMN IF NOT EXISTS "branchAssignmentMode" "BranchAssignmentMode" NOT NULL DEFAULT 'AUTOMATIC';
  `);
  console.log("  ✓ Altered LabStoreSettings: added branchAssignmentMode");

  // Alter Collection
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "branchId" TEXT;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "branchSnapshot" JSONB;
  `);
  console.log("  ✓ Altered Collection: added nullable branchId and branchSnapshot");

  // Alter Order
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "idempotencyHash" TEXT;
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Order_idempotencyKey_key" ON "Order"("idempotencyKey");
  `);
  console.log("  ✓ Altered Order: added unique idempotencyKey and idempotencyHash");

  // Create LabBranch table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "LabBranch" (
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
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "LabBranch_pkey" PRIMARY KEY ("id")
    );
  `);
  console.log("  ✓ Created table LabBranch");

  // Create LabServiceArea table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "LabServiceArea" (
      "id" TEXT NOT NULL,
      "labId" TEXT NOT NULL,
      "branchId" TEXT,
      "pincode" TEXT NOT NULL,
      "localityName" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "LabServiceArea_pkey" PRIMARY KEY ("id")
    );
  `);
  console.log("  ✓ Created table LabServiceArea");

  // Create Indexes
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "LabBranch_labId_code_key" ON "LabBranch"("labId", "code");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "LabBranch_labId_isActive_idx" ON "LabBranch"("labId", "isActive");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "LabBranch_postalCode_idx" ON "LabBranch"("postalCode");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "LabServiceArea_labId_branchId_pincode_key" ON "LabServiceArea"("labId", "branchId", "pincode");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "LabServiceArea_pincode_idx" ON "LabServiceArea"("pincode");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "LabServiceArea_labId_pincode_isActive_idx" ON "LabServiceArea"("labId", "pincode", "isActive");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "LabServiceArea_branchId_pincode_isActive_idx" ON "LabServiceArea"("branchId", "pincode", "isActive");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "Collection_branchId_idx" ON "Collection"("branchId");
  `);
  console.log("  ✓ Created all performance and uniqueness indexes");

  // Add Foreign Keys if not exist
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "Collection" ADD CONSTRAINT "Collection_branchId_fkey"
      FOREIGN KEY ("branchId") REFERENCES "LabBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "LabBranch" ADD CONSTRAINT "LabBranch_labId_fkey"
      FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "LabServiceArea" ADD CONSTRAINT "LabServiceArea_labId_fkey"
      FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "LabServiceArea" ADD CONSTRAINT "LabServiceArea_branchId_fkey"
      FOREIGN KEY ("branchId") REFERENCES "LabBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
  console.log("  ✓ Configured referential constraints with CASCADE and SET NULL");

  console.log("\n=======================================================");
  console.log("   ADDITIVE MIGRATION COMPLETED SUCCESSFULLY!          ");
  console.log("=======================================================\n");
}

runLocalAdditiveMigration()
  .catch((err) => {
    console.error("Migration execution failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
