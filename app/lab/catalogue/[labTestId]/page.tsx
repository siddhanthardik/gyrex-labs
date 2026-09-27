"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function LabTestEditPage() {
  const params = useParams();
  const router = useRouter();
  const labTestId = params?.labTestId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [test, setTest] = useState<any>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [formData, setFormData] = useState({
    sellingPrice: 0,
    mrpPrice: 0,
    isActive: true,
    isHomeCollectionAvailable: true,
    customTatHours: 24,
    customPreparation: "",
    labSpecificNotes: "",
  });

  useEffect(() => {
    async function loadTest() {
      try {
        const res = await fetch(`/api/lab/catalogue/${labTestId}`);
        if (!res.ok) throw new Error("Failed to load test details.");
        const data = await res.json();
        setTest(data.test);
        setFormData({
          sellingPrice: data.test.sellingPrice,
          mrpPrice: data.test.mrpPrice || data.test.sellingPrice,
          isActive: data.test.isActive,
          isHomeCollectionAvailable: data.test.isHomeCollectionAvailable,
          customTatHours: data.test.customTatHours || data.test.standardTatHours,
          customPreparation: data.test.customPreparation || "",
          labSpecificNotes: data.test.labSpecificNotes || "",
        });
      } catch (err: any) {
        setNotification({ type: "error", message: err.message || "Failed to load test." });
      } finally {
        setLoading(false);
      }
    }

    if (labTestId) loadTest();
  }, [labTestId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotification(null);

    try {
      const res = await fetch(`/api/lab/catalogue/${labTestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Unable to update this test. Please try again.");
      }

      setNotification({ type: "success", message: "Test pricing and rules saved successfully." });
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Unable to update this test. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 text-zinc-400">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
        <span className="ml-3 text-sm">Loading test details...</span>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="rounded-xl border border-zinc-800 p-8 text-center">
        <p className="text-sm font-semibold text-white">Diagnostic test not found.</p>
        <Link href="/lab/catalogue" className="mt-3 inline-block text-xs text-sky-400 hover:underline">
          ← Back to Catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back and Title */}
      <div>
        <Link href="/lab/catalogue" className="text-xs font-semibold text-zinc-400 hover:text-white transition">
          ← Back to Catalogue
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-sky-500/10 px-2 py-0.5 font-mono text-xs font-bold text-sky-400 border border-sky-500/25">
                {test.code}
              </span>
              <span className="text-xs text-zinc-400">{test.categoryName}</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">{test.name}</h1>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold border ${
              formData.isActive
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-zinc-800 text-zinc-400 border-zinc-700"
            }`}
          >
            {formData.isActive ? "Active in Store" : "Inactive / Hidden"}
          </span>
        </div>
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

      {/* Central Reference Card (Read Only) */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Gyrex Master Specification (Central Clinical Standard)
          </span>
          <span className="text-[11px] text-zinc-400">Standard TAT: {test.standardTatHours}h</span>
        </div>
        <p className="text-xs text-zinc-300">{test.masterDescription || "Standard diagnostic pathology test."}</p>
        <div className="flex flex-wrap gap-4 pt-1 text-xs text-zinc-400">
          <span>Sample: <strong className="text-zinc-200">{test.sampleType}</strong></span>
          <span>Fasting: <strong className="text-zinc-200">{test.fastingRequired ? "Required" : "Not Required"}</strong></span>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-white">Laboratory Custom Pricing & Availability</h2>
          <p className="text-xs text-zinc-400">These settings only affect your laboratory storefront.</p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-zinc-300">Selling Price (₹) *</label>
            <input
              type="number"
              min="0"
              required
              value={formData.sellingPrice}
              onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-zinc-400">The actual price charged to the patient.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300">MRP / Printed Price (₹)</label>
            <input
              type="number"
              min="0"
              value={formData.mrpPrice}
              onChange={(e) => setFormData({ ...formData, mrpPrice: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-zinc-400">Displayed with strikethrough if higher than selling price.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300">Lab Turnaround Time (Hours)</label>
            <input
              type="number"
              min="1"
              value={formData.customTatHours}
              onChange={(e) => setFormData({ ...formData, customTatHours: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-zinc-400">Expected time from sample collection to ready report.</p>
          </div>

          <div className="flex flex-col justify-end space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-zinc-700 text-sky-500 focus:ring-sky-500"
              />
              <span className="text-xs font-medium text-zinc-200">Active (Visible in Patient Store)</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isHomeCollectionAvailable}
                onChange={(e) => setFormData({ ...formData, isHomeCollectionAvailable: e.target.checked })}
                className="h-4 w-4 rounded border-zinc-700 text-sky-500 focus:ring-sky-500"
              />
              <span className="text-xs font-medium text-zinc-200">Home Sample Collection Available</span>
            </label>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-zinc-300">Custom Preparation Instructions</label>
            <textarea
              rows={2}
              value={formData.customPreparation}
              onChange={(e) => setFormData({ ...formData, customPreparation: e.target.value })}
              placeholder="e.g. 10-12 hours overnight fasting mandatory. Water intake permitted."
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-zinc-300">Laboratory Specific Notes</label>
            <textarea
              rows={2}
              value={formData.labSpecificNotes}
              onChange={(e) => setFormData({ ...formData, labSpecificNotes: e.target.value })}
              placeholder="Internal lab instructions or remarks for phlebotomist."
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
          <Link
            href="/lab/catalogue"
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-sky-500 px-6 py-2 text-xs font-semibold text-white shadow-lg shadow-sky-500/20 hover:bg-sky-400 transition disabled:opacity-50"
          >
            {saving ? "Saving Changes..." : "Save Test Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
