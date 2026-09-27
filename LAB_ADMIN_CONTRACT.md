# GYREX LABS — LAB ADMIN CONTRACT

**Document Version:** 1.0.0  
**Status:** APPROVED ARCHITECTURAL CONTRACT  
**Module:** 04 — LAB ADMIN  
**Primary Domain:** `labs.gyrex.in/lab`  
**Downstream Consumers:** Superadmin, Integrations (Artifact 06), QA & Security Audit, DevOps/Deployment

---

## 1. EXECUTIVE SUMMARY & SYSTEM BOUNDARIES

The **Lab Admin** application is the dedicated management portal for diagnostic laboratory owners, administrators, and laboratory operational staff. It allows laboratories to:
1. Configure and brand their patient-facing digital storefront.
2. Build and manage their diagnostic test catalogue and health checkup packages.
3. Track and manage incoming patient orders and home collection logistics.
4. Securely upload and deliver clinical diagnostic PDF reports.
5. Configure direct patient-to-lab payment mechanisms (Cash, UPI, Razorpay).
6. Manage their Gyrex SaaS platform subscription and billing history.
7. Manage staff accounts and granular operational permissions.

### Critical Boundary Constraints:
- **Gyrex Labs is NOT an LIS:** Analyte entry, reference range validation, QC approval, analyzer interop, and reagent inventory remain strictly within the laboratory's clinical LIS.
- **Strict Payment Separation:**
  - **Patient Diagnostic Payments:** Patient → Laboratory directly (Gyrex is never merchant of record).
  - **Gyrex Platform Subscription:** Laboratory → Gyrex SaaS billing.
- **Zero Client-Supplied Tenant Trust:** All operations derive `labId` exclusively from the verified server-side JWT session token. No client-supplied `labId` query param or body property can override the authenticated tenant.

---

## 2. ROUTES & ENDPOINTS SPECIFICATION

### 2.1 Web Application UI Routes (`/lab/*`)

| Route | Role Requirements | Purpose |
|---|---|---|
| `/lab` | Any authenticated Lab user | Redirects automatically to `/lab/dashboard` |
| `/lab/dashboard` | Any Lab Role | Operational overview: today's orders, pending collections, ready reports, test counts |
| `/lab/onboarding` | `LAB_OWNER`, `LAB_ADMIN` | 6-step guided wizard for initial storefront setup (10–15 min flow) |
| `/lab/catalogue` | Any Lab Role | Diagnostic catalogue table, price management, search, active toggle |
| `/lab/catalogue/test-master` | `LAB_OWNER`, `LAB_ADMIN` | Browse 1,000+ Gyrex Test Master definitions and import with custom selling prices |
| `/lab/catalogue/[labTestId]` | `LAB_OWNER`, `LAB_ADMIN` | Edit lab test selling price, TAT, preparation instructions, home collection toggle |
| `/lab/catalogue/import` | `LAB_OWNER`, `LAB_ADMIN` | CSV/Excel bulk catalogue import with automated fuzzy matching and review |
| `/lab/packages` | Any Lab Role | Health package directory, savings indicator, active/inactive controls |
| `/lab/packages/new` | `LAB_OWNER`, `LAB_ADMIN` | Create new multi-test package with live savings calculation |
| `/lab/packages/[packageId]` | `LAB_OWNER`, `LAB_ADMIN` | Edit package details, tests inclusion, and price |
| `/lab/orders` | Any Lab Role | Filterable diagnostic orders table (status, payment, collection type, search) |
| `/lab/orders/[orderNumber]` | Any Lab Role | Order detail, patient details, collection status, status transition actions, report upload |
| `/lab/collections` | Any Lab Role | Home collection schedule, assigned phlebotomist details, collection status updates |
| `/lab/patients` | Any Lab Role | Laboratory patient directory, order histories, contact information |
| `/lab/reports` | Any Lab Role | Diagnostic report deliveries, upload dialog, delivery tracking |
| `/lab/payment-settings` | `LAB_OWNER` | Configure Pay at Collection, Direct Lab UPI ID, and direct Razorpay Merchant Keys |
| `/lab/subscription` | `LAB_OWNER` | View Gyrex plan, billing interval, payment method, switch plan, cancel |
| `/lab/staff` | `LAB_OWNER` | Staff user directory, invite staff member, deactivate staff account |
| `/lab/settings` | `LAB_OWNER`, `LAB_ADMIN` | Storefront branding, logo, contact, address, operating hours, home collection limits |
| `/lab/publish` | `LAB_OWNER`, `LAB_ADMIN` | Pre-launch readiness checklist and store activation toggle |
| `/lab/support` | Any Lab Role | Platform documentation, FAQs, and support contact channels |

### 2.2 Secure REST API Routes (`/api/lab/*`)

All API routes require `Cookie: gyrex_session` bearing a valid JWT token with an authorized lab membership.

| Method | Endpoint | Permission Required | Description |
|---|---|---|---|
| `GET` | `/api/lab/catalogue` | `catalogue.manage` or role read | List all lab tests with pagination, search, category filter |
| `POST` | `/api/lab/catalogue` | `catalogue.manage` | Add a test from TestMaster to lab catalogue |
| `GET` | `/api/lab/catalogue/[labTestId]` | `catalogue.manage` | Fetch single lab test details |
| `PATCH` | `/api/lab/catalogue/[labTestId]` | `catalogue.manage` | Update test selling price, TAT, preparation, home collection |
| `GET` | `/api/lab/catalogue/test-master` | `catalogue.manage` | Search central Test Master catalogue |
| `POST` | `/api/lab/catalogue/import` | `catalogue.manage` | Actions `ANALYZE` (fuzzy match CSV rows) or `CONFIRM` (commit tests) |
| `GET` | `/api/lab/packages` | `catalogue.manage` or role read | List health packages for the lab |
| `POST` | `/api/lab/packages` | `catalogue.manage` | Create a new health package |
| `GET` | `/api/lab/packages/[packageId]` | `catalogue.manage` | Get package detail with included tests |
| `PATCH` | `/api/lab/packages/[packageId]` | `catalogue.manage` | Update package details, pricing, test items |
| `GET` | `/api/lab/orders` | `orders.read` | List lab orders with filtering by status and date |
| `PATCH` | `/api/lab/orders/[orderId]/status` | `orders.update` | Advance order state machine (`CONFIRMED` → `PROCESSING` etc.) |
| `PATCH` | `/api/lab/collections/[collectionId]` | `orders.update` | Update phlebotomist name, phone, slot, collection status |
| `GET` | `/api/lab/patients` | `patients.read` | List patients who have booked with this laboratory |
| `GET` | `/api/lab/reports` | `reports.read` | List diagnostic reports generated by this lab |
| `POST` | `/api/lab/reports` | `reports.upload` | Upload new report FileAsset and link to order |
| `GET` | `/api/lab/payment-settings` | `lab.settings.manage` | Get current patient diagnostic payment configuration |
| `POST` | `/api/lab/payment-settings` | `lab.settings.manage` | Save UPI ID, Pay at Collection flag, Razorpay keys |
| `GET` | `/api/lab/subscription` | `lab.settings.manage` | Get SaaS plan, billing status, and invoices |
| `POST` | `/api/lab/subscription` | `lab.settings.manage` | Upgrade or downgrade Gyrex subscription plan |
| `DELETE` | `/api/lab/subscription` | `lab.settings.manage` | Request cancellation of Gyrex subscription |
| `GET` | `/api/lab/staff` | `staff.manage` | List all staff members for the laboratory |
| `POST` | `/api/lab/staff` | `staff.manage` | Invite a new staff user with designated role |
| `PATCH` | `/api/lab/staff` | `staff.manage` | Activate/deactivate a staff membership |
| `GET` | `/api/lab/settings` | `lab.settings.manage` | Get store branding and operational settings |
| `PATCH` | `/api/lab/settings` | `lab.settings.manage` | Update store branding and operating rules |
| `GET` | `/api/lab/publish` | `lab.settings.manage` | Run and return 5-point publishing readiness checklist |
| `POST` | `/api/lab/publish` | `lab.settings.manage` | Activate digital storefront if checklist passes |

---

## 3. ROLE & PERMISSIONS CONTRACT

### 3.1 Role Hierarchy in Lab Context

| Role | Scope | Permitted Capabilities |
|---|---|---|
| `LAB_OWNER` | Full Laboratory Access | All operations: catalogue, pricing, orders, reports, staff management, payment credentials, SaaS billing, publishing. |
| `LAB_ADMIN` | Operational Management | Catalogue, pricing, orders, home collections, patient directory, reports, store branding, publishing. Cannot invite owners or change SaaS subscription. |
| `LAB_STAFF` | Operational Execution | View orders, update collection status, assign collectors, view patients, view and upload diagnostic reports. Read-only on catalogue and packages. No access to financial/staff settings. |

### 3.2 Granular Permissions Matrix

- `catalogue.manage`: Create, update, toggle tests, import CSVs, manage packages.
- `orders.read`: View order list and order details.
- `orders.update`: Update order lifecycle statuses and assign phlebotomists.
- `patients.read`: View patient contact details and order histories for this lab.
- `reports.read`: View diagnostic reports for this lab's orders.
- `reports.upload`: Upload PDF reports, replace amended reports.
- `staff.manage`: Invite, activate, or deactivate lab staff accounts.
- `lab.settings.manage`: Update store settings, payment gateways, and store publishing.

---

## 4. MODULE CONTRACTS

### 4.1 Catalogue & Test Master Contract
- Central `TestMaster` records cannot be updated or deleted by laboratory administrators.
- When a laboratory adds a test, a `LabTest` record is created linking `labId` to `testMasterId`.
- Laboratory controls:
  - `sellingPrice`: Lab-specific patient price (server-authoritative).
  - `isActive`: Boolean flag; inactive tests are excluded from patient store.
  - `homeCollection`: Boolean flag indicating if sample can be drawn at home.
  - `customTatHours`: Lab-specific turnaround time overriding master default.
  - `preparation`: Lab-specific fasting or sample preparation instructions.
- Bulk Import:
  - Supports CSV/Excel files with headers `Name`, `Price`, `Category`.
  - Performs normalized fuzzy matching against `TestMaster.code` and `TestMaster.name`.
  - Confidence scoring classifies into:
    - Auto-Matched (confidence >= 85%)
    - Needs Review (confidence 50% - 84%)
    - Unmatched (confidence < 50%)
  - No test is published automatically without explicit user confirmation.

### 4.2 Health Packages Contract
- Architecture: `Package` → `PackageTest` → `LabTest`.
- Tests included in a package must strictly belong to the same laboratory (`labId`).
- Calculations:
  - `individualTotal`: Sum of current `LabTest.sellingPrice` for all included tests.
  - `packagePrice`: Configured package price (must be <= `individualTotal`).
  - `savings`: Server-calculated as `individualTotal - packagePrice`.
  - Client-submitted savings or totals are strictly discarded.

### 4.3 Orders & State Machine Contract
Allowed order status transitions:
```
PENDING_PAYMENT ──► CONFIRMED ──► COLLECTION_SCHEDULED ──► SAMPLE_COLLECTED ──► PROCESSING ──► REPORT_READY ──► COMPLETED
       │                 │                     │                     │                │
       ▼                 ▼                     ▼                     ▼                ▼
   CANCELLED         CANCELLED             CANCELLED             CANCELLED        CANCELLED
```
- No arbitrary jumps permitted (e.g. `PENDING_PAYMENT` directly to `COMPLETED` is rejected).
- When a report is uploaded, the order automatically transitions to `REPORT_READY` (if not already completed).
- Orders cannot be accessed across laboratories. Attempting to view an order belonging to another lab results in HTTP 404 (or 403).

### 4.4 Diagnostic Reports & File Asset Security Contract
- Reports are stored as private assets using `FileAsset` records.
- Never exposed via public CDN or permanent public URLs.
- Access requires authenticated session with matching `labId` or order ownership.
- When a report is updated, an amendment log is recorded in `AuditLog` with previous asset ID and operator ID.
- LIS Boundary: Clinical analyte results, reference ranges, and pathologist validation are performed in the lab's external LIS before PDF generation.

### 4.5 Patient Payment Settings Contract
- Determines how patients pay the laboratory (`PATIENT` → `LAB`).
- Supported modes:
  - `payAtCollection`: Cash or direct UPI upon sample collection.
  - `upiId`: Laboratory's virtual payment address (VPA) displayed to patients.
  - `razorpayEnabled`: Direct merchant integration with the lab's own API keys.
- Gyrex is never the merchant of record for diagnostic tests.
- Razorpay Secret Keys are masked when returned to the frontend.

### 4.6 Gyrex Subscription & Billing Contract
- Determines how the laboratory pays Gyrex (`LAB` → `GYREX`).
- Current SaaS tiers:
  - `STARTER`: Free/trial tier with standard limits.
  - `GROWTH`: ₹1,999/month, home collection dispatch, advanced reporting.
  - `ENTERPRISE`: ₹4,999/month, multi-branch, dedicated account manager.
- Shows subscription status (`ACTIVE`, `PAST_DUE`, `CANCELED`), renewal date, payment method on file, and downloadable platform invoices.

### 4.7 Storefront Publishing & Verification Contract
- Publishing Readiness Checklist enforces 5 criteria:
  1. Lab Details Complete (Name, phone, address, pincode).
  2. Catalogue Configured (At least 1 active diagnostic test).
  3. Patient Payment Method Configured (Pay at collection or UPI/Razorpay enabled).
  4. Store Settings Valid (Store name and description present).
  5. Laboratory Status Permitted (Must not be `SUSPENDED`).
- Verification Authority:
  - `isVerified` is strictly a platform/Superadmin function.
  - Lab Admin cannot verify its own laboratory under any circumstance.
  - Suspended laboratories are strictly blocked from publishing.

---

## 5. SECURITY & TENANT ISOLATION SPECIFICATION

1. **Authentication Enforcement:** Handled via `requireLabTenant()` in `lib/auth/lab-auth.ts`. Any unauthenticated request redirects to `/login` or returns 401.
2. **Tenant Scoping:** All database queries are filtered with `{ where: { labId: session.labMembership.labId } }`.
3. **Role Enforcement:** All mutating actions verify specific granular permissions before executing.
4. **Audit Logging:** Every critical change (price change, status transition, report upload, staff change, payment change) is logged via `recordAuditLog()` in `lib/db/audit.ts`.
5. **No Secret Leakage:** Database credentials, JWT secrets, passwords, and payment secrets are never exposed in API responses or error logs.

---

## 6. VALIDATION & TEST SUITE

The Lab Admin module is accompanied by an automated test suite in `scripts/test-lab-admin.ts` verifying all 15 mandatory critical rules:
1. Lab Admin can access own laboratory.
2. Lab Admin cannot access another laboratory (403 Forbidden).
3. Lab Staff only sees authorized operational functions.
4. Lab Admin cannot access Superadmin platform functions.
5. Test changes affect only the authorized laboratory.
6. Lab A cannot modify Lab B test prices.
7. Lab A cannot view Lab B orders.
8. Lab A cannot access Lab B reports.
9. Packages can only contain valid LabTests from the same laboratory.
10. Bulk imported tests cannot silently map to another laboratory.
11. Patient store shows only active tests for the correct laboratory.
12. Patient store shows only active packages for the correct laboratory.
13. Suspended laboratories cannot publish or operate.
14. Lab Admin cannot mark its own laboratory as verified.
15. Client-supplied `labId` parameter cannot bypass authorization.

---

## 7. SIGNOFF & COMPLIANCE

| Criterion | Result |
|---|---|
| Master Architecture Compliance | **100% COMPLIANT** |
| Database Contract Compliance | **100% COMPLIANT** |
| Auth & RBAC Contract Compliance | **100% COMPLIANT** |
| Patient App Compatibility | **100% COMPLIANT** |
| Production Build Verification | **PASS (`next build` - Exit 0)** |
| TypeScript Type Checking | **PASS (`npx tsc --noEmit` - Exit 0)** |
| ESLint Verification | **PASS (`npm run lint` - Exit 0)** |
| Security Test Suite | **PASS (19/19 Tests Passed)** |
| Lab Admin Test Suite | **PASS (15/15 Tests Passed)** |
