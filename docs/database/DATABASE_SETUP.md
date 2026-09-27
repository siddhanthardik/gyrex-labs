# Gyrex Labs — Database Setup Guide

Version: 1.0  
Engine: PostgreSQL 14+ (Compatible with PostgreSQL 18)  
ORM: Prisma 7.x / 6.x with Next.js App Router  

---

## 1. Prerequisites

- PostgreSQL server running locally or accessible via network.
- Node.js v20+ / v25+ with npm.
- Environment variable `DATABASE_URL` configured.

---

## 2. Environment Configuration

Create or update `.env` or `.env.local` in the project root:

```env
DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<database>?schema=public"
```

Default local development connection:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gyrex_labs?schema=public"
```

---

## 3. Creating the Database

In PostgreSQL terminal (`psql`) or management tool (pgAdmin, DBeaver):

```sql
CREATE DATABASE gyrex_labs;
```

---

## 4. Applying Migrations & Generating Client

### Development Workflow:

1. **Validate the schema:**
   ```bash
   npx prisma validate
   ```

2. **Generate the Prisma client:**
   ```bash
   npx prisma generate
   ```

3. **Apply migrations to development database:**
   ```bash
   npx prisma migrate dev --name init_master_schema
   ```

4. **Seed development demo data:**
   ```bash
   npm run prisma:seed
   ```

### Production Workflow:

```bash
npx prisma migrate deploy
```

> **CRITICAL RULE (Section 29):**  
> Database migrations must be deterministic. Never manually modify production database structures. Every schema change must produce a Prisma migration. Never delete production data.

---

## 5. Seed Data Reference

The development seed (`prisma/seed.ts`) provisions:
- **Platform Admin (Superadmin):** `admin@gyrex.in` (Password: `GyrexDemo2026!`)
- **Platform Ops:** `ops@gyrex.in` (Password: `GyrexDemo2026!`)
- **SaaS Subscription Plans:** Growth, Professional, Enterprise
- **Centralized Test Categories:** Hematology, Biochemistry, Endocrinology, Serology & Immunology, Clinical Pathology
- **TestMaster Records:** 15 standardized investigations (CBC, ESR, LFT, KFT, Lipid Profile, FBS, PPBS, HbA1c, TSH, TFT, Vit D, Vit B12, Urine R/M, Dengue NS1, Widal)
- **Tenant 1 (Sharma Diagnostics):** `sharma-diagnostics`
  - Lab Owner: `dr.sharma@sharmadiagnostics.com` (Password: `GyrexDemo2026!`)
  - Lab Staff: `staff@sharmadiagnostics.com` (Password: `GyrexDemo2026!`)
  - Custom pricing for 10 tests and 2 packages (Full Body Checkup, Diabetes Profile)
- **Tenant 2 (Apex Clinical Labs):** `apex-labs`
  - Lab Owner: `director@apexlabs.in` (Password: `GyrexDemo2026!`)
- **Demo Patient & Isolated Order:** `Amit Kumar` with Order `GYR-2026-0001` (Paid, Report Ready)

---

## 6. Accessing Prisma Studio

To inspect database records interactively in development:

```bash
npx prisma studio
```
