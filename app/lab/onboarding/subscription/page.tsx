"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Check,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  Users,
  FileText,
  CreditCard,
  AlertTriangle,
} from "lucide-react";

interface PlanItem {
  id: string;
  name: string;
  code: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  maxOrdersPerMonth: number | null;
  maxStaffAccounts: number;
  customBrandingEnabled: boolean;
  geminiPrescriptionAiEnabled: boolean;
  isActive: boolean;
  displayOrder: number;
}

interface CurrentSubscription {
  id: string;
  status: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED" | "PAUSED";
  billingCycle: "MONTHLY" | "YEARLY";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
  gracePeriodEndsAt: string | null;
  effectivePrice: number;
  plan: PlanItem;
}

export default function LabOnboardingSubscriptionPage() {
  const router = useRouter();

  // State
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(null);
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Load Razorpay Checkout SDK
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Fetch plans and current subscription status
  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const [plansRes, subRes] = await Promise.all([
        fetch("/api/lab/subscription/plans"),
        fetch("/api/lab/subscription"),
      ]);

      if (!plansRes.ok) {
        throw new Error("Failed to load subscription plans.");
      }

      const plansData = await plansRes.json();
      if (plansData.success && Array.isArray(plansData.plans)) {
        setPlans(plansData.plans);
      }

      if (subRes.ok) {
        const subData = await subRes.json();
        if (subData.success && subData.subscription) {
          const s: CurrentSubscription = subData.subscription;
          setSubscription(s);
          setSelectedPlanId(s.plan.id);
          setBillingCycle(s.billingCycle || "MONTHLY");
        }
      }
    } catch (err: any) {
      setErrorBanner(err.message || "An unexpected error occurred while loading subscription data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle plan selection (server-authoritative)
  const handleSelectPlan = async (planId: string) => {
    setErrorBanner(null);
    setSuccessBanner(null);
    setSelecting(true);

    try {
      const res = await fetch("/api/lab/subscription/select-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          billingCycle,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to select subscription plan.");
      }

      setSelectedPlanId(planId);
      setSubscription(data.subscription);
      setSuccessBanner(
        `Selected the ${data.subscription.plan.name} (${billingCycle === "MONTHLY" ? "Monthly" : "Yearly"}).`
      );
    } catch (err: any) {
      setErrorBanner(err.message || "Could not select the chosen plan.");
    } finally {
      setSelecting(false);
    }
  };

  // Handle Razorpay Checkout payment
  const handlePayAndActivate = async () => {
    setErrorBanner(null);
    setSuccessBanner(null);
    setPaying(true);

    try {
      const res = await fetch("/api/lab/subscription/create-checkout", {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate subscription checkout.");
      }

      const RazorpayClass = (window as any).Razorpay;
      if (!RazorpayClass) {
        throw new Error("Razorpay Checkout SDK is still loading. Please try again in a few seconds.");
      }

      const options = {
        key: data.razorpayKeyId,
        amount: data.amountInPaise,
        currency: data.currency,
        name: "Gyrex Labs",
        description: `Platform Subscription - ${data.planName}`,
        order_id: data.gatewayOrderId,
        prefill: {
          name: data.labName,
        },
        theme: {
          color: "#0284c7",
        },
        handler: async function (response: any) {
          setVerifying(true);
          try {
            const verifyRes = await fetch("/api/lab/subscription/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                invoiceId: data.invoiceId,
                gatewayOrderId: response.razorpay_order_id || data.gatewayOrderId,
                gatewayPaymentId: response.razorpay_payment_id,
                gatewaySignature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.error || "Subscription verification failed.");
            }

            setSubscription(verifyData.subscription);
            setSuccessBanner("Subscription activated successfully! Your laboratory is ready for digital launch.");
          } catch (err: any) {
            setErrorBanner(err.message || "Failed to verify subscription payment.");
          } finally {
            setVerifying(false);
          }
        },
      };

      const rzp = new RazorpayClass(options);
      rzp.open();
    } catch (err: any) {
      setErrorBanner(err.message || "Payment initiation failed.");
    } finally {
      setPaying(false);
    }
  };

  const isActiveSubscription = subscription?.status === "ACTIVE";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      {/* ── Top Step Progress Indicator ─────────────────────────────────── */}
      <div className="border-b border-slate-200 bg-white py-4 px-4 sm:px-8 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between sm:justify-start gap-2 sm:gap-4 overflow-x-auto text-xs">
          {/* Step 1: Complete */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>1. Profile</span>
          </div>

          <div className="h-0.5 w-4 bg-emerald-300" />

          {/* Step 2: Complete */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>2. Catalogue</span>
          </div>

          <div className="h-0.5 w-4 bg-emerald-300" />

          {/* Step 3: Complete */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>3. Packages</span>
          </div>

          <div className="h-0.5 w-4 bg-emerald-300" />

          {/* Step 4: Complete */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>4. Payments</span>
          </div>

          <div className="h-0.5 w-4 bg-blue-300" />

          {/* Step 5: Active (Subscription) */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
              isActiveSubscription
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-blue-50 border border-blue-200 text-blue-700 ring-2 ring-blue-500/20"
            }`}
          >
            {isActiveSubscription ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white font-bold">
                5
              </span>
            )}
            <span>5. Subscription</span>
          </div>

          <div className="h-0.5 w-4 bg-slate-200" />

          {/* Step 6: Next */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-xs font-medium text-slate-400">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-300 text-[10px] text-slate-600 font-bold">
              6
            </span>
            <span>6. Launch</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        {/* Error Alert */}
        {errorBanner && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3 shadow-xs"
          >
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-800">Subscription Notice</p>
              <p className="text-xs text-red-700 mt-0.5">{errorBanner}</p>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {successBanner && (
          <div
            role="status"
            className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 flex items-start gap-3 shadow-xs"
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-emerald-800">Success</p>
              <p className="text-xs text-emerald-700 mt-0.5">{successBanner}</p>
            </div>
          </div>
        )}

        {/* ── Main Header ────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-100">
                  Step 5 of 6 — SaaS Platform Plan
                </span>
              </div>
              <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Gyrex Labs Subscription
              </h1>
              <p className="mt-1 text-sm text-slate-500 max-w-2xl">
                Choose the plan for your laboratory. Your laboratory subscription covers technology,
                hosting, and patient booking infrastructure.
              </p>
            </div>

            {/* Billing Cycle Toggle (only when not locked in active) */}
            {!isActiveSubscription && (
              <div className="inline-flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => setBillingCycle("MONTHLY")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                    billingCycle === "MONTHLY"
                      ? "bg-white text-slate-900 shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle("YEARLY")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                    billingCycle === "YEARLY"
                      ? "bg-white text-slate-900 shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Yearly <span className="text-[10px] font-bold text-emerald-600 ml-1">Save ~17%</span>
                </button>
              </div>
            )}
          </div>

          {/* ── Strict Separation Notice ─────────────────────────────────── */}
          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-blue-900 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-blue-900">
                Clear Financial Separation: Patient Revenue vs. Platform Subscription
              </p>
              <p className="text-blue-700 leading-relaxed">
                Diagnostic payments made by patients for blood tests and health checkups go directly into your
                laboratory&apos;s own bank account. Gyrex Labs never touches or deducts your patient earnings.
                Your platform subscription covers software, hosting, and patient commerce tools.
              </p>
            </div>
          </div>
        </div>

        {/* ── Loading Spinner ─────────────────────────────────────────── */}
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-xs">
            <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">Loading subscription plans...</p>
          </div>
        ) : (
          <>
            {/* ── Status Displays ─────────────────────────────────────── */}
            {/* ACTIVE STATE */}
            {subscription && subscription.status === "ACTIVE" && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-emerald-200/60 pb-5">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Active Subscription
                    </span>
                    <h2 className="mt-2 text-2xl font-bold text-slate-900">
                      Current Plan: {subscription.plan.name}
                    </h2>
                    <p className="text-xs text-slate-600 mt-1">
                      {subscription.plan.description || "Active subscription for your digital laboratory store."}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-2xl font-extrabold text-slate-900">
                      ₹{subscription.effectivePrice.toLocaleString("en-IN")}
                      <span className="text-xs font-normal text-slate-500">
                        {subscription.billingCycle === "MONTHLY" ? " / month" : " / year"}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 sm:justify-end">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        Renews on{" "}
                        {new Date(subscription.currentPeriodEnd).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-emerald-800">
                  Your laboratory already has an active subscription. You are all set to launch your digital store.
                </div>
              </div>
            )}

            {/* PAST DUE STATE */}
            {subscription && subscription.status === "PAST_DUE" && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <span className="font-semibold text-amber-900 text-sm">
                      Subscription Payment Past Due
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handlePayAndActivate}
                    disabled={paying || verifying}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 text-xs font-semibold shadow-xs transition"
                  >
                    {paying || verifying ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CreditCard className="h-3.5 w-3.5" />
                    )}
                    Pay Now to Renew
                  </button>
                </div>
                <p className="text-xs text-amber-800">
                  Your subscription payment could not be processed. Your store remains accessible during the 7-day grace period.
                </p>
              </div>
            )}

            {/* TRIALING STATE */}
            {subscription && subscription.status === "TRIALING" && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <span className="rounded-full bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-0.5 text-xs font-bold">
                      Trial Period Active
                    </span>
                    <span className="text-xs font-semibold text-slate-900">
                      {subscription.plan.name} (₹{subscription.effectivePrice.toLocaleString("en-IN")})
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Your trial is active until{" "}
                    <strong>
                      {subscription.trialEndsAt
                        ? new Date(subscription.trialEndsAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "the end of the period"}
                    </strong>
                    . You can activate your full subscription now or continue with the trial.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handlePayAndActivate}
                  disabled={paying || verifying}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 text-xs font-semibold shadow-xs transition shrink-0"
                >
                  {paying || verifying ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Opening Checkout...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-3.5 w-3.5" />
                      Pay &amp; Activate Now
                    </>
                  )}
                </button>
              </div>
            )}

            {/* ── Plan Selection Grid ─────────────────────────────────── */}
            {!isActiveSubscription && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => {
                  const isSelected = selectedPlanId === plan.id || subscription?.plan.id === plan.id;
                  const price =
                    billingCycle === "MONTHLY" ? plan.priceMonthly : plan.priceYearly;

                  return (
                    <div
                      key={plan.id}
                      className={`relative flex flex-col justify-between rounded-2xl border bg-white p-6 shadow-xs transition ${
                        isSelected
                          ? "border-blue-600 ring-2 ring-blue-600/20"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-[11px] font-bold text-white shadow-xs">
                          Selected Plan
                        </div>
                      )}

                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                          <p className="text-xs text-slate-500 mt-1 min-h-[32px]">
                            {plan.description || "Healthcare-grade digital infrastructure for your laboratory."}
                          </p>
                        </div>

                        {/* Pricing Display */}
                        <div className="pt-2 border-t border-slate-100">
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-extrabold text-slate-900">
                              ₹{price.toLocaleString("en-IN")}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              {billingCycle === "MONTHLY" ? " / month" : " / year"}
                            </span>
                          </div>
                          {billingCycle === "YEARLY" && (
                            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                              Billed annually (approx. ₹{Math.round(price / 12).toLocaleString("en-IN")}/mo)
                            </p>
                          )}
                        </div>

                        {/* Plan Features */}
                        <div className="pt-3 border-t border-slate-100 space-y-2.5 text-xs text-slate-600">
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-blue-600 shrink-0" />
                            <span>
                              {plan.maxOrdersPerMonth
                                ? `Up to ${plan.maxOrdersPerMonth.toLocaleString("en-IN")} orders / month`
                                : "Unlimited patient orders"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-600 shrink-0" />
                            <span>Up to {plan.maxStaffAccounts} staff accounts</span>
                          </div>

                          {plan.customBrandingEnabled && (
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-blue-600 shrink-0" />
                              <span>Custom laboratory store branding</span>
                            </div>
                          )}

                          {plan.geminiPrescriptionAiEnabled && (
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
                              <span>Prescription digitization &amp; search</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                            <span>Automated PDF report delivery</span>
                          </div>
                        </div>
                      </div>

                      {/* Selection Action CTA */}
                      <div className="pt-6 mt-6 border-t border-slate-100 space-y-2">
                        <button
                          type="button"
                          onClick={() => handleSelectPlan(plan.id)}
                          disabled={selecting || paying}
                          className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 ${
                            isSelected
                              ? "bg-slate-100 border border-slate-300 text-slate-700"
                              : "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                          } disabled:opacity-50`}
                        >
                          {selecting && selectedPlanId === plan.id ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              Selecting Plan...
                            </>
                          ) : isSelected ? (
                            <>
                              <Check className="h-4 w-4 text-emerald-600" />
                              Plan Selected
                            </>
                          ) : (
                            "Select Plan"
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Onboarding Navigation Footer ───────────────────────────── */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-600 space-y-0.5 text-center sm:text-left">
                <p className="font-semibold text-slate-900">
                  {selectedPlanId || subscription
                    ? "Subscription plan chosen. You are ready to continue."
                    : "Select a plan above to continue with your laboratory store."}
                </p>
                <p className="text-slate-500">
                  You can change or adjust your plan selection at any time from laboratory billing settings.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Link
                  href="/lab/onboarding/payments"
                  className="w-full sm:w-auto text-center px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  <ArrowLeft className="h-3.5 w-3.5 inline mr-1" />
                  Back to Payments
                </Link>

                <Link
                  href="/lab/dashboard"
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs font-semibold text-white shadow-xs transition ${
                    selectedPlanId || subscription
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-slate-300 text-slate-600 cursor-not-allowed pointer-events-none"
                  }`}
                >
                  Go to Dashboard
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
