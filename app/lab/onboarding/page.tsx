"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface StepData {
  // Step 1: Lab Details
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  homeCollectionAvailable: boolean;
  homeCollectionFee: number;

  // Step 2: Selected Tests
  selectedTests: Array<{ masterTestId: string; name: string; code: string; price: number }>;

  // Step 3: Package
  createStarterPackage: boolean;
  packageName: string;
  packagePrice: number;

  // Step 4: Patient Payment
  cashOnCollection: boolean;
  razorpayKeyId: string;
  upiId: string;

  // Step 5: Subscription
  subscriptionPlan: string;
}

export default function LabOnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [popularTests, setPopularTests] = useState<any[]>([]);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [formData, setFormData] = useState<StepData>({
    name: "",
    phone: "",
    whatsapp: "",
    email: "",
    addressLine1: "",
    city: "",
    state: "",
    postalCode: "",
    homeCollectionAvailable: true,
    homeCollectionFee: 100,
    selectedTests: [],
    createStarterPackage: true,
    packageName: "Basic Health Checkup",
    packagePrice: 699,
    cashOnCollection: true,
    razorpayKeyId: "",
    upiId: "",
    subscriptionPlan: "PLAN_GROWTH",
  });

  // Load existing lab settings and popular tests on mount
  useEffect(() => {
    async function loadInitial() {
      try {
        const [settingsRes, testsRes] = await Promise.all([
          fetch("/api/lab/settings"),
          fetch("/api/lab/catalogue/test-master?excludeAdded=false"),
        ]);

        if (settingsRes.ok) {
          const s = await settingsRes.json();
          if (s.lab) {
            setFormData((prev) => ({
              ...prev,
              name: s.lab.name || "",
              phone: s.lab.phone || "",
              whatsapp: s.lab.whatsapp || s.lab.phone || "",
              email: s.lab.email || "",
              addressLine1: s.lab.addressLine1 || "",
              city: s.lab.city || "",
              state: s.lab.state || "",
              postalCode: s.lab.postalCode || "",
              homeCollectionAvailable: s.settings?.homeCollectionAvailable ?? true,
              homeCollectionFee: s.settings?.homeCollectionFee ?? 100,
            }));
          }
        }

        if (testsRes.ok) {
          const t = await testsRes.json();
          if (t.tests) {
            setPopularTests(t.tests.slice(0, 8));
          }
        }
      } catch (err) {
        console.error("Failed to load onboarding initial data:", err);
      }
    }
    loadInitial();
  }, []);

  const toggleTestSelection = (test: any) => {
    setFormData((prev) => {
      const exists = prev.selectedTests.find((t) => t.masterTestId === test.id);
      if (exists) {
        return {
          ...prev,
          selectedTests: prev.selectedTests.filter((t) => t.masterTestId !== test.id),
        };
      } else {
        return {
          ...prev,
          selectedTests: [
            ...prev.selectedTests,
            { masterTestId: test.id, name: test.name, code: test.code, price: 400 },
          ],
        };
      }
    });
  };

  const updateTestPrice = (masterTestId: string, price: number) => {
    setFormData((prev) => ({
      ...prev,
      selectedTests: prev.selectedTests.map((t) =>
        t.masterTestId === masterTestId ? { ...t, price } : t
      ),
    }));
  };

  const handleSaveAndNext = async () => {
    setLoading(true);
    setNotification(null);

    try {
      if (currentStep === 1) {
        // Save Lab Details
        const res = await fetch("/api/lab/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            phone: formData.phone,
            emergencyPhone: formData.whatsapp,
            email: formData.email,
            addressLine1: formData.addressLine1,
            city: formData.city,
            state: formData.state,
            postalCode: formData.postalCode,
            homeCollectionAvailable: formData.homeCollectionAvailable,
            homeCollectionFee: formData.homeCollectionFee,
          }),
        });
        if (!res.ok) throw new Error("Failed to save laboratory details.");
      }

      if (currentStep === 2) {
        // Add selected tests to catalogue
        for (const t of formData.selectedTests) {
          await fetch("/api/lab/catalogue", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              masterTestId: t.masterTestId,
              sellingPrice: t.price,
              isHomeCollectionAvailable: formData.homeCollectionAvailable,
            }),
          });
        }
      }

      if (currentStep === 4) {
        // Save Payment Settings
        await fetch("/api/lab/payment-settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cashOnCollectionEnabled: formData.cashOnCollection,
            razorpayKeyId: formData.razorpayKeyId || undefined,
            upiDirectQrUrl: formData.upiId || undefined,
          }),
        });
      }

      if (currentStep === 6) {
        // Publish
        const res = await fetch("/api/lab/publish", { method: "POST" });
        const pubData = await res.json();
        if (!res.ok) throw new Error(pubData.error || "Failed to publish.");
        router.push("/lab/dashboard");
        return;
      }

      setCurrentStep((prev) => prev + 1);
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Something went wrong." });
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, title: "Lab Details" },
    { num: 2, title: "Add Tests" },
    { num: 3, title: "Packages" },
    { num: 4, title: "Payment Settings" },
    { num: 5, title: "Subscription" },
    { num: 6, title: "Review & Publish" },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-4">
      {/* Onboarding Header */}
      <div className="text-center">
        <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-400 border border-sky-500/20">
          Fast-Track Lab Store Setup
        </span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white">
          Create Your Digital Lab Store in ~10 Minutes
        </h1>
        <p className="mt-1.5 text-sm text-zinc-400">
          Complete these simple steps to configure your diagnostic tests, home collection, and patient booking store.
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between border-y border-zinc-800 py-4 px-2 overflow-x-auto gap-2">
        {steps.map((s) => (
          <div key={s.num} className="flex items-center gap-2 shrink-0">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${
                currentStep === s.num
                  ? "bg-sky-500 text-white"
                  : currentStep > s.num
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {currentStep > s.num ? "✓" : s.num}
            </div>
            <span
              className={`text-xs font-medium ${
                currentStep === s.num ? "text-white" : "text-zinc-400"
              }`}
            >
              {s.title}
            </span>
          </div>
        ))}
      </div>

      {notification && (
        <div
          className={`rounded-xl p-4 text-xs font-medium border ${
            notification.type === "error"
              ? "bg-rose-500/10 border-rose-500/25 text-rose-400"
              : "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Step Content */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8 backdrop-blur-sm">
        {/* STEP 1: LAB DETAILS */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white">1. Laboratory Information</h2>
              <p className="text-xs text-zinc-400">Basic clinic or diagnostic center details visible to patients.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-300">Laboratory Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Sharma Diagnostics & Pathology"
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">Public Phone *</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">WhatsApp Number</label>
                <input
                  type="text"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-300">Official Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@sharmadiagnostics.com"
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-300">Address Line *</label>
                <input
                  type="text"
                  required
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  placeholder="12/4 Medical Enclave, Civil Hospital Road"
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">City *</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Jaipur"
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">State *</label>
                <input
                  type="text"
                  required
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="Rajasthan"
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">Pincode *</label>
                <input
                  type="text"
                  required
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  placeholder="302001"
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">Home Collection Fee (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.homeCollectionFee}
                  onChange={(e) => setFormData({ ...formData, homeCollectionFee: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: ADD TESTS */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white">2. Quick-Add Diagnostic Tests</h2>
              <p className="text-xs text-zinc-400">
                Select from standard Gyrex Test Master tests. Set your laboratory&apos;s selling price.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {popularTests.map((test) => {
                const isSelected = formData.selectedTests.some((t) => t.masterTestId === test.id);
                const selectedItem = formData.selectedTests.find((t) => t.masterTestId === test.id);

                return (
                  <div
                    key={test.id}
                    className={`rounded-xl border p-4 transition ${
                      isSelected
                        ? "border-sky-500/50 bg-sky-500/10"
                        : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-bold text-sky-400">
                            {test.code}
                          </span>
                          <span className="text-xs text-zinc-400">{test.sampleType}</span>
                        </div>
                        <h4 className="mt-1 text-sm font-semibold text-white">{test.name}</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleTestSelection(test)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                          isSelected
                            ? "bg-sky-500 text-white"
                            : "border border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-white"
                        }`}
                      >
                        {isSelected ? "Selected ✓" : "+ Add"}
                      </button>
                    </div>

                    {isSelected && selectedItem && (
                      <div className="mt-3 pt-3 border-t border-sky-500/20 flex items-center justify-between">
                        <span className="text-xs text-zinc-300">Your Selling Price:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-semibold text-white">₹</span>
                          <input
                            type="number"
                            value={selectedItem.price}
                            onChange={(e) =>
                              updateTestPrice(test.id, Math.max(0, Number(e.target.value)))
                            }
                            className="w-20 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white">
                  {formData.selectedTests.length} Tests Selected
                </p>
                <p className="text-[11px] text-zinc-400">
                  You can also bulk import 500+ tests via CSV in Catalogue after setup.
                </p>
              </div>
              <Link
                href="/lab/catalogue/test-master"
                className="text-xs font-semibold text-sky-400 hover:underline"
              >
                Browse All 1,000+ Master Tests →
              </Link>
            </div>
          </div>
        )}

        {/* STEP 3: PACKAGES */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white">3. Health Packages</h2>
              <p className="text-xs text-zinc-400">
                Patients love bundled preventive health checkups.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Starter Health Checkup Package</h3>
                  <p className="text-xs text-zinc-400">
                    Bundles popular tests with special discounted pricing.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.createStarterPackage}
                  onChange={(e) =>
                    setFormData({ ...formData, createStarterPackage: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-zinc-700 text-sky-500"
                />
              </div>

              {formData.createStarterPackage && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2 border-t border-zinc-800">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300">Package Name</label>
                    <input
                      type="text"
                      value={formData.packageName}
                      onChange={(e) => setFormData({ ...formData, packageName: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300">Package Selling Price (₹)</label>
                    <input
                      type="number"
                      value={formData.packagePrice}
                      onChange={(e) =>
                        setFormData({ ...formData, packagePrice: Number(e.target.value) })
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: PATIENT PAYMENT SETTINGS */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white">4. Patient Diagnostic Payments</h2>
              <p className="text-xs text-zinc-400">
                Configure how patients pay your laboratory for diagnostic tests.
              </p>
            </div>

            <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 text-xs text-sky-300">
              <p className="font-semibold">Important Payment Trust Principle:</p>
              <p className="mt-1 text-sky-400/80">
                Patients pay your laboratory directly. Gyrex Labs does not collect or hold patient diagnostic payments.
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white">Pay at Home Sample Collection</h4>
                  <p className="text-xs text-zinc-400">Allow patients to pay cash/UPI directly to phlebotomist upon arrival.</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.cashOnCollection}
                  onChange={(e) =>
                    setFormData({ ...formData, cashOnCollection: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-zinc-700 text-sky-500"
                />
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
                <h4 className="text-sm font-semibold text-white">Laboratory Razorpay Merchant Key (Optional)</h4>
                <p className="text-xs text-zinc-400">If you want to accept online UPI / Debit Card payments directly into your bank account.</p>
                <input
                  type="text"
                  placeholder="rzp_live_..."
                  value={formData.razorpayKeyId}
                  onChange={(e) => setFormData({ ...formData, razorpayKeyId: e.target.value })}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: GYREX SUBSCRIPTION */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white">5. Gyrex Labs Platform Subscription</h2>
              <p className="text-xs text-zinc-400">
                This is what your laboratory pays to Gyrex Labs for technology and hosting.
              </p>
            </div>

            <div className="rounded-2xl border border-sky-500/40 bg-sky-500/10 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="rounded bg-sky-500/20 px-2 py-0.5 text-xs font-bold text-sky-400">
                    Recommended Plan
                  </span>
                  <h3 className="mt-2 text-xl font-bold text-white">Growth Plan</h3>
                  <p className="text-xs text-zinc-300">Everything needed to power your digital laboratory store</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-white">₹1,999</span>
                  <span className="text-xs text-zinc-400"> / month</span>
                </div>
              </div>

              <ul className="mt-4 space-y-2 border-t border-sky-500/20 pt-4 text-xs text-zinc-200">
                <li>✓ Unlimited diagnostic tests & packages</li>
                <li>✓ Up to 500 patient orders per month</li>
                <li>✓ Prescription AI text extraction</li>
                <li>✓ 5 staff accounts</li>
              </ul>
            </div>
          </div>
        )}

        {/* STEP 6: REVIEW & PUBLISH */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white">6. Review & Publish Digital Store</h2>
              <p className="text-xs text-zinc-400">
                Your digital storefront is configured and ready to be made publicly bookable.
              </p>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 flex items-center justify-between">
                <span className="text-xs text-zinc-300">Laboratory Details:</span>
                <span className="text-xs font-semibold text-emerald-400">✓ Complete</span>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 flex items-center justify-between">
                <span className="text-xs text-zinc-300">Diagnostic Tests:</span>
                <span className="text-xs font-semibold text-emerald-400">
                  ✓ {formData.selectedTests.length} Tests Ready
                </span>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 flex items-center justify-between">
                <span className="text-xs text-zinc-300">Patient Payment Method:</span>
                <span className="text-xs font-semibold text-emerald-400">
                  ✓ {formData.cashOnCollection ? "Pay at Collection Enabled" : "Online Gateway"}
                </span>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 flex items-center justify-between">
                <span className="text-xs text-zinc-300">Platform Subscription:</span>
                <span className="text-xs font-semibold text-sky-400">Growth Plan (₹1,999/mo)</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Actions */}
        <div className="mt-8 flex items-center justify-between pt-6 border-t border-zinc-800">
          {currentStep > 1 ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-800"
            >
              ← Back
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            disabled={loading}
            onClick={handleSaveAndNext}
            className="rounded-lg bg-sky-500 px-6 py-2 text-xs font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-400 disabled:opacity-50"
          >
            {loading
              ? "Saving..."
              : currentStep === 6
              ? "Publish My Lab Store"
              : "Save & Continue →"}
          </button>
        </div>
      </div>
    </div>
  );
}
