"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/lab/EmptyState";

interface PackageItem {
  id: string;
  name: string;
  slug: string;
  code: string | null;
  description: string | null;
  sellingPrice: number;
  mrpPrice: number | null;
  individualTestValue: number;
  savings: number;
  testCount: number;
  isActive: boolean;
  isHomeCollectionAvailable: boolean;
  estimatedTatHours: number | null;
  tests: Array<{ labTestId: string; testName: string; price: number }>;
}

export default function LabPackagesPage() {
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/lab/packages?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPackages(data.packages || []);
      }
    } catch (err) {
      console.error("Failed to load packages:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const togglePackageActive = async (packageId: string, currentActive: boolean) => {
    setPackages((prev) =>
      prev.map((p) => (p.id === packageId ? { ...p, isActive: !currentActive } : p))
    );

    try {
      await fetch(`/api/lab/packages/${packageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });
    } catch (err) {
      setPackages((prev) =>
        prev.map((p) => (p.id === packageId ? { ...p, isActive: currentActive } : p))
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with CTA */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Health Packages</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create bundled diagnostic packages with server-verified individual test savings.
          </p>
        </div>

        <Link
          href="/lab/packages/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-600 transition"
        >
          <span>+ Create New Package</span>
        </Link>
      </div>

      {/* Search */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchPackages()}
          placeholder="Search packages by name..."
          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
        />
      </div>

      {/* Packages Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-16 text-slate-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
          <span className="ml-3 text-sm">Loading health packages...</span>
        </div>
      ) : packages.length === 0 ? (
        <EmptyState
          icon="🎁"
          title="No Health Packages Created"
          description="Bundling diagnostic tests into health checkup packages increases patient bookings by up to 40%."
          actionText="+ Create Your First Package"
          actionHref="/lab/packages/new"
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                    {pkg.testCount} Tests Included
                  </span>
                  <button
                    type="button"
                    onClick={() => togglePackageActive(pkg.id, pkg.isActive)}
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border transition ${
                      pkg.isActive
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                        : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {pkg.isActive ? "Active" : "Inactive"}
                  </button>
                </div>

                <h3 className="mt-3 text-base font-bold text-slate-900">{pkg.name}</h3>
                {pkg.description && (
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">{pkg.description}</p>
                )}

                {/* Included Tests list snippet */}
                <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                    Tests in Package:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {pkg.tests.slice(0, 4).map((t, idx) => (
                      <span
                        key={idx}
                        className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700"
                      >
                        {t.testName}
                      </span>
                    ))}
                    {pkg.tests.length > 4 && (
                      <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] text-slate-500">
                        +{pkg.tests.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Pricing breakdown */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-slate-500">Individual Value:</span>
                    <p className="text-xs text-slate-400 line-through">
                      ₹{pkg.individualTestValue.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500">Package Price:</span>
                    <p className="text-lg font-bold text-slate-900">
                      ₹{pkg.sellingPrice.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                {pkg.savings > 0 && (
                  <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-center text-xs font-semibold text-emerald-700">
                    Patient Saves ₹{pkg.savings.toLocaleString("en-IN")}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {pkg.isHomeCollectionAvailable ? "🏠 Home Collection" : "🏥 Lab Visit"}
                  </span>
                  <Link
                    href={`/lab/packages/${pkg.id}`}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                  >
                    Edit Package
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
