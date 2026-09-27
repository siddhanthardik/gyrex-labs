# Gyrex Labs — Database Indexes & Performance Strategy

Version: 1.0  
Status: APPROVED FOUNDATION  

---

## 1. Indexing Strategy Overview

Indexes in Gyrex Labs are deliberately placed on high-frequency query paths to:
1. Guarantee instant multi-tenant scoping (`labId`).
2. Optimize order searching and lifecycle state transitions.
3. Accelerate centralized catalogue lookups (`TestMaster` and `LabTest`).
4. Support auditability and compliance lookups without full-table scans.
5. Prevent data corruption with targeted unique constraints.

---

## 2. Table-by-Table Index Inventory

### `User`
- `@@index([email])`: Fast lookup during authentication.
- `@@index([role])`: Platform administrative user role filtering.

### `Lab` (Tenant)
- `@@unique([slug])`: Unique patient storefront subdomain/path lookup (`labs.gyrex.in/{labSlug}`).
- `@@unique([code])`: Unique internal diagnostic lab identifier.
- `@@index([status])`: Filtering active vs pending verification labs.
- `@@index([city])`: Regional geo-directory filtering.

### `LabUser`
- `@@unique([labId, userId])`: Ensures a user has a single role assignment per laboratory tenant.
- `@@index([labId])`: Fast lookup of all team members for a lab dashboard.
- `@@index([userId])`: Fast resolution of which labs a user belongs to upon login.

### `TestCategory`
- `@@unique([slug])`: Category navigation URLs.
- `@@unique([name])`: Avoids duplicate category creation.

### `TestMaster` (Central Catalogue)
- `@@unique([code])`: Standardized code (e.g. `CBC`, `LFT`, `TSH`).
- `@@unique([slug])`: SEO-friendly test slug.
- `@@index([categoryId])`: Category page browsing.
- `@@index([name])`: Search autocomplete.

### `LabTest` (Tenant Catalogue)
- `@@unique([labId, masterTestId])`: Prevents duplicate entries of the same master investigation in a lab's catalogue.
- `@@index([labId])`: Multi-tenant boundary isolation.
- `@@index([masterTestId])`: Reverse lookup to find which labs offer a specific test.
- `@@index([labId, isActive])`: High-speed storefront catalogue querying for active tests.

### `Package` & `PackageTest`
- `Package`:
  - `@@unique([labId, slug])`: Unique package URL per lab.
  - `@@index([labId])`: Tenant isolation.
  - `@@index([labId, isActive])`: Storefront package listing.
- `PackageTest`:
  - `@@unique([packageId, labTestId])`: Prevents adding duplicate tests to the same package.
  - `@@index([packageId])`: Retrieves all tests within a package.
  - `@@index([labTestId])`: Reverse lookup for test dependency checks.

### `Patient` & `LabPatient`
- `Patient`:
  - `@@index([phone])`: Core identifier lookup during repeat patient bookings and OTP verification.
  - `@@index([email])`: Lookup and digital communication.
- `LabPatient`:
  - `@@unique([labId, patientId])`: Exactly one tenant record per real-world patient.
  - `@@index([labId])`: Lab's patient directory.
  - `@@index([labId, uhid])`: Laboratory Unique Hospital/Lab ID search.

### `Order` & `OrderItem`
- `Order`:
  - `@@unique([orderNumber])`: Safe public/patient order tracking reference.
  - `@@index([labId])`: Multi-tenant isolation.
  - `@@index([patientId])`: Patient booking history.
  - `@@index([labId, orderStatus])`: Lab operations dashboard filtering (e.g. `SAMPLE_COLLECTED`, `REPORT_READY`).
  - `@@index([labId, createdAt])`: Financial reporting and order dispatch timeline.
- `OrderItem`:
  - `@@index([orderId])`: Order line item retrieval.
  - `@@index([labTestId])`: Revenue aggregation per test.
  - `@@index([packageId])`: Revenue aggregation per package.

### `Collection`
- `@@unique([orderId])`: 1-to-1 relationship with Order.
- `@@index([labId])`: Multi-tenant filtering.
- `@@index([labId, scheduledDate])`: Phlebotomist home collection scheduling route optimization.

### `PatientPayment` (Flow A: Patient -> Lab)
- `@@unique([paymentNumber])`: Unique transaction tracking number.
- `@@index([orderId])`: Payment verification for diagnostic orders.
- `@@index([labId])`: Lab revenue reconciliation.
- `@@index([gatewayPaymentId])`: Razorpay webhook idempotency lookup.
- `@@index([status])`: Reconciliation of pending vs paid transactions.

### `Report` & `FileAsset`
- `Report`:
  - `@@unique([reportNumber])`: Unique diagnostic report identifier.
  - `@@index([orderId])`: Fetching report for an order.
  - `@@index([labId])`: Lab report center filtering.
  - `@@index([patientId])`: Patient report vault.
  - `@@index([fileAssetId])`: File reference resolution.
- `FileAsset`:
  - `@@index([labId])`: Storage auditing per tenant.
  - `@@index([category])`: Partitioning prescriptions, reports, invoices.
  - `@@index([storagePath])`: Deduplication and storage verification.

### `Subscription`, `SubscriptionInvoice`, `SubscriptionPayment` (Flow B: Lab -> Gyrex)
- `Subscription`:
  - `@@unique([labId])`: Enforces single active platform subscription per laboratory.
  - `@@index([status])`: SaaS recurring billing monitor.
- `SubscriptionInvoice`:
  - `@@unique([invoiceNumber])`: Unique statutory invoice number.
  - `@@index([labId])`: Lab billing history.
  - `@@index([subscriptionId])`: Invoice breakdown per subscription.
- `SubscriptionPayment`:
  - `@@unique([paymentNumber])`: SaaS transaction reference.
  - `@@index([gatewayPaymentId])`: Razorpay subscription webhook lookup.

### `AuditLog`
- `@@index([labId])`: Audit trail filtering for a specific laboratory.
- `@@index([entityType, entityId])`: Complete lifecycle history of any entity (e.g. changes to an Order or Report).
- `@@index([actorUserId])`: User activity investigation.
- `@@index([action])`: Security event alerting (e.g. `LOGIN_FAILED`, `LAB_SUSPENDED`).
- `@@index([createdAt])`: Time-series log inspection and rotation.
