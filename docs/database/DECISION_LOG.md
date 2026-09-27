# Gyrex Labs — Database Architectural Decision Log

Version: 1.0  
Owner: 01 — DATABASE & DATA MODEL  

---

## Decision 001: Centralized Test Master vs Lab Catalogue Duplication

- **Context:** Diagnostic tests have standardized clinical names, sample requirements, fasting guidelines, and codes (LOINC), but each laboratory sets its own selling price, turnaround time (TAT), and home collection feasibility.
- **Decision:** Gyrex maintains a centralized `TestMaster` table categorized by `TestCategory`. Laboratories maintain a lightweight `LabTest` table referencing `TestMaster(id)` with their own `sellingPrice`, `mrpPrice`, `customTatHours`, and `isActive` flags.
- **Consequence:** Eliminates multi-tenant test duplication across thousands of labs while ensuring consistent clinical naming and AI prescription matching.

---

## Decision 002: Cross-Tenant Safe Patient Representation

- **Context:** A patient may use multiple diagnostic labs across their lifetime. Merging them into a single tenant model would create cross-tenant data leakage risks. Completely isolating them as separate records without phone linking would force repeat identity registration.
- **Decision:** Split into global `Patient` (holds phone, name, gender) and tenant-scoped `LabPatient` junction (holds `uhid`, private internal notes, order count, total spent).
- **Consequence:** Lab A cannot inspect Lab B's patient orders or private notes. The query `Order.where({ labId, patientId })` ensures watertight multi-tenant isolation.

---

## Decision 003: Strict Payment Entity Separation (Flow A vs Flow B)

- **Context:** Conflating patient diagnostic payments (Patient → Lab) and Gyrex platform subscriptions (Lab → Gyrex) into a single polymorphic payment table risks routing patient revenue into Gyrex's merchant account or confusing statutory tax/GST accounting.
- **Decision:** Implement dedicated models:
  - `PatientPayment` bound to `Order` and `Lab` (Flow A).
  - `SubscriptionPayment` bound to `SubscriptionInvoice` and `Subscription` (Flow B).
- **Consequence:** Visual, technical, and regulatory clarity. Separate webhooks, separate reconciliations.

---

## Decision 004: Gyrex Labs is NOT an LIS (Report & Result Boundaries)

- **Context:** Section 1 & Section 19 of the Master Architecture dictate: "Gyrex Labs is NOT an LIS. The laboratory's existing LIS remains responsible for laboratory operations and clinical result processing."
- **Decision:** Omit analyte result-entry tables, reference ranges, pathology sign-off workflows, instrument flags, and analyzer interfaces. The `Report` entity stores diagnostic report metadata and a secure reference to a `FileAsset` (e.g. encrypted PDF).
- **Consequence:** Keeps the platform lightweight, reliable, compliant, and decoupled from hospital instrument complexity.

---

## Decision 005: Narrow AI Scope for Prescriptions

- **Context:** Gemini API must only be used to identify explicitly written laboratory investigations, not diagnose or prescribe.
- **Decision:** The `Prescription` and `PrescriptionExtractedItem` models store strictly extracted test names, confidence scores, and matches to `TestMaster`. Patient confirmation (`isConfirmedByPatient`) is required before any item can be ordered.
- **Consequence:** Zero hallucinated clinical diagnosis stored in the database.
