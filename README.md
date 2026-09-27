# Gyrex Labs — Multi-Tenant Diagnostic Laboratory Platform

Gyrex Labs is a multi-tenant diagnostic laboratory SaaS and commerce platform that powers independent diagnostic storefronts, patient bookings, home collections, lab operations, AI-assisted prescription extraction, and platform superadministration.

---

## 🏛️ Platform Architecture & Contracts

- **Master Architecture:** [`MASTER_ARCHITECTURE.md`](./MASTER_ARCHITECTURE.md)
- **Database & Data Model:** [`DATABASE_CONTRACT.md`](./DATABASE_CONTRACT.md)
- **Authentication & RBAC:** [`AUTH_RBAC_CONTRACT.md`](./AUTH_RBAC_CONTRACT.md)
- **Patient App:** [`PATIENT_APP_CONTRACT.md`](./PATIENT_APP_CONTRACT.md)
- **Lab Admin:** [`LAB_ADMIN_CONTRACT.md`](./LAB_ADMIN_CONTRACT.md)
- **Superadmin:** [`SUPERADMIN_CONTRACT.md`](./SUPERADMIN_CONTRACT.md)
- **Integrations:** [`INTEGRATIONS_CONTRACT.md`](./INTEGRATIONS_CONTRACT.md)
- **QA & Security Audit:** [`QA_SECURITY_AUDIT.md`](./QA_SECURITY_AUDIT.md)
- **Production Deployment Runbook:** [`DEPLOYMENT_RUNBOOK.md`](./DEPLOYMENT_RUNBOOK.md)

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 20+ LTS
- PostgreSQL 15+
- npm 10+

### 2. Installation
```bash
# Clone repository
git clone https://github.com/siddhanthardik/gyrex-labs.git
cd gyrex-labs

# Install dependencies
npm ci

# Configure environment
cp .env.example .env.local

# Run database migrations and seed
npx prisma migrate dev
npm run prisma:seed
```

### 3. Run Development Server
```bash
npm run dev
```

Visit:
- Patient Storefront: `http://localhost:3000/sharma-diagnostics`
- Lab Admin Dashboard: `http://localhost:3000/lab/dashboard`
- Superadmin Portal: `http://localhost:3000/superadmin/dashboard`
- API Health Check: `http://localhost:3000/api/health`

---

## 🧪 Automated Test Suites

```bash
npm run test:integrations   # 21/21 Integrations & security tests
npm run test:security       # 19/19 Multi-tenant isolation & RBAC tests
npm run test:patient        # 16/16 Patient storefront & booking flow tests
npm run test:lab            # 15/15 Lab admin rules tests
npm run test:superadmin     # 15/15 Platform superadmin rules tests
```

---

## 📦 Production Build & Deployment

```bash
# Type check
npx tsc --noEmit

# Production build
npm run build

# Start with PM2
pm2 start ecosystem.config.cjs --only gyrex-labs
```
