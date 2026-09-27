# GYREX LABS — SUPERADMIN CONTRACT

Version: 1.0  
Status: RATIFIED & OPERATIONAL  
Owner: Artifact 05 — SUPERADMIN  
Upstream Contracts:
- `GYREX LABS — MASTER ARCHITECTURE`
- `DATABASE_CONTRACT.md`
- `AUTH_RBAC_CONTRACT.md`
- `PATIENT_APP_CONTRACT.md`
- `LAB_ADMIN_CONTRACT.md`

---

## 1. PURPOSE & CORE PRINCIPLE

Superadmin owns the internal platform administration system of **Gyrex Labs**.

### Core Invariant
- **LAB ADMIN**: Manages ONE diagnostic laboratory.
- **PATIENT**: Interacts with ONE laboratory's digital storefront.
- **SUPERADMIN**: Manages the multi-tenant **PLATFORM**.

Superadmin does NOT operate individual laboratories as if it were a Lab Admin account. Superadmin provides controlled, platform-level visibility, policy enforcement, catalogue standardization, and operational support across all laboratories.

Superadmin is **NOT** a Laboratory Information System (LIS). Under no circumstances does Superadmin edit clinical results, analyte entries, reference ranges, pathologist approvals, or quality controls.

---

## 2. URLS & ROUTING CONVENTIONS

### 2.1 Route Namespace
All Superadmin UI routes are located under `/superadmin`:
- Dashboard: `/superadmin/dashboard`
- Labs:
  - All Labs: `/superadmin/labs`
  - Lab Detail: `/superadmin/labs/[labId]`
  - Pending Verification: `/superadmin/labs/pending`
  - Suspended Labs: `/superadmin/labs/suspended`
- Catalogue:
  - Central Test Master: `/superadmin/catalogue/test-master`
  - Categories: `/superadmin/catalogue/categories`
  - Catalogue Matching: `/superadmin/catalogue/matching`
- Orders:
  - Platform Orders: `/superadmin/orders`
  - Order Detail: `/superadmin/orders/[orderId]`
- Patients:
  - Platform Patient Directory: `/superadmin/patients`
- Reports:
  - Report Centre (Monitoring): `/superadmin/reports`
- Subscriptions:
  - Overview / MRR: `/superadmin/subscriptions`
  - SaaS Plans: `/superadmin/subscriptions/plans`
  - Active Subscriptions: `/superadmin/subscriptions/active`
  - Failed Payments: `/superadmin/subscriptions/failed`
  - Invoices: `/superadmin/subscriptions/invoices`
- Payments:
  - Patient Diagnostic Payments (`PATIENT → LAB`): `/superadmin/payments/patient-payments`
  - Gyrex SaaS Payments (`LAB → GYREX`): `/superadmin/payments/gyrex-payments`
  - Refunds: `/superadmin/payments/refunds`
- Users & Access:
  - Platform Users: `/superadmin/users`
  - Roles & Permissions: `/superadmin/roles`
- Support:
  - Support Tickets: `/superadmin/support`
- System & Observability:
  - Audit Logs: `/superadmin/system/audit-logs`
  - Security Alerts: `/superadmin/system/security-alerts`
  - System Health: `/superadmin/system/health`
  - Platform Notifications: `/superadmin/system/notifications`
  - Integrations Visibility: `/superadmin/system/integrations`
  - Platform Settings: `/superadmin/system/settings`

### 2.2 API Endpoints
All Superadmin APIs are secured under `/api/superadmin/*`:
- `/api/superadmin/dashboard`
- `/api/superadmin/labs`
- `/api/superadmin/labs/[labId]`
- `/api/superadmin/labs/[labId]/verify`
- `/api/superadmin/labs/[labId]/suspend`
- `/api/superadmin/catalogue/test-master`
- `/api/superadmin/catalogue/test-master/[testId]`
- `/api/superadmin/catalogue/categories`
- `/api/superadmin/catalogue/matching`
- `/api/superadmin/orders`
- `/api/superadmin/orders/[orderId]`
- `/api/superadmin/patients`
- `/api/superadmin/reports`
- `/api/superadmin/subscriptions`
- `/api/superadmin/subscriptions/plans`
- `/api/superadmin/subscriptions/invoices`
- `/api/superadmin/payments/patient`
- `/api/superadmin/payments/gyrex`
- `/api/superadmin/payments/refunds`
- `/api/superadmin/users`
- `/api/superadmin/support`
- `/api/superadmin/system/audit`
- `/api/superadmin/system/alerts`
- `/api/superadmin/system/health`
- `/api/superadmin/system/notifications`
- `/api/superadmin/system/settings`

---

## 3. ROLES & RBAC ENFORCEMENT

Superadmin adheres strictly to `AUTH_RBAC_CONTRACT.md`. No new roles or secondary permissions engines are introduced.

### 3.1 Allowed Platform Roles
1. `SUPERADMIN`: Full platform administrative authority.
2. `PLATFORM_ADMIN`: Comprehensive operational oversight.
3. `OPERATIONS_ADMIN`: Lab verification, suspension, store operations, support, and reports.
4. `FINANCE_ADMIN`: SaaS subscriptions, invoices, payment oversight, refunds. Disallowed from modifying Test Master.
5. `SUPPORT_ADMIN`: Support tickets, lab inspection, report delivery diagnostics. Disallowed from financial mutations.
6. `CATALOGUE_ADMIN`: Central Test Master, test categories, catalogue mapping. Disallowed from financial and lab suspension operations.

### 3.2 Blocked Roles (Hard 403 & Audited Security Rejection)
- `LAB_OWNER`
- `LAB_ADMIN`
- `LAB_STAFF`
- `PATIENT` (Any user without a platform role)

Any attempt by lab-scoped or patient users to access `/superadmin` or `/api/superadmin/*` triggers:
1. Immediate HTTP 403 Forbidden / redirect to login.
2. An immutable security `AuditLog` entry categorized as `UNAUTHORIZED_SUPERADMIN_ACCESS_ATTEMPT`.

---

## 4. DATA DEPENDENCIES & PAYMENT DUALITY

### 4.1 Strict Financial Separation
Under no circumstances are `PATIENT → LAB` and `LAB → GYREX` payment flows combined or treated as identical:
1. **Patient Diagnostic Payments** (`PATIENT → LAB`):
   - Model: `Payment` (linked to `Order` and `Laboratory`).
   - Represents diagnostic fee paid by patient to laboratory merchant.
   - Visible in `/superadmin/payments/patient-payments`.
   - Never counted as Gyrex platform revenue.
2. **Gyrex Subscription Payments** (`LAB → GYREX`):
   - Model: `SubscriptionInvoice` (linked to `LabSubscription` and `Laboratory`).
   - Represents SaaS subscription fee paid by laboratory to Gyrex.
   - Visible in `/superadmin/payments/gyrex-payments` and `/superadmin/subscriptions`.

### 4.2 Lab Verification & Suspension
- **Verification Workflow**: Status transitions from `PENDING_VERIFICATION` to `ACTIVE` (Approved) or `REJECTED`.
- **Lab Admin Restriction**: A Lab Admin or Owner can NEVER approve their own lab. Platform approval requires `superadmin:labs:verify` privilege.
- **Suspension Contract**:
  - Suspended labs receive `status = SUSPENDED`.
  - Audited with actor ID, reason, and timestamp.
  - Suspended labs are blocked from accepting new patient bookings or presenting active digital storefronts.
  - Under no circumstances does suspension delete historical orders, patient records, payment receipts, or reports.

### 4.3 Centralized Test Master vs. Lab Catalogues
- **TestMaster**: Represents the standardized diagnostic test dictionary across Gyrex (`TestMaster` model). Superadmin manages name, category, standard TAT, preparation instructions, sample type, and LOINC codes.
- **LabTest**: Represents a specific laboratory's implementation and selling price (`LabTest` model). Superadmin does NOT alter lab-specific selling prices directly from Test Master.
- **Catalogue Matching**: Superadmin provides review and matching assistance for lab-imported tests against standard `TestMaster` items without destructively altering historical order records.

### 4.4 Patient Privacy & Data Minimization
- Patient identities may span multiple laboratories.
- Platform views display only necessary operational metadata (name, phone, order counts, last activity).
- Superadmin access to diagnostic reports is restricted to delivery monitoring and diagnostics. Every report view or download attempt generates an audited security record (`REPORT_INSPECTED`).

### 4.5 Secret Hygiene
- Razorpay secret keys, webhook secrets, SMTP passwords, database connection strings, and user password hashes are NEVER returned to the client or displayed in Superadmin views.

---

## 5. RECONCILIATION & TESTING MANDATES

The implementation is verified against the 15-rule security suite (`scripts/test-superadmin.ts`):
1. `LAB_OWNER` denied superadmin access.
2. `LAB_ADMIN` denied superadmin access.
3. `LAB_STAFF` denied superadmin access.
4. `SUPERADMIN` granted platform access.
5. `PLATFORM_ADMIN` bounded by role permissions.
6. `FINANCE_ADMIN` denied Test Master mutation.
7. `CATALOGUE_ADMIN` denied financial mutations.
8. `SUPPORT_ADMIN` denied financial record modifications.
9. Cross-tenant boundaries enforced (actions on Lab A do not touch Lab B).
10. Suspended labs cannot receive patient bookings.
11. Lab Admin cannot self-approve.
12. Privileged actions create immutable audit logs.
13. Patient diagnostic payments and Gyrex subscription revenues remain distinct.
14. Report access is monitored, permission-bounded, and audited.
15. Secrets are filtered and never leaked to the client.
