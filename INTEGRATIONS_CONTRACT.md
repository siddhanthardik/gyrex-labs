# GYREX LABS — INTEGRATIONS CONTRACT

Version: 2.0
Status: RATIFIED & OPERATIONAL
Module Owner: 06 — INTEGRATIONS
Scope & Ownership: `lib/integrations/`, `services/integrations/`
Upstream Contracts:
- `GYREX LABS — MASTER ARCHITECTURE`
- `DATABASE_CONTRACT.md`
- `AUTH_RBAC_CONTRACT.md`
- `PATIENT_APP_CONTRACT.md`
- `LAB_ADMIN_CONTRACT.md`
- `SUPERADMIN_CONTRACT.md`

---

## 1. INTEGRATION ARCHITECTURE

The Integrations Layer isolates all third-party cloud services and external infrastructure behind strict internal interfaces. Application modules (Patient App, Lab Admin, Superadmin) must **never** call external vendor SDKs directly.

```text
Patient / Lab Admin / Superadmin
              ↓
        Internal Service
              ↓
       Integration Layer (services/integrations/)
              ↓
       Provider Adapter (implements lib/integrations/types.ts interface)
              ↓
       External Provider (Razorpay / Gemini / SMTP / Meta / Storage)
```

Interface files live in `lib/integrations/types.ts`. Provider implementations live in `services/integrations/`. Swapping a provider requires only replacing the implementation — no application business logic changes.

---

## 2. RAZORPAY — PATIENT PAYMENT BOUNDARY (Flow A: PATIENT → LABORATORY)

- **Purpose**: Patient pays the individual laboratory for diagnostic services.
- **Merchant of Record**: The individual diagnostic laboratory (not Gyrex).
- **Credentials**: Stored per-lab in `LabPaymentSettings` (`razorpayKeyId`, `razorpayKeySecretEncrypted`). Lab secrets are stored AES-256-GCM encrypted — never in plaintext.
- **Database Models**: `PatientPayment`, `Order`.
- **Server-Authoritative Amount**: The server reads `Order.totalAmount` from the database. Client-supplied amounts are ignored entirely.
- **Patient-Facing Language**: *"Pay Sharma Diagnostics."* / *"Your payment goes directly to Sharma Diagnostics. Powered by Gyrex Labs."*
- **Webhook Endpoint**: `/api/webhooks/razorpay/patient`
- **Payment Status Finality**: Only the Razorpay webhook or server-side signature verification can transition a payment to `PAID`. Client-side success callbacks alone are insufficient.
- **Cash on Collection**: `CASH_ON_COLLECTION` orders bypass Razorpay entirely. No gateway order is created.

**Service**: `services/integrations/payments/patient-payment-service.ts`

---

## 3. RAZORPAY — GYREX SUBSCRIPTION BOUNDARY (Flow B: LABORATORY → GYREX)

- **Purpose**: Diagnostic laboratories pay Gyrex for platform SaaS subscriptions.
- **Merchant of Record**: Gyrex Labs.
- **Credentials**: Server environment variables only — `GYREX_RAZORPAY_KEY_ID`, `GYREX_RAZORPAY_KEY_SECRET`, `GYREX_RAZORPAY_WEBHOOK_SECRET`.
- **Database Models**: `Subscription`, `SubscriptionPlan`, `SubscriptionInvoice`, `SubscriptionPayment`.
- **Webhook Endpoint**: `/api/webhooks/razorpay/platform`
- **Strict Isolation**: Flow B code paths cannot access `PatientPayment` records and vice versa.

**Service**: `services/integrations/payments/subscription-billing-service.ts`

---

## 4. WEBHOOK VERIFICATION

Both webhook endpoints enforce:

1. **Raw body preservation**: Routes read `request.text()` (raw string) before JSON parsing.
2. **HMAC-SHA256 verification**: `verifyRazorpayWebhookSignature()` in `lib/integrations/crypto.ts`.
3. **Rejection before dispatch**: Invalid signature writes `AuditLog SECURITY_ALERT` and throws before any business logic.
4. **Unknown events**: Unhandled events return `{ handled: false }` without throwing.
5. **Malformed payloads**: Missing entity data returns graceful `{ handled: false }`.
6. **Security audit**: Every invalid signature attempt is audit-logged (safe identifiers only — never secrets).

---

## 5. IDEMPOTENCY RULES

| Scenario | Rule |
|:---|:---|
| `payment.captured` webhook received twice | Detects `PaymentStatus.PAID` → returns immediately, no duplicate write |
| `payment.failed` received twice | Detects `PaymentStatus.FAILED` → returns immediately |
| `refundPayment()` called twice | Detects existing `refundId` → returns existing state without re-calling Razorpay |
| `verifyAndConfirmPatientPayment()` after `PAID` | Returns existing `PaymentStatus.PAID` without re-writing |
| Subscription `invoice.paid` duplicate | Checks existing `SubscriptionPayment` for `gatewayPaymentId` before insert |

---

## 6. REFUND RULES

- **Authorization required**: Requires caller permission `payments.refund`. `LAB_STAFF` is blocked.
- **Payment state validation**: Only `PaymentStatus.PAID` payments are refundable.
- **Amount validation**: `refundAmountInPaise` must be ≤ original amount.
- **Idempotency**: Existing `refundId` returns current state without calling provider again.
- **Audit trail**: Every refund writes an immutable `AuditLog PAYMENT_REFUNDED` entry.
- **Domain isolation**: Patient refunds route through lab credentials. Subscription refunds route through platform credentials. No shared refund path exists.

**Service**: `services/integrations/payments/refund-service.ts`

---

## 7. GEMINI SCOPE

Gemini has **one** narrowly defined role in Gyrex Labs V1:

> **Extract the names of laboratory investigations that are EXPLICITLY written on a prescription.**

**Prohibited operations (enforced by prompt and Zod validation):**
- Diagnosing medical conditions
- Predicting or inferring diseases from symptoms
- Recommending additional tests not on the prescription
- Inferring tests based on suspected illness
- Giving clinical advice
- Automatically adding tests to a patient's cart

**Service**: `services/integrations/ai/gemini-extraction-service.ts`

---

## 8. GEMINI STRUCTURED OUTPUT

Gemini is configured with:
- `temperature: 0.0` — maximum determinism
- `responseMimeType: "application/json"` — enforces JSON response
- Zod schema validation (`GeminiExtractionSchema`) after every API call

Expected output:
```json
{
  "investigations": [
    { "rawText": "CBC", "confidence": 0.97, "categoryHint": "Hematology" }
  ],
  "notes": "Prescription legibility: Good"
}
```

If Gemini returns malformed JSON or fails schema validation, extraction returns `status: "ERROR"`. The raw API error is never forwarded to the patient UI.

---

## 9. PATIENT CONFIRMATION REQUIREMENT

```text
Patient uploads prescription
    ↓
GeminiExtractionService.extractInvestigationsFromBuffer()
    ↓
matchExtractedTestsToLab() — matches TestMaster + LabTest
    ↓
Patient reviews proposed matches (needsReview items flagged)
    ↓
Patient manually accepts or removes each test
    ↓
Only confirmed LabTest records become OrderItems
```

No test is silently added to a booking. Items with `confidence < 0.75` or missing catalogue match receive `needsReview: true` and `selectedByDefault: false`.

---

## 10. FILE STORAGE SECURITY

**Service**: `services/integrations/storage/storage-service.ts`

| Rule | Implementation |
|:---|:---|
| Private by default | No files served via public CDN or static routes |
| Authorization before access | Caller verifies ownership before calling `generateSignedAccessUrl()` |
| Signed URLs | HMAC-SHA256 token with path + expiry. Default: 900 seconds (15 min) |
| Expired token rejection | Tokens past `expires` rejected with HTTP 403 |
| Path traversal prevention | `sanitizePath()` keeps path within `baseDir` |
| No raw user filenames | Keys are cryptographic identifiers |
| MIME whitelist | Prescriptions: jpeg/png/webp/pdf. Reports: pdf only |
| Executable blocking | `.exe`, `.bat`, `.cmd`, `.sh`, `.php`, `.js`, `.dll` blocked |
| Max sizes | Prescriptions: 10 MB. Reports: 25 MB |

---

## 11. REPORT ACCESS SECURITY

1. Patient authenticates (phone verification)
2. Report ownership verified (`report.order.patient.phone === authenticated phone`)
3. Tenant verified (report belongs to correct lab)
4. Signed URL generated server-side with 15-minute expiry
5. No permanent public URL ever generated
6. No report path is predictable or enumerable

Lab admins access via tenant-scoped RBAC. Superadmins via `reports.view` permission with audit logging.

---

## 12. EMAIL ARCHITECTURE

**Service**: `services/integrations/email/email-service.ts`

| Template ID | Purpose |
|:---|:---|
| `PATIENT_ORDER_CONFIRMATION` | Booking details, slot, lab contact |
| `PATIENT_PAYMENT_CONFIRMATION` | Payment receipt (lab merchant attributed) |
| `PATIENT_REPORT_READY` | Secure notice — no report attachment |
| `LAB_NEW_ORDER_ALERT` | Lab staff operational alert |
| `LAB_SUBSCRIPTION_INVOICE` | Gyrex SaaS billing receipt |

**Medical Privacy**: Reports are never attached to emails. `PATIENT_REPORT_READY` contains only a secure portal link notice.

**Non-Blocking Failure**: Email failures never abort successful orders or payments. Failures are logged for manual retry. Order/payment state is the source of truth.

---

## 13. WHATSAPP ARCHITECTURE

**Service**: `services/integrations/whatsapp/whatsapp-service.ts`
**Provider**: `MetaWhatsAppService` implements `WhatsAppProvider` interface

V1 approved templates: `gyrex_booking_confirmed`, `gyrex_phlebotomist_assigned`, `gyrex_report_ready`, `gyrex_payment_received`

- Calls Meta Graph API: `https://graph.facebook.com/v20.0/{phone_number_id}/messages`
- Supports `sendTemplate()` and `sendText()`
- Webhook challenge verification via `WHATSAPP_VERIFY_TOKEN`
- Mock mode (no credentials) returns deterministic `wamid.mock.*` without error
- WhatsApp failure does not affect order state

---

## 14. OFFICIAL META CLOUD API FUTURE BOUNDARY

When production-ready:
1. Only official Meta WhatsApp Cloud API (`graph.facebook.com`) will be used
2. Templates must be registered with Meta before use
3. Credentials (`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`) are server-only
4. Webhook verification will use Meta app secret (HMAC-SHA256)
5. `MetaWhatsAppService` is already structured for this upgrade — no provider-coupling in application code

---

## 15. BAILEYS — EXPLICIT CONFIRMATION: NOT USED

> **Baileys and all unofficial WhatsApp APIs are strictly prohibited in Gyrex Labs.**

Confirmed by:
- `grep` scan of all TypeScript source: zero imports of `baileys` or `@whiskeysockets/baileys`
- `package.json`: Baileys is not installed
- `MASTER_ARCHITECTURE.md` §3: *"Do NOT use Baileys for Gyrex Labs."*
- `whatsapp-service.ts` header: *"NO Baileys. NO WhatsApp Web automation."*

---

## 16. SECRET MANAGEMENT

### Environment Variable Names Only (`.env.example`)
```
DATABASE_URL=
AUTH_SECRET=
GEMINI_API_KEY=
STORAGE_PROVIDER=
STORAGE_LOCAL_DIR=
STORAGE_BUCKET=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
GYREX_RAZORPAY_KEY_ID=
GYREX_RAZORPAY_KEY_SECRET=
GYREX_RAZORPAY_WEBHOOK_SECRET=
EMAIL_FROM=
EMAIL_API_KEY=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=
```

### Rules
- Secrets live only in `.env` / `.env.local` (git-ignored via `.gitignore` rule `.env*`)
- `.env.example` contains variable names only — zero real values
- Lab Razorpay secrets stored in database are AES-256-GCM encrypted before persistence
- No secret is logged, returned in API responses, or passed to client JavaScript
- `lib/integrations/env.ts` returns boolean presence flags only — never values
- Health checks return operational status strings — never credentials

---

## 17. RETRY RULES

| Operation | Policy |
|:---|:---|
| Razorpay `createOrder()` | No automatic retry. Patient retries checkout. |
| Razorpay `refundPayment()` | No automatic retry. Idempotency prevents duplicates on manual retry. |
| Webhook processing | Razorpay auto-retries. Idempotency guards prevent duplicate mutations. |
| Email `send()` | Single attempt. No auto-retry (prevents duplicate sends). |
| WhatsApp `sendTemplate()` | Single attempt. Non-blocking. |
| Gemini extraction | Single attempt. Returns `status: "ERROR"` on failure — patient retries. |
| Storage `upload()` | Single attempt. Failure does not create false successful state. |

**Financial operations require idempotency. Never blind retry.**

---

## 18. LOGGING RULES

**Safe to log**: Internal order number, lab ID, provider event ID, integration name, operation name, success/failure, HTTP status, error category string.

**Never log**: API keys, webhook secrets, authorization headers, prescription content, diagnostic report content, patient medical information, payment credentials, raw provider API responses.

---

## 19. INTEGRATION HEALTH

**Service**: `services/integrations/health/health-service.ts`
**Endpoint**: `/api/superadmin/system/health`

| Integration | Probe | Statuses |
|:---|:---|:---|
| Razorpay (Platform) | `GET /v1/plans?count=1` | `OPERATIONAL`, `DEGRADED`, `FAILED`, `UNKNOWN` |
| Google Gemini AI | `GET /v1beta/models` | `OPERATIONAL`, `DEGRADED`, `FAILED`, `UNKNOWN` |
| Secure Storage | Directory read/write probe | `OPERATIONAL`, `FAILED` |
| Email | Credential presence check | `OPERATIONAL`, `UNKNOWN` |
| Meta WhatsApp | Graph API phone number probe | `OPERATIONAL`, `DEGRADED`, `FAILED`, `UNKNOWN` |

**Zero fabrication rule**: If credentials are not configured, status is `UNKNOWN`, **never** `OPERATIONAL`. Health checks run only on admin invocation — never on patient requests.

---

## 20. TESTING STRATEGY

**Test suite**: `scripts/test-integrations.ts` (`npm run test:integrations`)

Zero live credentials required. All tests use deterministic mock providers.

| # | Area | Scenario |
|:---|:---|:---|
| 01 | Razorpay | Payment order creation |
| 02 | Webhook | Invalid signature rejected |
| 03 | Webhook | Valid signature accepted |
| 04 | Idempotency | Duplicate webhook handled idempotently |
| 05 | Patient Payment | Signature verification and status update |
| 06 | Refund | Authorization enforced |
| 07 | Refund | Duplicate refund prevented |
| 08 | Subscription | Flow B isolated from Flow A |
| 09 | Gemini | Valid extraction accepted |
| 10 | Gemini | Malformed response rejected by Zod |
| 11 | Gemini | Unknown test flagged (`needsReview`) |
| 12 | Gemini | Uncertain test (confidence < 0.75) marked for review |
| 13 | Gemini | Medical diagnosis prohibited |
| 14 | Storage | Unauthorized access rejected |
| 15 | Storage | Authorized signed URL works |
| 16 | Storage | Expired URL rejected |
| 17 | Storage | Invalid file type rejected |
| 18 | Email | Failure does not break order |
| 19 | Email | Medical privacy in templates enforced |
| 20 | WhatsApp | Invalid verify token rejected |
| 21 | Secrets | Secrets encrypted, never exposed |

