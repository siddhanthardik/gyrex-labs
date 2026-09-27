# GYREX LABS — DATABASE CONTRACT

Version: 1.0  
Owner: 01 — DATABASE & DATA MODEL Specialist  
Target Audience: All Gyrex Labs Agents (Patient Agent, Lab Agent, Superadmin Agent, Auth Agent, Integration Agent)  

---

## 1. Golden Rules for All Agents

1. **MULTI-TENANT ISOLATION IS LAW:**  
   Every query for tenant data (`Order`, `Report`, `LabTest`, `Package`, `PatientPayment`, `LabPatient`) MUST include `where: { labId: session.labId, ... }`. Never query by entity `id` alone without tenant verification. Use helper assertions from `@/lib/db/tenant`.
2. **NEVER TOUCH ANOTHER LAB'S DATA:**  
   Lab A must never receive Lab B records. Cross-tenant leakage is a critical security vulnerability.
3. **GYREX LABS IS NOT AN LIS:**  
   Do not introduce analyte results, reference ranges, or instrument interfaces. Reports are stored as secure PDF `FileAsset` references.
4. **STRICT PAYMENT SEPARATION:**  
   - Diagnostic patient payments use `PatientPayment` (Patient → Lab).
   - Gyrex platform subscriptions use `SubscriptionPayment` (Lab → Gyrex).  
   Do NOT mix these or use generic payment abstractions.
5. **NO SILENT SCHEMA EDITS:**  
   Do not modify `prisma/schema.prisma` without documenting and coordinating changes through the Master Architecture.

---

## 2. Core Models Quick Reference

| Model | Ownership | Primary Purpose | Key Fields |
|---|---|---|---|
| `User` | Global | Identity & Auth | `id`, `email`, `role`, `isActive` |
| `Lab` | Tenant | Diagnostic Laboratory | `id`, `slug`, `code`, `status`, `isVerified` |
| `LabUser` | Junction | User assignment to Lab | `labId`, `userId`, `role`, `permissions` |
| `TestCategory` | Central | Clinical classifications | `name`, `slug`, `displayOrder` |
| `TestMaster` | Central | Gyrex standardized tests | `code`, `name`, `slug`, `sampleType`, `standardTatHours` |
| `LabTest` | Tenant | Lab pricing & availability | `labId`, `masterTestId`, `sellingPrice`, `isActive` |
| `Package` | Tenant | Bundled health checks | `labId`, `name`, `slug`, `sellingPrice`, `isActive` |
| `PackageTest` | Junction | Tests inside a package | `packageId`, `labTestId`, `displayOrder` |
| `Patient` | Global | Real-world patient identity | `fullName`, `phone`, `email`, `gender` |
| `LabPatient` | Junction | Lab's private patient record | `labId`, `patientId`, `uhid`, `totalSpent` |
| `Prescription` | Tenant/Patient | Prescription uploads | `patientId`, `labId`, `fileAssetId`, `status` |
| `PrescriptionExtractedItem` | Child | AI extracted tests | `prescriptionId`, `rawTestName`, `matchedMasterTestId` |
| `Order` | Tenant | Diagnostic booking | `orderNumber`, `labId`, `patientId`, `orderStatus`, `paymentStatus` |
| `OrderItem` | Child | Tests/packages in order | `orderId`, `itemName`, `unitPrice`, `totalPrice` |
| `Collection` | Child | Home sample collection | `orderId`, `labId`, `scheduledDate`, `scheduledSlot` |
| `PatientPayment` | Tenant | Diagnostic fee (Flow A) | `paymentNumber`, `orderId`, `labId`, `status`, `gatewayPaymentId` |
| `Report` | Tenant | Released diagnostic report | `reportNumber`, `orderId`, `labId`, `fileAssetId`, `status` |
| `FileAsset` | Tenant/Global | Protected file metadata | `labId`, `category`, `storagePath`, `accessClassification` |
| `SubscriptionPlan` | Gyrex | SaaS billing tiers | `code`, `name`, `priceMonthly`, `priceYearly` |
| `Subscription` | Tenant | Lab SaaS subscription | `labId`, `planId`, `status`, `currentPeriodEnd` |
| `SubscriptionInvoice` | Tenant | Platform SaaS invoice | `invoiceNumber`, `labId`, `amountDue`, `status` |
| `SubscriptionPayment` | Tenant | SaaS subscription fee (Flow B)| `paymentNumber`, `subscriptionInvoiceId`, `labId`, `status` |
| `LabStoreSettings` | Tenant | Public storefront config | `labId`, `heroHeadline`, `homeCollectionFee`, `primaryColor` |
| `LabPaymentSettings`| Tenant | Lab's Razorpay keys | `labId`, `razorpayKeyId`, `cashOnCollectionEnabled` |
| `AuditLog` | Append-only | Security audit trail | `actorUserId`, `action`, `entityType`, `entityId`, `labId` |

---

## 3. Controlled Enums

### `OrderStatus`
`PENDING_PAYMENT` → `CONFIRMED` → `COLLECTION_SCHEDULED` → `SAMPLE_COLLECTED` → `PROCESSING` → `REPORT_READY` → `COMPLETED`  
*(Or `CANCELLED`)*

### `PaymentStatus`
`PENDING`, `AUTHORIZED`, `PAID`, `FAILED`, `REFUNDED`, `PARTIALLY_REFUNDED`, `CASH_ON_COLLECTION`

### `UserRole`
- Platform: `SUPERADMIN`, `PLATFORM_ADMIN`, `OPERATIONS_ADMIN`, `FINANCE_ADMIN`, `SUPPORT_ADMIN`, `CATALOGUE_ADMIN`
- Lab: `LAB_OWNER`, `LAB_ADMIN`, `LAB_STAFF`

### `CollectionType`
`HOME_COLLECTION`, `LAB_VISIT`

### `ReportStatus`
`DRAFT`, `FINAL`, `AMENDED`, `CANCELLED`

### `SubscriptionStatus`
`TRIALING`, `ACTIVE`, `PAST_DUE`, `CANCELLED`, `EXPIRED`, `PAUSED`

---

## 4. Query Guidelines for Feature Agents

### Patient Agent (`app/(patient)`)
- Patient queries tests via: `prisma.labTest.findMany({ where: { lab: { slug }, isActive: true }, include: { masterTest: true } })`.
- Patient places orders using direct connection to the target `labId`.

### Lab Agent (`app/lab`)
- Always obtain `labId` from the authenticated session context.
- Use:
  ```typescript
  const orders = await prisma.order.findMany({
    where: { labId: session.labId, orderStatus: filterStatus },
    include: { items: true, patient: true, collection: true },
    orderBy: { createdAt: "desc" },
  });
  ```

### Superadmin Agent (`app/superadmin`)
- Operations operate at platform level across all labs.
- Every state transition on a lab (approve, suspend) or TestMaster mutation MUST log to `recordAuditLog()`.

---

## 5. Change Control Process

If your feature requires a database change:
1. **DO NOT** edit `prisma/schema.prisma` directly.
2. Submit a request detailing:
   - Requested Change
   - Business Reason
   - Affected Models & Codebases
   - Migration Impact
3. Coordinate with the Database Specialist for safe migration execution.
