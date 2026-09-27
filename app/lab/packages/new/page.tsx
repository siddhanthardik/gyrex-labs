"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CreatePackagePage() {
  const router = useRouter();
  const [availableTests, setAvailableTests] = useState<any[]>([]);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sellingPrice: 999,
    mrpPrice: 1499,
    isHomeCollectionAvailable: true,
    fastingRequired: false,
    preparationInstructions: "",
    estimatedTatHours: 24,
  });

  useEffect(() => {
    async function loadLabTests() {
      try {
        const res = await fetch("/api/lab/catalogue?isActive=true");
        if (res.ok) {
          const data = await res.json();
          setAvailableTests(data.tests || []);
        }
      } catch (err) {
        console.error("Failed to load tests:", err);
      } finally {
        setLoading(false);
      }
    }
    loadLabTests();
  }, []);

  const toggleTest = (id: string) => {
    setSelectedTestIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  // Compute live client preview (Server will authoritatively recalculate upon submit)
  const selectedTests = availableTests.filter((t) => selectedTestIds.includes(t.id));
  const individualValue = selectedTests.reduce((sum, t) => sum + Number(t.sellingPrice), 0);
  const savings = Math.max(0, individualValue - formData.sellingPrice);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTestIds.length === 0) {
      setNotification({ type: "error", message: "Please select at least one test for the package." });
      return;
    }

    setSubmitting(true);
    setNotification(null);

    try {
      const res = await fetch("/api/lab/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          testIds: selectedTestIds,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create package.");
      }

      router.push("/lab/packages");
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Failed to create health package." });
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/lab/packages" className="text-xs font-semibold text-zinc-400 hover:text-white transition">
          ← Back to Packages
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">Create Health Package</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Bundle diagnostic tests together. The server authoritatively validates individual test values and savings.
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Details */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8 space-y-4">
          <h2 className="text-base font-semibold text-white">Package Information</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-300">Package Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Comprehensive Full Body Checkup"
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-300">Description</label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g. Recommended for annual health evaluation. Covers liver, kidney, blood, and lipid health."
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300">Package Selling Price (₹) *</label>
              <input
                type="number"
                min="0"
                required
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300">Estimated TAT (Hours)</label>
              <input
                type="number"
                min="1"
                value={formData.estimatedTatHours}
                onChange={(e) => setFormData({ ...formData, estimatedTatHours: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2 flex flex-wrap gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isHomeCollectionAvailable}
                  onChange={(e) => setFormData({ ...formData, isHomeCollectionAvailable: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-700 text-sky-500"
                />
                <span className="text-xs text-zinc-300">Home Collection Available</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.fastingRequired}
                  onChange={(e) => setFormData({ ...formData, fastingRequired: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-700 text-sky-500"
                />
                <span className="text-xs text-zinc-300">Fasting Required for Package</span>
              </label>
            </div>
          </div>
        </div>

        {/* Test Selection */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Select Included Tests *</h2>
              <p className="text-xs text-zinc-400">Choose from your active laboratory tests.</p>
            </div>
            <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-400 border border-sky-500/20">
              {selectedTestIds.length} Tests Selected
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-zinc-400">Loading your tests...</div>
          ) : availableTests.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-400">
              No active tests found in your catalogue. Please add tests before creating a package.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 max-h-80 overflow-y-auto pr-2">
              {availableTests.map((test) => {
                const isChecked = selectedTestIds.includes(test.id);
                return (
                  <div
                    key={test.id}
                    onClick={() => toggleTest(test.id)}
                    className={`flex items-center justify-between rounded-xl border p-3 cursor-pointer transition ${
                      isChecked
                        ? "border-sky-500/50 bg-sky-500/10"
                        : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="h-4 w-4 rounded border-zinc-700 text-sky-500 pointer-events-none"
                      />
                      <div>
                        <p className="text-xs font-semibold text-white">{test.name}</p>
                        <p className="text-[10px] text-zinc-400">{test.code} • {test.sampleType}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-white">₹{test.sellingPrice}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Savings & Value Breakdown */}
        <div className="rounded-2xl border border-sky-500/30 bg-sky-950/20 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-white">Package Pricing Summary</h3>
            <p className="text-xs text-zinc-300">
              Individual Tests Value: <strong className="text-white">₹{individualValue}</strong>
            </p>
            <p className="text-xs text-zinc-300">
              Package Selling Price: <strong className="text-white">₹{formData.sellingPrice}</strong>
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs text-emerald-400 font-medium">Calculated Patient Savings</span>
            <p className="text-2xl font-bold text-emerald-400">₹{savings}</p>
            <p className="text-[10px] text-zinc-400">(Server-authoritative calculation)</p>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/lab/packages"
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || selectedTestIds.length === 0}
            className="rounded-lg bg-sky-500 px-6 py-2 text-xs font-semibold text-white shadow-lg shadow-sky-500/20 hover:bg-sky-400 transition disabled:opacity-50"
          >
            {submitting ? "Creating Package..." : "Create Package"}
          </button>
        </div>
      </form>
    </div>
  );
}
