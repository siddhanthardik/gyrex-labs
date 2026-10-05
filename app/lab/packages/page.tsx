"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Package as PackageIcon,
  Home,
  Building2,
  CheckCircle2,
  XCircle,
  Edit,
  Eye,
  EyeOff,
  RefreshCw,
  Clock,
} from "lucide-react";
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
  savingsPercentage?: number;
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
          <p className="mt-1 text-sm text-slate-600">
            Create bundled diagnostic packages with server-verified individual test savings.
          </p>
        </div>

        <Link
          href="/lab/packages/new"
          className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-600 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Create Health Package</span>
        </Link>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchPackages()}
          placeholder="Search packages by name or code..."
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none shadow-xs"
        />
      </div>

      {/* Packages Table / Card Hybrid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 text-slate-500">
          <RefreshCw className="h-6 w-6 animate-spin text-sky-500" />
          <span className="mt-3 text-sm">Loading health packages...</span>
        </div>
      ) : packages.length === 0 ? (
        <EmptyState
          icon={<PackageIcon className="h-8 w-8 text-slate-400" />}
          title="No Health Packages Created"
          description="Bundling diagnostic tests into health checkup packages increases patient bookings by up to 40%."
          actionText="Create Your First Package"
          actionHref="/lab/packages/new"
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-600">
                  <th className="py-3 px-4">Package</th>
                  <th className="py-3 px-4">Included Tests</th>
                  <th className="py-3 px-4">Selling Price</th>
                  <th className="py-3 px-4">MRP & Savings</th>
                  <th className="py-3 px-4">Collection</th>
                  <th className="py-3 px-4">Store Visibility</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {packages.map((pkg) => (
                  <tr key={pkg.id} className="transition hover:bg-slate-50/60">
                    {/* Package Name & Description */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{pkg.name}</span>
                        {pkg.code && (
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                            {pkg.code}
                          </span>
                        )}
                      </div>
                      {pkg.description && (
                        <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{pkg.description}</p>
                      )}
                      {pkg.estimatedTatHours && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                          <Clock className="h-3 w-3" />
                          <span>{pkg.estimatedTatHours}h TAT</span>
                        </div>
                      )}
                    </td>

                    {/* Tests count & snippet */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-700">
                        {pkg.testCount} Tests
                      </span>
                      {pkg.tests && pkg.tests.length > 0 && (
                        <p className="mt-1 text-[11px] text-slate-500 max-w-xs truncate">
                          {pkg.tests.map((t) => t.testName).join(", ")}
                        </p>
                      )}
                    </td>

                    {/* Selling Price */}
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      ₹{pkg.sellingPrice.toLocaleString("en-IN")}
                    </td>

                    {/* MRP & Savings */}
                    <td className="py-3.5 px-4">
                      {pkg.mrpPrice ? (
                        <div>
                          <span className="text-xs text-slate-400 line-through">
                            ₹{pkg.mrpPrice.toLocaleString("en-IN")}
                          </span>
                          {pkg.savings > 0 && (
                            <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                              Save ₹{pkg.savings}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>

                    {/* Collection Mode */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium border ${
                          pkg.isHomeCollectionAvailable
                            ? "bg-sky-50 text-sky-700 border-sky-200"
                            : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        {pkg.isHomeCollectionAvailable ? (
                          <>
                            <Home className="h-3 w-3" />
                            <span>Home Collection</span>
                          </>
                        ) : (
                          <>
                            <Building2 className="h-3 w-3" />
                            <span>Lab Visit</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Store Visibility */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium ${
                          pkg.isActive ? "text-emerald-700" : "text-slate-400"
                        }`}
                      >
                        {pkg.isActive ? (
                          <>
                            <Eye className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Visible</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3.5 w-3.5" />
                            <span>Hidden</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Active Toggle */}
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => togglePackageActive(pkg.id, pkg.isActive)}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border transition cursor-pointer ${
                          pkg.isActive
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                            : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {pkg.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/lab/packages/${pkg.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 transition"
                      >
                        <Edit className="h-3 w-3 text-slate-500" />
                        <span>Edit</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
