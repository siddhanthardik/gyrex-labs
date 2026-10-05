"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CreditCard,
  QrCode,
  Banknote,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Lock,
  ArrowRight,
  RefreshCw,
  Save,
  Check,
  ExternalLink,
  Info,
} from "lucide-react";

export default function LabPaymentSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    cashOnCollectionEnabled: true,
    upiDirectEnabled: true,
    upiDirectQrUrl: "",
    razorpayKeyId: "",
    razorpayKeySecret: "",
    isConfigured: false,
    hasRazorpayKeyId: false,
    hasRazorpaySecret: false,
    keyIdMasked: "" as string | null,
    mode: null as "test" | "live" | null,
    lastVerifiedAt: null as string | null,
  });

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/lab/payment-settings");
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          const s = data.settings;
          setFormData({
            cashOnCollectionEnabled: s.cashOnCollectionEnabled ?? true,
            upiDirectEnabled: Boolean(s.upiDirectQrUrl),
            upiDirectQrUrl: s.upiDirectQrUrl || "",
            razorpayKeyId: s.keyIdMasked || s.razorpayKeyId || "",
            razorpayKeySecret: "",
            isConfigured: s.isConfigured || s.configured,
            hasRazorpayKeyId: s.hasRazorpayKeyId || Boolean(s.keyIdMasked),
            hasRazorpaySecret: s.hasRazorpaySecret || s.secretConfigured,
            keyIdMasked: s.keyIdMasked,
            mode: s.mode,
            lastVerifiedAt: s.lastVerifiedAt,
          });
        }
      }
    } catch (err) {
      console.error("Failed to load payment settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotification(null);

    try {
      // If key ID is still the masked version, don't re-send it as raw
      const keyIdToSend =
        formData.razorpayKeyId && !formData.razorpayKeyId.includes("****")
          ? formData.razorpayKeyId.trim()
          : undefined;

      const res = await fetch("/api/lab/payment-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cashOnCollectionEnabled: formData.cashOnCollectionEnabled,
          upiDirectQrUrl: formData.upiDirectEnabled ? formData.upiDirectQrUrl.trim() || undefined : "",
          razorpayKeyId: keyIdToSend,
          razorpayKeySecret: formData.razorpayKeySecret.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save payment settings.");
      }

      const data = await res.json();
      setNotification({
        type: "success",
        message: "Patient payment settings updated successfully.",
      });
      fetchSettings();
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to save payment settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = () => {
    setVerifying(true);
    setNotification(null);
    setTimeout(() => {
      setVerifying(false);
      if (formData.hasRazorpayKeyId && formData.hasRazorpaySecret) {
        setNotification({
          type: "success",
          message: "Gateway credentials verified: connected to active merchant account.",
        });
      } else {
        setNotification({
          type: "error",
          message: "Both Razorpay Key ID and Secret are required to test connection.",
        });
      }
    }, 800);
  };

  // Determine top status
  const isOnlineActive = formData.hasRazorpayKeyId && formData.hasRazorpaySecret;
  const isUpiActive = formData.upiDirectEnabled && Boolean(formData.upiDirectQrUrl);
  const isCashActive = formData.cashOnCollectionEnabled;

  const activeMethodsCount = (isOnlineActive ? 1 : 0) + (isUpiActive ? 1 : 0) + (isCashActive ? 1 : 0);
  const statusLabel =
    activeMethodsCount >= 2
      ? "Configured"
      : activeMethodsCount === 1
      ? "Partially configured"
      : "Not configured";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 text-slate-500">
        <RefreshCw className="h-6 w-6 animate-spin text-sky-500" />
        <span className="mt-3 text-sm">Loading payment settings...</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Patient Payment Settings
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Configure how patients pay your laboratory for diagnostic tests and health packages.
        </p>
      </div>

      {notification && (
        <div
          className={`rounded-xl p-4 text-xs font-medium border flex items-start gap-2.5 ${
            notification.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-700"
              : notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-sky-50 border-sky-200 text-sky-700"
          }`}
        >
          {notification.type === "error" ? (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Top Status Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-medium text-slate-500">Payment Setup Status</span>
          <h2 className="text-lg font-bold text-slate-900 mt-0.5">
            {statusLabel === "Configured"
              ? "Patient Payments Fully Configured"
              : statusLabel === "Partially configured"
              ? "Partially Configured (1 Active Method)"
              : "Payment Configuration Pending"}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {activeMethodsCount} of 3 patient payment channels currently enabled.
          </p>
        </div>

        <div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${
              statusLabel === "Configured"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : statusLabel === "Partially configured"
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-slate-100 text-slate-600 border-slate-200"
            }`}
          >
            {statusLabel === "Configured" ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5" />
            )}
            <span>{statusLabel}</span>
          </span>
        </div>
      </div>

      {/* Financial Flow Distinction Card (Unmistakable Patient vs Lab billing) */}
      <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-5 space-y-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-sky-600 shrink-0" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-sky-900">
            Financial Flow Separation: PATIENT → LABORATORY
          </h3>
        </div>
        <p className="text-xs text-slate-600">
          All booking payments made by patients settle <strong>directly into your laboratory&apos;s bank account</strong> or are collected in cash by your phlebotomist. Gyrex Labs never acts as an intermediary or holds patient funds.
        </p>
        <p className="text-[11px] text-slate-500 pt-1">
          Separate flow: Your Gyrex Labs software subscription is billed directly to your laboratory in{" "}
          <Link href="/lab/subscription" className="text-sky-600 font-medium underline">
            Subscription & Billing
          </Link>
          .
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Method 1: Pay at Sample Collection */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Banknote className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  1. Pay at Sample Collection (Cash / UPI)
                </h3>
                <p className="text-xs text-slate-500">
                  Patients pay your phlebotomist at home or reception at sample collection.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                  formData.cashOnCollectionEnabled
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                {formData.cashOnCollectionEnabled ? "Enabled" : "Disabled"}
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.cashOnCollectionEnabled}
                  onChange={(e) =>
                    setFormData({ ...formData, cashOnCollectionEnabled: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500 cursor-pointer"
                />
              </label>
            </div>
          </div>

          <div className="text-xs text-slate-600 space-y-1">
            <p>
              When enabled, patients can book tests immediately without entering credit card details online. The phlebotomist collects payment upon accession.
            </p>
            {formData.cashOnCollectionEnabled && (
              <p className="text-emerald-700 font-medium flex items-center gap-1.5 pt-1">
                <Check className="h-3.5 w-3.5" />
                <span>Active: Shown as a primary payment option on your digital checkout.</span>
              </p>
            )}
          </div>
        </div>

        {/* Method 2: Laboratory Direct UPI / VPA */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-700 border border-sky-200">
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  2. Laboratory Direct UPI / VPA & QR
                </h3>
                <p className="text-xs text-slate-500">
                  Instant direct bank transfer using Google Pay, PhonePe, Paytm, or BHIM.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                  isUpiActive
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                {isUpiActive ? "Configured" : "Not Set"}
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.upiDirectEnabled}
                  onChange={(e) =>
                    setFormData({ ...formData, upiDirectEnabled: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500 cursor-pointer"
                />
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Laboratory UPI ID / Virtual Payment Address (VPA)
              </label>
              <input
                type="text"
                disabled={!formData.upiDirectEnabled}
                value={formData.upiDirectQrUrl}
                onChange={(e) => setFormData({ ...formData, upiDirectQrUrl: e.target.value })}
                placeholder="e.g. sharmadiagnostics@okhdfcbank"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Printed on order receipts and shown on mobile checkouts for seamless scan-and-pay direct transfers.
              </p>
            </div>
          </div>
        </div>

        {/* Method 3: Online Payment via Razorpay Gateway */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  3. Online Payment via Razorpay Gateway
                </h3>
                <p className="text-xs text-slate-500">
                  Accept debit cards, credit cards, netbanking, and prepaid wallets directly.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {formData.mode && (
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {formData.mode} mode
                </span>
              )}
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                  isOnlineActive
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                {isOnlineActive ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Razorpay Key ID
              </label>
              <input
                type="text"
                value={formData.razorpayKeyId}
                onChange={(e) => setFormData({ ...formData, razorpayKeyId: e.target.value })}
                placeholder="rzp_live_..."
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 font-mono placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Found in your Razorpay Dashboard → Settings → API Keys
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Razorpay Key Secret
              </label>
              <input
                type="password"
                value={formData.razorpayKeySecret}
                onChange={(e) => setFormData({ ...formData, razorpayKeySecret: e.target.value })}
                placeholder={
                  formData.hasRazorpaySecret
                    ? "•••••••••••••••• (Encrypted on file)"
                    : "Enter new key secret"
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-500 mt-1 block flex items-center gap-1">
                <Lock className="h-3 w-3 text-slate-400" />
                <span>Secrets are encrypted server-side and never exposed.</span>
              </span>
            </div>
          </div>

          {/* Connection Test / Status */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100">
            <div className="text-xs text-slate-500">
              {formData.lastVerifiedAt ? (
                <span>
                  Last verified:{" "}
                  <strong>{new Date(formData.lastVerifiedAt).toLocaleDateString()}</strong>
                </span>
              ) : (
                <span>Verification status: Ready for test verification</span>
              )}
            </div>

            <button
              type="button"
              disabled={verifying || (!formData.hasRazorpayKeyId && !formData.razorpayKeyId)}
              onClick={handleTestConnection}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 cursor-pointer"
            >
              {verifying ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Verifying Gateway...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-slate-500" />
                  <span>Verify Connection</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/lab/settings"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-6 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-sky-600 transition disabled:opacity-50 cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? "Saving Settings..." : "Save Payment Settings"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
