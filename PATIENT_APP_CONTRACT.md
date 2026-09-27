# PATIENT_APP_CONTRACT.md

**Module:** 03 — PATIENT APP  
**Version:** 1.0  
**Status:** APPROVED FOUNDATION  
**Owner:** Gyrex Labs  
**Authored by:** Patient Experience Specialist  

---

## 1. PURPOSE

This contract defines the complete public interface that the `03 — PATIENT APP` module exposes and consumes.  
It serves as the authoritative reference for all downstream modules (Lab Admin, Superadmin, Notifications) that interact with patient-facing flows.

---

## 2. MODULE SCOPE

The Patient App owns the entire patient-facing diagnostic commerce layer:

| Responsibility | In Scope |
|---|---|
| Laboratory storefront (per-tenant) | ✅ |
| Test browsing & search | ✅ |
| Health packages browsing | ✅ |
| Prescription upload & test extraction | ✅ |
| Cart management (one lab per cart) | ✅ |
| Patient details collection | ✅ |
| Collection scheduling (Home/Lab Visit) | ✅ |
| Order placement (server-authoritative) | ✅ |
| Order tracking | ✅ |
| Secure report download | ✅ |
| LIS / result entry | ❌ NOT IN SCOPE |
| Lab Admin dashboard | ❌ NOT IN SCOPE |
| Superadmin dashboard | ❌ NOT IN SCOPE |
| WhatsApp / notifications | ❌ NOT IN SCOPE |

---

## 3. ROUTE MAP

| Route | Type | Description |
|---|---|---|
| `/{labSlug}` | Server Page | Storefront landing — hero, categories, popular tests, packages |
| `/{labSlug}/tests` | Server + Client | Test browsing with live search and category filters |
| `/{labSlug}/packages` | Server Page | Health packages directory |
| `/{labSlug}/prescription` | Server + Client | Prescription upload with Gemini extraction |
| `/{labSlug}/cart` | Client Page | Cart review, collection type selector |
| `/{labSlug}/checkout` | Client Page | Patient info, address, date/slot, payment method |
| `/{labSlug}/booking/{orderNumber}` | Server Page | Order confirmation + tracking timeline |
| `/{labSlug}/reports` | Client Page | Secure report lookup (gated by phone number) |

---

## 4. PUBLIC API ROUTES

### 4.1 Prescription Extraction

```
POST /api/prescription/extract
```

**Body:**
```json
{
  "labId": "string",
  "testNames": ["string"]
}
```

**Response:**
```json
{
  "status": "SUCCESS | PARTIAL | NO_MATCH | ERROR",
  "message": "string",
  "totalFound": 0,
  "candidates": [...]
}
```

**STRICT CONSTRAINT:** Gemini is used ONLY to extract test names written on the prescription. It MUST NOT diagnose, infer diseases, or recommend unwritten tests.

---

### 4.2 Order Placement

```
POST /api/patient/orders
```

**Body:**
```json
{
  "labId": "string",
  "patient": {
    "fullName": "string",
    "phone": "string",
    "email": "string | null",
    "ageYears": "number | null",
    "gender": "MALE | FEMALE | OTHER"
  },
  "collection": {
    "type": "HOME_COLLECTION | LAB_VISIT",
    "scheduledDate": "ISO date string",
    "scheduledSlot": "string",
    "addressLine1": "string | null",
    ...
  },
  "items": [{ "itemType": "TEST | PACKAGE", "id": "string" }],
  "paymentMethod": "CASH_ON_COLLECTION | RAZORPAY"
}
```

**Response:**
```json
{
  "success": true,
  "orderNumber": "GYR-YYYY-XXXXXXXX",
  "orderId": "string",
  "subtotal": 350,
  "collectionFee": 100,
  "totalAmount": 450,
  "labName": "Sharma Diagnostics",
  "redirectUrl": "/sharma-diagnostics/booking/GYR-2026-12345678"
}
```

**CRITICAL INVARIANTS:**
- Client-supplied prices are NEVER trusted
- Every item is verified against `labId` — cross-tenant injection throws `Security Violation`
- Total is computed entirely server-side from database rates

---

### 4.3 Order Tracking

```
GET /api/patient/orders/{orderNumber}?phone={phone}
```

Returns tracking object with timeline, items, collection details, and report stubs.  
If `phone` is provided, it is verified against the patient record.

---

### 4.4 Report Access

```
GET /api/patient/reports?orderNumber={orderNumber}&phone={phone}
```

Returns list of released reports for a booking. **Phone verification is mandatory.**

```
GET /api/patient/reports/{reportId}?phone={phone}
```

Returns individual report metadata and triggers view count increment. **Phone verification is mandatory.**

---

### 4.5 Lab Info (Internal)

```
GET /api/labs/{labSlug}/info
```

Returns minimal `{ id, name, slug }` for an ACTIVE lab. Used internally by checkout to resolve `labId` from `labSlug`.

---

## 5. SERVICE LAYER

| Service | File | Responsibility |
|---|---|---|
| `getLabStorefront()` | `services/labs/storefront.ts` | Fetches full public storefront; tenant-isolated |
| `calculateOrderTotal()` | `services/orders/patient-order-service.ts` | Server-authoritative price calculation |
| `createPatientOrder()` | `services/orders/patient-order-service.ts` | Creates order with global Patient + LabPatient records |
| `getOrderTracking()` | `services/orders/patient-order-service.ts` | Public tracking with optional phone verification |
| `extractAndMatchPrescriptionTests()` | `services/prescription/extraction-service.ts` | Fuzzy-matches raw test names to TestMaster + LabTest |
| `getAuthorizedPatientReports()` | `services/reports/patient-report-service.ts` | Phone-verified report list retrieval |
| `getAuthorizedReportDownload()` | `services/reports/patient-report-service.ts` | Phone-verified report download + view count |

---

## 6. COMPONENT LIBRARY

| Component | File | Purpose |
|---|---|---|
| `CartProvider` / `useCart` | `components/patient/cart-context.tsx` | Client-side cart scoped to `labSlug` |
| `StorefrontHeader` | `components/patient/storefront-header.tsx` | Sticky branded header with cart indicator |
| `FloatingCartBar` | `components/patient/floating-cart-bar.tsx` | Mobile sticky cart pill |
| `TestCard` | `components/patient/test-card.tsx` | Diagnostic test card with Add to Cart |
| `PackageCard` | `components/patient/package-card.tsx` | Health package card with test list |
| `TestList` | `components/patient/test-list.tsx` | Client-side test search + category filter |
| `PrescriptionUploader` | `components/patient/prescription-uploader.tsx` | File upload + extraction + test review |

---

## 7. SECURITY INVARIANTS

| Invariant | Enforcement |
|---|---|
| Patient cannot specify item price | `calculateOrderTotal()` ignores client amounts entirely |
| Patient cannot inject items from another lab | Every item verified `labTest.labId === labId`; throws `Security Violation` |
| Reports are private | `getAuthorizedPatientReports()` requires phone number match before returning any report |
| Lab slug must resolve to ACTIVE lab | Layout returns `INACTIVE` banner; `/api/labs/{labSlug}/info` returns 403 for inactive |
| Cross-cart contamination impossible | `CartProvider` is scoped to `labSlug`; keys are `gyrex_cart_{labSlug}` in sessionStorage |

---

## 8. BRANDING CONTRACT

> **MANDATORY:** The diagnostic laboratory is ALWAYS primary brand.  
> "Powered by Gyrex Labs" is ALWAYS secondary.

| Context | Required Text |
|---|---|
| Payment / Checkout | "Pay [Lab Name]" — NEVER "Pay Gyrex Labs" |
| Payment trust notice | "Your payment goes directly to [Lab Name]. Gyrex Labs powers this booking platform." |
| Footer | "[Lab Name] • Powered by Gyrex Labs" |
| Header | "[Lab Name]" as h1; "Powered by Gyrex Labs" as secondary |

---

## 9. FINANCIAL FLOW

```
Patient → Pays → Laboratory (Sharma Diagnostics, etc.)
                    ↓
         Laboratory → Pays Platform Fee → Gyrex Labs
```

The patient NEVER pays Gyrex Labs for diagnostic orders.  
Gyrex Labs is a commerce infrastructure provider, not the merchant.

---

## 10. DOWNSTREAM DEPENDENCIES

This module DEPENDS ON:

| Module | Contract |
|---|---|
| 01 — DATABASE | `DATABASE_CONTRACT.md` — all models used are defined there |
| 02 — AUTH & RBAC | `AUTH_RBAC_CONTRACT.md` — session utilities for any protected admin routes |

This module EXPOSES TO:

| Module | What it exposes |
|---|---|
| 04 — LAB ADMIN | Order model (`Order`, `OrderItem`, `Collection`) — Lab Admin reads these |
| 05 — NOTIFICATIONS | `orderNumber`, patient `phone`, `email` for WhatsApp/SMS |
| 06 — SUPERADMIN | All public API routes for platform-level monitoring |

---

## 11. DEFINITION OF DONE

- [x] All 8 patient page routes implemented
- [x] All 5 patient-facing API routes implemented
- [x] `getLabStorefront()` — tenant-isolated, all fields present
- [x] `calculateOrderTotal()` — server-authoritative, cross-tenant injection rejected
- [x] `createPatientOrder()` — global Patient + LabPatient upsert, human-readable order number
- [x] `getOrderTracking()` — public with optional phone verification
- [x] `extractAndMatchPrescriptionTests()` — matches master test + lab test
- [x] `getAuthorizedPatientReports()` — phone verification gate
- [x] `getAuthorizedReportDownload()` — phone verification gate + view count
- [x] Cart scoped to single lab (ONE CART = ONE LAB)
- [x] Payment trust notice shows "Pay [Lab Name]" not "Pay Gyrex Labs"
- [x] Inactive lab shows maintenance banner (not storefront)
- [x] Mobile-first layout (360px, 390px, 430px, desktop)
- [x] `test:security` → 19/19 PASS (Auth & RBAC not broken)
- [x] `test:patient` script created covering 12 requirements
- [x] `npx tsc --noEmit` → 0 errors
- [x] `PATIENT_APP_CONTRACT.md` delivered

---

*Contract version: 1.0 | Last validated: Sept 2026*
