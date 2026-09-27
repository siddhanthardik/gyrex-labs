# Gyrex Labs — Payment Separation Architecture

Version: 1.0  
Status: STRICT NON-NEGOTIABLE ARCHITECTURAL RULE  

---

## 1. The Two Financial Flows

Gyrex Labs maintains **two completely separated, mutually exclusive financial systems**:

```
FLOW A: DIAGNOSTIC COMMERCE
[Patient] ──────── (Diagnostic Fee) ────────► [Diagnostic Laboratory]
                                              (Lab is Merchant of Record)
                                              "Pay Sharma Diagnostics"

FLOW B: PLATFORM SAAS SUBSCRIPTION
[Diagnostic Laboratory] ─── (SaaS Fee) ────► [Gyrex Labs Platform]
                                              (Gyrex is Merchant of Record)
                                              "Pay Gyrex Labs"
```

---

## 2. Mandatory Rules

1. **Merchant Identity:**  
   Gyrex must **NEVER** appear to the patient as the recipient of diagnostic payments. The patient is paying the laboratory directly.
2. **Gateway Credentials:**  
   Patient checkouts MUST use the laboratory's Razorpay credentials (stored securely and encrypted in `LabPaymentSettings`).  
   Platform subscriptions MUST use Gyrex's own Razorpay corporate merchant credentials.
3. **Database Separation:**  
   Under no circumstances should patient payments and Gyrex SaaS subscriptions share generic payment tables.

---

## 3. Entity Separation Matrix

| Feature | Flow A: Patient Diagnostic Payment | Flow B: Gyrex SaaS Subscription |
|---|---|---|
| **Payer** | Patient (`Patient.id`) | Diagnostic Lab (`Lab.id`) |
| **Payee** | Laboratory (`Lab.id`) | Gyrex Platform |
| **Primary Model** | `PatientPayment` | `SubscriptionPayment` |
| **Parent Entity** | `Order` | `SubscriptionInvoice` |
| **Product Billed** | Tests (`LabTest`) & Packages (`Package`) | Platform Tier (`SubscriptionPlan`) |
| **Payment Status** | `PENDING`, `AUTHORIZED`, `PAID`, `FAILED`, `REFUNDED`, `CASH_ON_COLLECTION` | `PENDING`, `AUTHORIZED`, `PAID`, `FAILED`, `REFUNDED` |
| **Supported Methods** | Online (Razorpay) or Cash on Collection | Online (Razorpay Recurring / Invoiced) |
| **Merchant Config** | `LabPaymentSettings` (Tenant specific) | Platform Environment (`GYREX_RAZORPAY_*`) |

---

## 4. Payment Verification (Webhook Rule - Section 32)

Payment success **MUST NOT** be determined only from client-side browser redirects or frontend callbacks.

- **Flow A:** Razorpay Webhook configured with `LabPaymentSettings.razorpayWebhookSecretEncrypted` or server-side signature verification is the **only authoritative trigger** to advance `Order.paymentStatus` to `PAID` and `Order.orderStatus` to `CONFIRMED`.
- **Flow B:** Gyrex subscription webhook updates `SubscriptionInvoice.status` and extends `Subscription.currentPeriodEnd`.
