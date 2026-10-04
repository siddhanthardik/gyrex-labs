"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

export default function LabSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lab, setLab] = useState<any>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    emergencyPhone: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    heroHeadline: "",
    heroSubheadline: "",
    homeCollectionAvailable: true,
    homeCollectionFee: 100,
    freeHomeCollectionThreshold: 1000,
    deliveryPromiseNotice: "Reports delivered within 24 hours",
    primaryColor: "#0284c7",
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/lab/settings");
        if (res.ok) {
          const d = await res.json();
          setLab(d.lab);
          setFormData({
            name: d.lab.name || "",
            phone: d.lab.phone || "",
            emergencyPhone: d.lab.whatsapp || d.lab.phone || "",
            email: d.lab.email || "",
            addressLine1: d.lab.addressLine1 || "",
            addressLine2: d.lab.addressLine2 || "",
            city: d.lab.city || "",
            state: d.lab.state || "",
            postalCode: d.lab.postalCode || "",
            heroHeadline: d.settings?.heroHeadline || "Book Diagnostic Tests Online",
            heroSubheadline: d.settings?.heroSubheadline || "Accurate reports, professional care.",
            homeCollectionAvailable: d.settings?.homeCollectionAvailable ?? true,
            homeCollectionFee: d.settings?.homeCollectionFee ?? 100,
            freeHomeCollectionThreshold: d.settings?.freeHomeCollectionThreshold ?? 1000,
            deliveryPromiseNotice: d.settings?.deliveryPromiseNotice || "Reports delivered within 24 hours",
            primaryColor: d.settings?.primaryColor || "#0284c7",
          });
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
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
      const res = await fetch("/api/lab/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update store settings.");
      }

      setNotification({ type: "success", message: "Laboratory details and store settings saved." });
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Failed to update settings." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 text-zinc-400">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
        <span className="ml-3 text-sm">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Laboratory & Store Settings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Configure your public storefront branding, contact information, and home collection rules.
          </p>
        </div>

        {lab && (
          <Link
            href={`/${lab.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <span>Preview Live Storefront ↗</span>
          </Link>
        )}
      </div>

      {notification && (
        <div
          className={`rounded-xl p-4 text-xs font-medium border ${
            notification.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-700"
              : "bg-emerald-50 border-emerald-200 text-emerald-700"
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Verification Status Card */}
      {lab && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Platform Verification Status
            </span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-slate-900">
                {lab.isVerified ? "Verified Diagnostic Laboratory" : "Pending Gyrex Verification"}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold border ${
                  lab.isVerified
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {lab.isVerified ? "Verified ✓" : "Pending"}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Verification badges are verified and issued by Gyrex Platform Administrators.
            </p>
          </div>

          <div className="text-xs text-slate-500 sm:text-right">
            <span>Store URL Slug:</span>
            <p className="font-mono font-medium text-slate-900">labs.gyrex.in/{lab.slug}</p>
          </div>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Lab Details */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Laboratory Details</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700">Laboratory Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Public Phone *</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">WhatsApp Support Number</label>
              <input
                type="text"
                value={formData.emergencyPhone}
                onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700">Official Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700">Street Address *</label>
              <input
                type="text"
                required
                value={formData.addressLine1}
                onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">City *</label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">State *</label>
              <input
                type="text"
                required
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Postal Code / Pincode *</label>
              <input
                type="text"
                required
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Storefront Presentation & Home Collection */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Storefront Display & Delivery Rules</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700">Hero Headline</label>
              <input
                type="text"
                value={formData.heroHeadline}
                onChange={(e) => setFormData({ ...formData, heroHeadline: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700">Hero Subheadline</label>
              <input
                type="text"
                value={formData.heroSubheadline}
                onChange={(e) => setFormData({ ...formData, heroSubheadline: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Home Sample Collection Fee (₹)</label>
              <input
                type="number"
                min="0"
                value={formData.homeCollectionFee}
                onChange={(e) => setFormData({ ...formData, homeCollectionFee: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Free Collection Threshold (₹)</label>
              <input
                type="number"
                min="0"
                value={formData.freeHomeCollectionThreshold}
                onChange={(e) => setFormData({ ...formData, freeHomeCollectionThreshold: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700">Report Turnaround Notice</label>
              <input
                type="text"
                value={formData.deliveryPromiseNotice}
                onChange={(e) => setFormData({ ...formData, deliveryPromiseNotice: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2 flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                checked={formData.homeCollectionAvailable}
                onChange={(e) => setFormData({ ...formData, homeCollectionAvailable: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
              />
              <span className="text-xs text-slate-700">
                Offer Home Sample Collection to booking patients
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-sky-500 px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-600 transition disabled:opacity-50"
          >
            {saving ? "Saving Changes..." : "Save Store Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
