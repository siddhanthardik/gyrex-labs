"use client";

import React, { useState, useEffect } from "react";

export default function LabPaymentSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [formData, setFormData] = useState({
    cashOnCollectionEnabled: true,
    razorpayKeyId: "",
    razorpayKeySecret: "",
    upiDirectQrUrl: "",
    isConfigured: false,
    hasRazorpaySecret: false,
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/lab/payment-settings");
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            setFormData({
              cashOnCollectionEnabled: data.settings.cashOnCollectionEnabled,
              razorpayKeyId: data.settings.razorpayKeyId || "",
              razorpayKeySecret: "",
              upiDirectQrUrl: data.settings.upiDirectQrUrl || "",
              isConfigured: data.settings.isConfigured,
              hasRazorpaySecret: data.settings.hasRazorpaySecret,
            });
          }
        }
      } catch (err) {
        console.error("Failed to load payment settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotification(null);

    try {
      const res = await fetch("/api/lab/payment-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cashOnCollectionEnabled: formData.cashOnCollectionEnabled,
          razorpayKeyId: formData.razorpayKeyId || undefined,
          razorpayKeySecret: formData.razorpayKeySecret || undefined,
          upiDirectQrUrl: formData.upiDirectQrUrl || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update payment settings.");
      }

      const data = await res.json();
      setNotification({ type: "success", message: "Patient diagnostic payment settings saved." });
      setFormData((prev) => ({
        ...prev,
        isConfigured: data.settings.isConfigured,
        hasRazorpaySecret: !!prev.razorpayKeySecret || prev.hasRazorpaySecret,
        razorpayKeySecret: "",
      }));
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 text-zinc-400">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
        <span className="ml-3 text-sm">Loading payment settings...</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Patient Payment Settings</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Configure how patients pay your diagnostic laboratory.
        </p>
      </div>

      {/* Prominent Trust Banner */}
      <div className="rounded-2xl border border-sky-500/30 bg-sky-950/20 p-6 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🛡️</span>
          <h2 className="text-sm font-bold text-sky-300">
            Patients pay your laboratory directly.
          </h2>
        </div>
        <p className="text-xs text-zinc-300">
          Gyrex Labs powers your booking platform. Diagnostic payments flow directly into your own bank account or are collected by your phlebotomist.
        </p>
        <p className="text-[11px] text-zinc-400 pt-1">
          * Note: Your Gyrex software subscription is billed separately in Subscription & Billing.
        </p>
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

      <form onSubmit={handleSubmit} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8 space-y-6">
        {/* Method 1: Cash/UPI on Collection */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Pay at Sample Collection (Recommended)</h3>
              <p className="text-xs text-zinc-400">
                Patients pay cash or direct UPI to your phlebotomist at home or at the front desk.
              </p>
            </div>
            <input
              type="checkbox"
              checked={formData.cashOnCollectionEnabled}
              onChange={(e) =>
                setFormData({ ...formData, cashOnCollectionEnabled: e.target.checked })
              }
              className="h-5 w-5 rounded border-zinc-700 text-sky-500 focus:ring-sky-500"
            />
          </div>

          {formData.cashOnCollectionEnabled && (
            <div className="pt-2 text-[11px] text-emerald-400">
              ✓ Active: Patients can book without immediate online card payment.
            </div>
          )}
        </div>

        {/* Method 2: Direct UPI ID / QR */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-white">Laboratory Direct UPI ID / VPA</h3>
            <p className="text-xs text-zinc-400">
              Displayed on order receipts for instant direct bank transfer via GPay, PhonePe, Paytm.
            </p>
          </div>

          <input
            type="text"
            value={formData.upiDirectQrUrl}
            onChange={(e) => setFormData({ ...formData, upiDirectQrUrl: e.target.value })}
            placeholder="e.g. sharmadiagnostics@okhdfcbank"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
          />
        </div>

        {/* Method 3: Razorpay Direct Merchant Account */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">Laboratory Razorpay Gateway (Optional)</h3>
            <p className="text-xs text-zinc-400">
              Provide your laboratory&apos;s own Razorpay API keys to accept debit/credit cards and netbanking.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300">
                Razorpay Key ID
              </label>
              <input
                type="text"
                value={formData.razorpayKeyId}
                onChange={(e) => setFormData({ ...formData, razorpayKeyId: e.target.value })}
                placeholder="rzp_live_..."
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300">
                Razorpay Key Secret
              </label>
              <input
                type="password"
                value={formData.razorpayKeySecret}
                onChange={(e) => setFormData({ ...formData, razorpayKeySecret: e.target.value })}
                placeholder={formData.hasRazorpaySecret ? "•••••••••••• (Encrypted on file)" : "Enter key secret"}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-zinc-500">
                Secrets are encrypted server-side and never exposed back to the client.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-sky-500 px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-sky-500/20 hover:bg-sky-400 transition disabled:opacity-50"
          >
            {saving ? "Saving Settings..." : "Save Payment Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
