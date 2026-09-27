# Gyrex Labs — Multi-Tenancy Architecture

Version: 1.0  
Status: MANDATORY ENFORCEMENT  

---

## 1. Core Principles

Gyrex Labs is a multi-tenant platform where **every diagnostic laboratory is an isolated tenant**.

The primary tenant entity is `Lab` (`id`, `slug`, `code`).

### The Golden Multi-Tenancy Rule
> **Lab A must NEVER be able to retrieve or mutate Lab B data through:**
> - URL manipulation (e.g. altering `/api/orders/[id]`)
> - API requests or predictable ID guessing
> - Direct database queries missing `labId` scoping
> - Shared frontend cache or global state
> - Search parameters

---

## 2. Direct Tenant Ownership

Every record created within the operational or commercial boundary of a laboratory MUST contain a direct `labId` / `tenantId` foreign key.

| Model | Tenant Column | Description |
|---|---|---|
| `LabUser` | `labId` | Links platform users to specific laboratory staffs/roles |
| `LabStoreSettings` | `labId` | Storefront visual branding, fees, and operational hours |
| `LabPaymentSettings`| `labId` | Lab's direct merchant credentials (e.g. Razorpay key) |
| `LabTest` | `labId` | Lab-specific pricing, TAT, and home collection flags |
| `Package` | `labId` | Health package bundled by the laboratory |
| `LabPatient` | `labId` | Private junction between global patient and lab context |
| `Order` | `labId` | Diagnostic order placed with this specific laboratory |
| `Collection` | `labId` | Home collection appointment associated with order |
| `PatientPayment` | `labId` | Diagnostic payment from patient to the laboratory |
| `Report` | `labId` | Released diagnostic report metadata |
| `Subscription` | `labId` | SaaS platform subscription to Gyrex |
| `SubscriptionInvoice`| `labId`| SaaS subscription invoice from Gyrex |
| `FileAsset` | `labId` | Private storage reference for lab documents/reports |
| `AuditLog` | `labId` (opt)| Tenant context for audit trail filtering |

---

## 3. The Patient Multi-Tenant Nuance

In diagnostic commerce, a real-world human patient may visit **Lab A** (e.g. near home) and **Lab B** (e.g. specialized pathology lab in another city).

### Design Solution:
1. **Global Entity `Patient`:**
   - Holds core demographic identity (`fullName`, `phone`, `gender`, `dateOfBirth`).
   - Phone and email are indexed for lookup.
2. **Tenant Junction `LabPatient`:**
   - Represents the patient *within* a specific laboratory's tenancy.
   - Contains lab-private data: `uhid` (Unique Hospital/Lab ID), private internal clinical notes, visit counts, and total revenue.
3. **Strict Order Isolation:**
   - Every `Order` is bound directly to `labId` AND `patientId`.
   - Even if the same person has orders in Lab A and Lab B, Lab A can **ONLY** query orders where `Order.labId == Lab_A_Id`.

---

## 4. Query Scoping Helper (`lib/db/tenant.ts`)

All API routes and service layers MUST utilize the provided tenant assertion helpers:

```typescript
import { assertOrderBelongsToTenant, assertReportBelongsToTenant } from "@/lib/db/tenant";

// Inside a Lab Admin API Route or Server Action:
const order = await assertOrderBelongsToTenant(orderId, session.labId);
```

Never execute unconditional queries like:
```typescript
// ❌ DANGEROUS — INSECURE CROSS-TENANT VULNERABILITY:
const order = await prisma.order.findUnique({ where: { id: orderId } });

// ✅ SECURE — STRICT TENANT ISOLATION:
const order = await prisma.order.findFirst({
  where: {
    id: orderId,
    labId: session.labId,
  },
});
```

---

## 5. Superadmin Access Boundary

- `SUPERADMIN` and `PLATFORM_ADMIN` operate across the platform level.
- Platform administrators can access tenant data only through audited administrative endpoints.
- All administrative actions are recorded in `AuditLog` with `actorUserId`, `actorRole`, `action`, and `labId`.
