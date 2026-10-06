"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  ExternalLink,
  HelpCircle,
  Check,
  Building,
  Info,
  Banknote,
  QrCode,
  KeyRound,
} from "lucide-react";

interface SafePaymentSettings {
  id: string;
  labId: string;
  configured: boolean;
  isConfigured: boolean;
  mode: "test" | "live" | null;
  keyIdMasked: string | null;
  razorpayKeyIdMasked: string | null;
  hasRazorpayKeyId: boolean;
  hasRazorpaySecret: boolean;
  secretConfigured: boolean;
  cashOnCollectionEnabled: boolean;
  upiDirectQrUrl: string | null;
  lastVerifiedAt: string | null;
  trustNotice: {
    headline: string;
    subheadline: string;
  };
}

export default function LabOnboardingPaymentsPage() {
  const router = useRouter();

  // State
  const [settings, setSettings] = useState<SafePaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Form Fields
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [cashOnCollection, setCashOnCollection] = useState(true);
  const [upiQrUrl, setUpiQrUrl] = useState("");
  const [selectedMode, setSelectedMode] = useState<"test" | "live">("test");

  // Load existing payment settings
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const res = await fetch("/api/lab/payment-settings");
      if (!res.ok) {
        throw new Error("Failed to load laboratory payment settings.");
      }
      const data = await res.json();
      if (data.success && data.settings) {
        const s: SafePaymentSettings = data.settings;
        setSettings(s);
        setCashOnCollection(s.cashOnCollectionEnabled ?? true);
        setUpiQrUrl(s.upiDirectQrUrl || "");
        if (s.mode) {
          setSelectedMode(s.mode);
        }
        // If not configured, show form by default; if already configured, collapse form
        setShowEditForm(!s.hasRazorpayKeyId || !s.secretConfigured);
      }
    } catch (err: any) {
      setErrorBanner(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    setSuccessBanner(null);

    // Validate if user entered credentials
    if (keyId.trim()) {
      const lower = keyId.trim().toLowerCase();
      if (!lower.startsWith("rzp_test_") && !lower.startsWith("rzp_live_")) {
        setErrorBanner(
          "Invalid Razorpay Key ID format. The Key ID must start with 'rzp_test_' (Test Mode) or 'rzp_live_' (Live Mode)."
        );
        return;
      }
    }

    if (keyId.trim() && !settings?.secretConfigured && !keySecret.trim()) {
      setErrorBanner(
        "Please provide the corresponding Razorpay Key Secret for your Key ID."
      );
      return;
    }

    setSubmitting(true);

    try {
      const payload: any = {
        cashOnCollectionEnabled: cashOnCollection,
        upiDirectQrUrl: upiQrUrl.trim() || undefined,
      };

      if (keyId.trim()) {
        payload.razorpayKeyId = keyId.trim();
      }

      if (keySecret.trim()) {
        payload.razorpayKeySecret = keySecret.trim();
      }

      const res = await fetch("/api/lab/payment-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update payment settings.");
      }

      setSettings(data.settings);
      setKeySecret(""); // Never keep secret in form state after saving
      setKeyId("");
      setShowEditForm(false);
      setSuccessBanner(
        "Payment settings saved and encrypted securely. Your laboratory payment account is configured."
      );
    } catch (err: any) {
      setErrorBanner(err.message || "Failed to save payment settings.");
    } finally {
      setSubmitting(false);
    }
  };

  const isConfigured = Boolean(
    settings && (settings.hasRazorpayKeyId || settings.cashOnCollectionEnabled)
  );
  const hasDigitalGateway = Boolean(
    settings && settings.hasRazorpayKeyId && settings.secretConfigured
  );

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      {/* ── Top Header & Progress Stepper ────────────────────────────── */}
      <div className="max-w-5xl mx-auto mb-8 text-center sm:text-left sm:flex sm:items-center sm:justify-between border-b border-slate-200 pb-6">
        <div>
          <Link href="/" className="inline-block mb-3">
            <Image
              src="/branding/gyrex-labs.svg"
              alt="Gyrex Labs"
              width={150}
              height={44}
              priority
              className="h-8 w-auto"
            />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Laboratory Payment Account
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Step 4 of your digital laboratory setup. Connect your Razorpay account to receive patient diagnostic payments.
          </p>
        </div>

        {/* 5-Step Progress Indicators */}
        <div className="mt-6 sm:mt-0 flex items-center justify-center space-x-2">
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

          <div className="h-0.5 w-4 bg-blue-300" />

          {/* Step 4: Active (Payments) */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
              isConfigured
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-blue-50 border border-blue-200 text-blue-700 ring-2 ring-blue-500/20"
            }`}
          >
            {isConfigured ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white font-bold">
                4
              </span>
            )}
            <span>4. Payments</span>
          </div>

          <div className="h-0.5 w-4 bg-slate-200" />

          {/* Step 5: Next (Subscription) */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-xs font-medium text-slate-500">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-300 text-[10px] text-slate-700 font-bold">
              5
            </span>
            <span>5. Subscription</span>
          </div>

          <div className="h-0.5 w-4 bg-slate-200" />

          {/* Step 6: Locked */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-xs font-medium text-slate-400">
            <Lock className="h-3.5 w-3.5 text-slate-400" />
            <span>6. Launch</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Error Alert */}
        {errorBanner && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3 shadow-sm"
          >
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-800">Payment Configuration Alert</p>
              <p className="text-xs text-red-700 mt-0.5">{errorBanner}</p>
            </div>
            <button
              onClick={() => setErrorBanner(null)}
              className="text-red-400 hover:text-red-700"
            >
              &times;
            </button>
          </div>
        )}

        {/* Success Alert */}
        {successBanner && (
          <div
            role="alert"
            className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-start gap-3 shadow-sm"
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-emerald-900">{successBanner}</p>
            </div>
            <button
              onClick={() => setSuccessBanner(null)}
              className="text-emerald-500 hover:text-emerald-800"
            >
              &times;
            </button>
          </div>
        )}

        {/* ── Healthcare Financial Model Trust Notice ──────────────────── */}
        <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-5 shadow-2xs">
          <div className="flex items-start gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Building className="h-5 w-5" />
            </div>
            <div className="space-y-1 text-xs text-slate-600 leading-relaxed">
              <h3 className="text-sm font-bold text-slate-900">
                Direct Patient Diagnostic Payments (Flow A)
              </h3>
              <p>
                Patients pay your laboratory directly for all diagnostic tests and packages booked through your storefront. Gyrex Labs provides your SaaS software infrastructure and <strong>never touches patient diagnostic funds</strong>.
              </p>
              <p className="text-[11px] text-slate-500 pt-1 border-t border-blue-100">
                <strong>Notice on Platform Billing:</strong> Gyrex subscription billing (Flow B) is managed completely separately and does not use these credentials.
              </p>
            </div>
          </div>
        </div>

        {/* ── Main Content Area ──────────────────────────────────────── */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-900">Loading payment configuration...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ── Status Card (When Configured) ────────────────────────── */}
            {hasDigitalGateway && !showEditForm && (
              <div className="bg-white rounded-2xl border border-emerald-200 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900">
                          Razorpay Merchant Gateway Connected
                        </h2>
                        <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {settings?.mode === "live" ? "Live Production Mode" : "Test Sandbox Mode"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Your laboratory is configured to accept direct UPI, Cards, and Netbanking.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowEditForm(true)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <KeyRound className="h-3.5 w-3.5 text-slate-500" />
                    Update Credentials
                  </button>
                </div>

                {/* Safe Credential Summary */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-100 pt-5 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-500 text-[11px]">Razorpay Key ID</span>
                    <p className="font-mono font-bold text-slate-800 mt-0.5">
                      {settings?.keyIdMasked || "—"}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-500 text-[11px]">Key Secret</span>
                    <p className="font-semibold text-emerald-700 mt-0.5 flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Encrypted (AES-256-GCM)
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-500 text-[11px]">Cash on Collection</span>
                    <p className="font-semibold text-slate-800 mt-0.5">
                      {settings?.cashOnCollectionEnabled ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Configuration Form Card ──────────────────────────────── */}
            {showEditForm && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                      <span>Configure Razorpay Merchant Credentials</span>
                    </h2>

                    {hasDigitalGateway && (
                      <button
                        type="button"
                        onClick={() => setShowEditForm(false)}
                        className="text-xs text-slate-500 hover:text-slate-800 underline"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Enter your laboratory&apos;s Razorpay Key ID and Secret. You can find these in your Razorpay Dashboard under Settings &rarr; API Keys.
                  </p>
                </div>

                {/* Mode Selector Guidance */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Razorpay Key Type Guidance
                    </span>
                    <a
                      href="https://dashboard.razorpay.com/#/access/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                    >
                      <span>Open Razorpay Dashboard</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Razorpay keys automatically denote the processing mode:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="font-bold text-amber-700">Test Mode Keys:</span>
                      <span className="text-slate-500 block text-[11px]">
                        Starts with <code className="font-mono text-slate-700">rzp_test_...</code> for simulated test payments.
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="font-bold text-emerald-700">Live Mode Keys:</span>
                      <span className="text-slate-500 block text-[11px]">
                        Starts with <code className="font-mono text-slate-700">rzp_live_...</code> for actual patient bank settlements.
                      </span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Razorpay Key ID */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Razorpay Key ID
                    </label>
                    <input
                      type="text"
                      placeholder={settings?.keyIdMasked ? `Current: ${settings.keyIdMasked}` : "e.g. rzp_test_1DP5mmOlqwxSgn"}
                      value={keyId}
                      onChange={(e) => setKeyId(e.target.value)}
                      className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Public identifier for your merchant account.
                    </p>
                  </div>

                  {/* Razorpay Key Secret */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Razorpay Key Secret
                    </label>
                    <div className="relative">
                      <input
                        type={showSecret ? "text" : "password"}
                        placeholder={settings?.secretConfigured ? "Current secret is encrypted & configured. Enter new to update." : "e.g. w5xX76YzA3... (never shown once saved)"}
                        value={keySecret}
                        onChange={(e) => setKeySecret(e.target.value)}
                        className="w-full text-xs font-mono px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700"
                      >
                        {showSecret ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-amber-700">
                      <Lock className="h-3 w-3 shrink-0" />
                      <span>
                        Security Protocol: Secrets are encrypted using AES-256-GCM and are never sent back to the browser.
                      </span>
                    </div>
                  </div>

                  {/* Cash on Collection Option */}
                  <div className="pt-4 border-t border-slate-100 flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4 text-emerald-600" />
                        <span className="text-xs font-semibold text-slate-900">
                          Cash on Sample Collection
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Allow patients to pay in cash to the phlebotomist during home sample collection or at your lab counter.
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cashOnCollection}
                        onChange={(e) => setCashOnCollection(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Submit CTA */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                    {hasDigitalGateway && (
                      <button
                        type="button"
                        onClick={() => setShowEditForm(false)}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                      >
                        Cancel
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Encrypting &amp; Saving...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Save Payment Settings
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ── Onboarding Navigation & Launch Status ─────────────────── */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-600 space-y-0.5 text-center sm:text-left">
                <p className="font-semibold text-slate-900">
                  {isConfigured
                    ? "Payment settings configured. Step 4 complete."
                    : "Configure payment credentials above, or continue to view your laboratory dashboard."}
                </p>
                <p className="text-slate-500">
                  Step 5 (Storefront Launch) will be enabled when final platform verification is performed.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Link
                  href="/lab/onboarding/packages"
                  className="w-full sm:w-auto text-center px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  <ArrowLeft className="h-3.5 w-3.5 inline mr-1" />
                  Back to Packages
                </Link>

                <Link
                  href="/lab/onboarding/subscription"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
                >
                  Continue to Subscription
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
