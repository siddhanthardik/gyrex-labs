"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { UploadCloud, Plus, FlaskConical } from "lucide-react";
import { EmptyState } from "@/components/lab/EmptyState";

interface LabTestItem {
  id: string;
  masterTestId: string;
  name: string;
  code: string;
  categoryName: string;
  categoryId: string;
  sampleType: string;
  sellingPrice: number;
  mrpPrice: number | null;
  isActive: boolean;
  isHomeCollectionAvailable: boolean;
  effectiveTatHours: number;
  preparationInstructions: string | null;
}

export default function LabCataloguePage() {
  const [tests, setTests] = useState<LabTestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [isPending, startTransition] = useTransition();

  const fetchCatalogue = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (categoryFilter) params.set("categoryId", categoryFilter);
      if (activeFilter !== "all") params.set("isActive", activeFilter === "active" ? "true" : "false");

      const res = await fetch(`/api/lab/catalogue?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTests(data.tests || []);
      }
    } catch (err) {
      console.error("Failed to load tests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogue();
    // Fetch categories list
    fetch("/api/lab/catalogue/test-master?excludeAdded=false")
      .then((r) => r.json())
      .then((data) => {
        if (data.categories) setCategories(data.categories);
      })
      .catch((e) => console.error("Failed to load categories:", e));
  }, [categoryFilter, activeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCatalogue();
  };

  const toggleTestActive = async (testId: string, currentActive: boolean) => {
    startTransition(async () => {
      // Optimistic update
      setTests((prev) =>
        prev.map((t) => (t.id === testId ? { ...t, isActive: !currentActive } : t))
      );

      try {
        const res = await fetch(`/api/lab/catalogue/${testId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !currentActive }),
        });

        if (!res.ok) {
          // Revert on failure
          setTests((prev) =>
            prev.map((t) => (t.id === testId ? { ...t, isActive: currentActive } : t))
          );
        }
      } catch (err) {
        setTests((prev) =>
          prev.map((t) => (t.id === testId ? { ...t, isActive: currentActive } : t))
        );
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Diagnostic Test Catalogue</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your laboratory&apos;s selling prices, availability, and sample preparation rules.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/lab/catalogue/import"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <UploadCloud className="h-4 w-4 text-slate-500" />
            <span>Bulk Import (Spreadsheet)</span>
          </Link>
          <Link
            href="/lab/catalogue/test-master"
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-600"
          >
            <Plus className="h-4 w-4 text-white" />
            <span>Add from Test Master</span>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tests by name or code (e.g. CBC, Lipid Profile)..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            <button
              type="submit"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* Tests Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-16 text-slate-500">
            <div className="flex items-center gap-3 text-sm">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
              <span>Loading catalogue...</span>
            </div>
          </div>
        ) : tests.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<FlaskConical className="h-8 w-8 text-slate-400" />}
              title="No Diagnostic Tests Found"
              description="Your catalogue does not have any tests matching the current filter. Add tests from Gyrex Test Master to make them bookable."
              actionText="+ Select Tests from Test Master"
              actionHref="/lab/catalogue/test-master"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-600">
                  <th className="py-3 px-4">Test Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Sample Type</th>
                  <th className="py-3 px-4">Selling Price</th>
                  <th className="py-3 px-4">Home Collection</th>
                  <th className="py-3 px-4">Est. TAT</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {tests.map((test) => (
                  <tr key={test.id} className="transition hover:bg-slate-50/60">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                          {test.code}
                        </span>
                        <Link
                          href={`/lab/catalogue/${test.id}`}
                          className="font-semibold text-slate-900 hover:text-sky-600 transition"
                        >
                          {test.name}
                        </Link>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {test.categoryName}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {test.sampleType}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900">₹{test.sellingPrice}</span>
                      {test.mrpPrice && test.mrpPrice > test.sellingPrice && (
                        <span className="ml-1.5 text-xs text-slate-400 line-through">
                          ₹{test.mrpPrice}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      {test.isHomeCollectionAvailable ? (
                        <span className="text-emerald-700 font-medium">✓ Available</span>
                      ) : (
                        <span className="text-slate-400">Lab Visit Only</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {test.effectiveTatHours} hrs
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => toggleTestActive(test.id, test.isActive)}
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border transition ${
                          test.isActive
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                            : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {test.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/lab/catalogue/${test.id}`}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
