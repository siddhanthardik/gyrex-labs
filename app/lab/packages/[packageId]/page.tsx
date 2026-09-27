"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function EditPackagePage() {
  const params = useParams();
  const router = useRouter();
  const packageId = params?.packageId as string;

  const [packageData, setPackageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sellingPrice: 0,
    mrpPrice: 0,
    isActive: true,
    isHomeCollectionAvailable: true,
    fastingRequired: false,
    preparationInstructions: "",
    estimatedTatHours: 24,
  });

  useEffect(() => {
    async function loadPackage() {
      try {
        const res = await fetch(`/api/lab/packages/${packageId}`);
        if (!res.ok) throw new Error("Failed to load package details.");
        const data = await res.json();
        setPackageData(data.package);
        setFormData({
          name: data.package.name,
          description: data.package.description || "",
          sellingPrice: data.package.sellingPrice,
          mrpPrice: data.package.mrpPrice || data.package.sellingPrice,
          isActive: data.package.isActive,
          isHomeCollectionAvailable: data.package.isHomeCollectionAvailable,
          fastingRequired: data.package.fastingRequired,
          preparationInstructions: data.package.preparationInstructions || "",
          estimatedTatHours: data.package.estimatedTatHours || 24,
        });
      } catch (err: any) {
        setNotification({ type: "error", message: err.message || "Failed to load package." });
      } finally {
        setLoading(false);
      }
    }

    if (packageId) loadPackage();
  }, [packageId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotification(null);

    try {
      const res = await fetch(`/api/lab/packages/${packageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update package.");
      }

      setNotification({ type: "success", message: "Health package updated successfully." });
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Failed to update package." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 text-zinc-400">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
        <span className="ml-3 text-sm">Loading package...</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/lab/packages" className="text-xs font-semibold text-zinc-400 hover:text-white transition">
          ← Back to Packages
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">Edit Health Package</h1>
        <p className="mt-1 text-sm text-zinc-400">Update package pricing, availability, and description.</p>
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

      <form onSubmit={handleSubmit} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 sm:p-8 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-zinc-300">Package Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-zinc-300">Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
            <label className="block text-xs font-medium text-zinc-300">MRP / Printed Price (₹)</label>
            <input
              type="number"
              min="0"
              value={formData.mrpPrice}
              onChange={(e) => setFormData({ ...formData, mrpPrice: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2 flex flex-wrap gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-zinc-700 text-sky-500"
              />
              <span className="text-xs text-zinc-300">Active (Visible in Patient Store)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isHomeCollectionAvailable}
                onChange={(e) => setFormData({ ...formData, isHomeCollectionAvailable: e.target.checked })}
                className="h-4 w-4 rounded border-zinc-700 text-sky-500"
              />
              <span className="text-xs text-zinc-300">Home Collection Available</span>
            </label>
          </div>
        </div>

        {/* Included tests read-only list */}
        {packageData?.tests && (
          <div className="pt-4 border-t border-zinc-800">
            <span className="text-xs font-semibold text-zinc-300">
              Included Diagnostic Tests ({packageData.tests.length}):
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {packageData.tests.map((t: any, idx: number) => (
                <span
                  key={idx}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-200"
                >
                  {t.testName} (₹{t.price})
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
          <Link
            href="/lab/packages"
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-sky-500 px-6 py-2 text-xs font-semibold text-white shadow-lg shadow-sky-500/20 hover:bg-sky-400 transition disabled:opacity-50"
          >
            {saving ? "Saving Changes..." : "Save Package"}
          </button>
        </div>
      </form>
    </div>
  );
}
