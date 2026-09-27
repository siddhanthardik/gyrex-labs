# GYREX LABS — MASTER ARCHITECTURE

Version: 1.0  
Status: APPROVED FOUNDATION  
Product: Gyrex Labs  
Owner: Gyrex  
Primary domain: labs.gyrex.in  
Superadmin: admin-labs.gyrex.in  

---

# 1. PRODUCT PURPOSE

Gyrex Labs is a multi-tenant diagnostic laboratory commerce and patient-service platform.

The core proposition is:

Prescription → Diagnostic Test Selection → Booking → Home Collection / Lab Visit → Payment → Report Delivery

Gyrex Labs is NOT an LIS.

The laboratory's existing LIS remains responsible for laboratory operations and clinical result processing.

Gyrex Labs owns the patient-facing digital commerce and communication layer.

---

# 2. CORE BUSINESS MODEL

There are two completely separate financial relationships.

## Patient diagnostic payment

Patient → Laboratory

The laboratory is the merchant/provider.

Gyrex must NOT appear to the patient as the recipient of diagnostic payment.

Patient-facing language:

"Pay Sharma Diagnostics"

"Your payment goes directly to Sharma Diagnostics."

"Powered by Gyrex Labs."

---

## Gyrex subscription

Laboratory → Gyrex

The laboratory pays Gyrex for using the Gyrex Labs platform.

These two financial flows MUST remain technically and visually separate.

---

# 3. TECHNOLOGY STACK

## Application
Next.js
TypeScript

## UI
Tailwind CSS
shadcn/ui

## Database
PostgreSQL

## ORM
Prisma

## Authentication
Secure HTTP-only session/authentication architecture.

Authentication implementation must support:
- Superadmin
- Platform Admin
- Lab Owner
- Lab Admin
- Lab Staff

## Hosting
Existing Gyrex VPS

## Reverse Proxy
Nginx

## Process Manager
PM2

## Source Control
GitHub

## AI
Gemini API

Purpose:
Prescription test-name extraction only.

Gemini must NOT diagnose patients or independently recommend medical tests.

## Payments
Razorpay

Two logical payment systems:
1. Patient → Lab
2. Lab → Gyrex

## File Storage
Use secure private storage architecture.

Prescriptions and reports MUST NOT be publicly accessible.

## Email
Use transactional email provider.

## WhatsApp
Official Meta WhatsApp Cloud API will be considered for a later phase.

Do NOT use Baileys for Gyrex Labs.

---

# 4. APPLICATION ARCHITECTURE

One Next.js application initially.

The application contains three protected experiences:

## Patient
labs.gyrex.in/{labSlug}

## Lab Admin
labs.gyrex.in/lab

## Gyrex Superadmin
admin-labs.gyrex.in

Do NOT create separate frontend applications unless there is a demonstrated technical requirement.

---

# 5. HIGH-LEVEL ARCHITECTURE

Patient
    ↓
Next.js
    ↓
Application Services
    ↓
PostgreSQL / Prisma
    ↓
Secure Storage / External Services

Lab Admin
    ↓
Next.js
    ↓
Application Services
    ↓
PostgreSQL / Prisma

Superadmin
    ↓
Next.js
    ↓
Application Services
    ↓
PostgreSQL / Prisma

External services:
Razorpay
Gemini
Email
Meta WhatsApp Cloud API (future)

---

# 6. MULTI-TENANCY

Gyrex Labs MUST be multi-tenant.

Every lab is a tenant.

Every tenant-owned record must contain:
tenantId / labId

Examples:
Order
Patient
LabTest
Package
Report
LabUser
Payment
StoreSetting

must be associated with a specific laboratory.

The backend MUST enforce tenant isolation.

Never rely only on frontend filtering.

Lab A must NEVER be able to retrieve Lab B data through:
- URL manipulation
- API requests
- database queries
- frontend state
- predictable IDs

---

# 7. SUPERADMIN TENANCY

Superadmin operates at platform level.

Superadmin can access all tenants according to role permissions.

Superadmin is NOT treated as a normal laboratory user.

Use explicit platform-level roles.

---

# 8. USER ROLES

Initial roles:
SUPERADMIN
PLATFORM_ADMIN
OPERATIONS_ADMIN
FINANCE_ADMIN
SUPPORT_ADMIN
CATALOGUE_ADMIN
LAB_OWNER
LAB_ADMIN
LAB_STAFF

Future roles may be added only after evaluating actual requirements.

---

# 9. RBAC

Permissions must be explicit.

Examples:
labs.read
labs.create
labs.update
labs.verify
labs.suspend

catalogue.read
catalogue.write

orders.read
orders.update

patients.read

reports.read
reports.upload

subscriptions.read
subscriptions.manage

payments.read

audit.read

Users must not receive unrestricted access simply because they are an admin.

---

# 10. APPLICATION MODULES

Core modules:
1. Authentication
2. Users
3. Labs
4. Lab Users
5. Test Master
6. Lab Catalogue
7. Packages
8. Patients
9. Orders
10. Collection
11. Payments
12. Reports
13. Subscriptions
14. Notifications
15. Support
16. Audit Logs
17. Integrations
18. Platform Settings

---

# 11. PATIENT EXPERIENCE

Patient flow:
WhatsApp / Direct Link
        ↓
Lab Store
        ↓
Search Tests
        ↓
Upload Prescription
        ↓
Gemini Extraction
        ↓
Review Tests
        ↓
Cart
        ↓
Patient Details
        ↓
Collection Method
        ↓
Payment
        ↓
Order Confirmation
        ↓
Track Booking
        ↓
Report Ready
        ↓
Secure Report Access

---

# 12. PRESCRIPTION AI

Gemini is used only for:
"Identify laboratory investigations explicitly written on this prescription."

Flow:
Prescription
    ↓
Gemini
    ↓
Extracted test names
    ↓
Match against Gyrex Test Master
    ↓
Patient reviews
    ↓
Patient confirms

The AI must NOT:
- diagnose
- interpret results
- recommend additional tests
- infer diseases
- automatically add tests without user confirmation

---

# 13. TEST MASTER

Gyrex maintains a centralized Test Master.

Example:
CBC
LFT
KFT
TSH
HbA1c
Vitamin D

Test Master contains standardized information such as:
- test name
- synonyms
- category
- sample type
- standard TAT
- preparation
- description
- standardized code

A laboratory's catalogue references the Test Master.

The laboratory controls:
- selling price
- availability
- home collection availability
- lab-specific TAT
- lab-specific preparation information where applicable

---

# 14. LAB CATALOGUE

Lab catalogue structure:
Gyrex Test Master
        ↓
Lab Test

A Lab Test contains:
- tenantId
- masterTestId
- sellingPrice
- active
- lab-specific configuration

Do NOT duplicate the entire Test Master unnecessarily.

---

# 15. PACKAGES

Two concepts:
## Gyrex package templates
Platform-level recommendations.

## Lab packages
Packages created by individual laboratories.
Lab packages belong to the laboratory tenant.

---

# 16. ORDERS

An order belongs to exactly one laboratory.

Minimum order information:
- orderId
- tenantId
- patientId
- items
- collectionType
- collectionAddress
- collectionDate
- collectionSlot
- subtotal
- collectionFee
- total
- paymentStatus
- orderStatus
- reportStatus
- timestamps

Use explicit status values.
Do not use arbitrary strings throughout the application.

---

# 17. ORDER STATUS

Initial order lifecycle:
PENDING_PAYMENT
CONFIRMED
COLLECTION_SCHEDULED
SAMPLE_COLLECTED
PROCESSING
REPORT_READY
COMPLETED
CANCELLED

Do not allow arbitrary status changes from the frontend.

---

# 18. PAYMENT STATUS

Initial values:
PENDING
AUTHORIZED
PAID
FAILED
REFUNDED
PARTIALLY_REFUNDED
CASH_ON_COLLECTION

Patient diagnostic payment belongs to the laboratory.

---

# 19. REPORT ARCHITECTURE

Gyrex Labs is NOT the laboratory result-processing system.

The existing LIS remains the clinical source of truth.

Gyrex initially supports:
- secure PDF upload
- secure report storage
- report linking
- report delivery
- report notification
- report access audit

Future integration options:
1. LIS API
2. Email ingestion
3. Folder sync agent
4. CSV/Excel import
5. Secure LIS report URL

Do not build LIS functionality into Gyrex Labs.

---

# 20. REPORT SECURITY

Reports must be stored privately.

Never expose permanent public report URLs.

Use:
- authenticated access
- authorization checks
- expiring signed URLs where appropriate
- access logging

A patient must only access reports belonging to their authorized orders.

---

# 21. SUBSCRIPTION ARCHITECTURE

Subscriptions represent:
LAB → GYREX

Subscription data must be separate from patient diagnostic payments.

Subscription entities:
SubscriptionPlan
Subscription
SubscriptionInvoice
SubscriptionPayment

Subscription features:
- current plan
- status
- billing cycle
- next billing date
- payment method
- invoices
- upgrade
- downgrade
- cancellation
- failed payment
- grace period

---

# 22. PAYMENT SEPARATION

NEVER combine these concepts:

PATIENT PAYMENT
Patient → Lab

GYREX SUBSCRIPTION
Lab → Gyrex

Patient checkout must never accidentally use Gyrex's SaaS merchant account.

---

# 23. SUPERADMIN MODULES

Superadmin initial modules:
Dashboard
Labs
- All Labs
- Pending Verification
- Lab Detail
Catalogue
- Test Master
- Categories
- Catalogue Matching
Orders
- All Orders
- Order Detail
Patients
Reports
- Report Centre
Subscriptions
- Plans
- Active Subscriptions
- Trials
- Failed Payments
- Invoices
Payments
- Patient Payments
- Gyrex Payments
- Refunds
Users & Access
- Users
- Roles & Permissions
Support
- Tickets
System
- Audit Logs
- Integrations
- Notifications
- System Health
- Platform Settings

---

# 24. LAB ADMIN MODULES

Lab dashboard:
Dashboard
My Store
Catalogue
Packages
Orders
Patients
Reports
Payment Settings
Subscription & Billing
Store Settings
Staff
Help & Support

---

# 25. PATIENT MODULES

Patient-facing:
Lab Store
Test Search
Categories
Prescription Upload
Prescription Review
Cart
Patient Details
Collection
Checkout
Order Confirmation
Order Tracking
Reports
Profile

---

# 26. FOLDER STRUCTURE

Recommended:
app/
  (patient)/
  lab/
  superadmin/
  api/
components/
  patient/
  lab/
  superadmin/
  shared/
lib/
  auth/
  db/
  payments/
  ai/
  storage/
  notifications/
services/
  labs/
  catalogue/
  orders/
  patients/
  reports/
  subscriptions/
prisma/
  schema.prisma
  migrations/
  seed/
types/
middleware.ts

---

# 27. FILE OWNERSHIP

Patient Agent owns:
app/(patient)/
components/patient/

Lab Agent owns:
app/lab/
components/lab/

Superadmin Agent owns:
app/superadmin/
components/superadmin/

Database Agent owns:
prisma/

Integration Agent owns:
lib/integrations/
services/integrations/

Authentication Agent owns:
lib/auth/
middleware.ts

Shared components must be modified only after coordination.

---

# 28. DO NOT MODIFY RULE

Agents must NOT modify another agent's owned module unless:
1. The task explicitly requires it.
2. The architecture artifact is updated.
3. The change is documented.

Never silently modify:
- Prisma schema
- Authentication
- RBAC
- Tenant isolation
- Payment architecture
- Environment configuration

---

# 29. DATABASE RULES

Database migrations must be deterministic.
Never manually modify production database structure.
Every schema change must produce a Prisma migration.
Never delete production data during development/testing.
Seed data must be clearly separated from production data.

---

# 30. SECURITY REQUIREMENTS

Healthcare-related data must be treated as sensitive.

Required:
- authentication
- authorization
- tenant isolation
- secure report storage
- secure prescription storage
- audit logging
- server-side permission checks
- server-side payment verification
- webhook signature verification
- input validation
- rate limiting for sensitive endpoints
- secure HTTP-only authentication/session cookies
- environment secrets never committed to Git

---

# 31. API RULES

API responses must use consistent structures.
Errors must be predictable.
Never expose:
- database connection strings
- API keys
- internal stack traces
- private storage paths
- other tenant information

Never trust IDs supplied by the client without authorization checks.

---

# 32. PAYMENT WEBHOOK RULE

Payment success MUST NOT be determined only from the browser redirect.
Razorpay webhook/server-side verification is the source of truth.

---

# 33. AUDIT LOGGING

Important administrative actions must be logged.
Audit entry:
user, role, action, entity, entityId, timestamp, metadata

---

# 34. OBSERVABILITY

Production must have:
- application error logging
- request logging
- payment webhook logging
- failed job logging
- report upload failure logging
- authentication failure logging

Avoid silent failures.

---

# 35. ENVIRONMENT MANAGEMENT

Use:
.env.local
.env.production
Never commit secrets.

Required secrets:
DATABASE_URL
AUTH_SECRET
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
GEMINI_API_KEY
EMAIL_API_KEY
STORAGE credentials

---

# 36. DEPLOYMENT

Production:
GitHub → Deployment workflow → VPS → PM2 → Next.js → Nginx → Domain
Domains:
labs.gyrex.in
admin-labs.gyrex.in
Do not disturb the existing Gyrex Clinics deployment.

---

# 37. DEVELOPMENT PRINCIPLE

Build the smallest reliable V1.
Do NOT add unnecessary complexity without demonstrated business requirement.

---

# 38. DEVELOPMENT PRIORITY

Phase 0:
Architecture
Database
Authentication
RBAC
Tenant isolation

Phase 1:
Patient Store
Lab onboarding
Lab catalogue
Superadmin

Phase 2:
Orders
Collection
Payments
Reports

Phase 3:
Subscriptions
Notifications
Support
Audit

Phase 4:
Gemini prescription extraction

Phase 5:
WhatsApp Cloud API

Phase 6:
LIS integrations

---

# 39. DEFINITION OF DONE

1. UI works
2. Backend works
3. Database works
4. Authentication works
5. Authorization works
6. Tenant isolation works
7. Validation works
8. Error states work
9. Loading states work
10. Mobile responsive
11. Audit/security requirements considered
12. No existing module is broken
13. Production build succeeds

---

# 40. GOLDEN RULE

Gyrex Labs is a diagnostic commerce and patient-service platform, NOT an LIS.
Keep the architecture simple.
Keep the laboratory as the clinical authority.
Keep patient payments going directly to the laboratory.
Keep Gyrex subscription payments separate.
Keep tenants isolated.
Keep AI narrowly scoped.
Do not introduce complexity without a business requirement.
