"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
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
          <h1 className="text-2xl font-bold tracking-tight text-white">Diagnostic Test Catalogue</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Manage your laboratory&apos;s selling prices, availability, and sample preparation rules.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/lab/catalogue/import"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-200 transition hover:border-sky-500/40 hover:text-white"
          >
            <span>📥 Bulk Import (CSV)</span>
          </Link>
          <Link
            href="/lab/catalogue/test-master"
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-400"
          >
            <span>+ Add from Test Master</span>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 backdrop-blur-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tests by name or code (e.g. CBC, Lipid Profile)..."
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 focus:border-sky-500 focus:outline-none"
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
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 focus:border-sky-500 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            <button
              type="submit"
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-white transition hover:bg-zinc-700"
            >
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* Tests Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-16 text-zinc-400">
            <div className="flex items-center gap-3 text-sm">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
              <span>Loading catalogue...</span>
            </div>
          </div>
        ) : tests.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon="🧪"
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
                <tr className="border-b border-zinc-800 bg-zinc-900/60 text-xs font-semibold uppercase tracking-wider text-zinc-400">
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
              <tbody className="divide-y divide-zinc-800/60">
                {tests.map((test) => (
                  <tr key={test.id} className="transition hover:bg-zinc-800/20">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] font-bold text-sky-400">
                          {test.code}
                        </span>
                        <Link
                          href={`/lab/catalogue/${test.id}`}
                          className="font-semibold text-white hover:text-sky-400 transition"
                        >
                          {test.name}
                        </Link>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-zinc-300">
                      {test.categoryName}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-zinc-400">
                      {test.sampleType}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-white">₹{test.sellingPrice}</span>
                      {test.mrpPrice && test.mrpPrice > test.sellingPrice && (
                        <span className="ml-1.5 text-xs text-zinc-400 line-through">
                          ₹{test.mrpPrice}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      {test.isHomeCollectionAvailable ? (
                        <span className="text-emerald-400 font-medium">✓ Available</span>
                      ) : (
                        <span className="text-zinc-400">Lab Visit Only</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-zinc-300">
                      {test.effectiveTatHours} hrs
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => toggleTestActive(test.id, test.isActive)}
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border transition ${
                          test.isActive
                            ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20"
                            : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                        }`}
                      >
                        {test.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/lab/catalogue/${test.id}`}
                        className="rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700 hover:text-white"
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
