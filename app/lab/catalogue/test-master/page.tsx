"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface MasterTest {
  id: string;
  code: string;
  name: string;
  sampleType: string;
  standardTatHours: number;
  fastingRequired: boolean;
  categoryName: string;
  categoryId: string;
  synonyms: string[];
}

export default function TestMasterSelectionPage() {
  const router = useRouter();
  const [tests, setTests] = useState<MasterTest[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);

  // Map of masterTestId -> sellingPrice
  const [selectedPrices, setSelectedPrices] = useState<Record<string, number>>({});
  const [addingId, setAddingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchMasterTests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (categoryFilter) params.set("categoryId", categoryFilter);
      params.set("excludeAdded", "true");

      const res = await fetch(`/api/lab/catalogue/test-master?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTests(data.tests || []);
        if (data.categories) setCategories(data.categories);

        // Prepopulate default prices
        const initialPrices: Record<string, number> = {};
        for (const t of data.tests || []) {
          initialPrices[t.id] = 350;
        }
        setSelectedPrices(initialPrices);
      }
    } catch (err) {
      console.error("Failed to fetch test master:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterTests();
  }, [categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMasterTests();
  };

  const handleAddTest = async (test: MasterTest) => {
    setAddingId(test.id);
    setSuccessMessage(null);
    setErrorMessage(null);

    const price = selectedPrices[test.id] || 350;

    try {
      const res = await fetch("/api/lab/catalogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterTestId: test.id,
          sellingPrice: price,
          isHomeCollectionAvailable: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add test.");
      }

      setSuccessMessage(`Successfully added ${test.name} to your catalogue.`);
      // Remove from available list
      setTests((prev) => prev.filter((t) => t.id !== test.id));
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to add test.");
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/lab/catalogue"
              className="text-xs font-semibold text-zinc-400 hover:text-white"
            >
              ← Back to Catalogue
            </Link>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
            Gyrex Test Master Selection
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Pick from standard medical tests. Simply enter your selling price and click Add.
          </p>
        </div>

        <Link
          href="/lab/catalogue/import"
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-200 transition hover:border-sky-500/40 hover:text-white"
        >
          <span>📥 Import from Excel / CSV Instead</span>
        </Link>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-400">
          ✓ {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-medium text-rose-400">
          ✕ {errorMessage}
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search standard tests by name, code, or synonym (e.g. LFT, Blood Sugar)..."
            className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-sky-500 focus:outline-none"
          />

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

          <button
            type="submit"
            className="rounded-lg bg-zinc-800 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-700 transition"
          >
            Search
          </button>
        </form>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-16 text-zinc-400">
          <div className="flex items-center gap-3 text-sm">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
            <span>Searching Gyrex Test Master...</span>
          </div>
        </div>
      ) : tests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 p-12 text-center">
          <p className="text-sm font-semibold text-white">No Unadded Tests Found</p>
          <p className="mt-1 text-xs text-zinc-400">
            All matching tests may already be in your catalogue, or no tests matched the query.
          </p>
          <Link
            href="/lab/catalogue"
            className="mt-4 inline-block text-xs font-semibold text-sky-400 hover:underline"
          >
            View My Current Catalogue →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tests.map((test) => {
            const isAdding = addingId === test.id;
            const currentPrice = selectedPrices[test.id] ?? 350;

            return (
              <div
                key={test.id}
                className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 shadow-sm transition hover:border-zinc-700"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-400 border border-sky-500/20">
                      {test.code}
                    </span>
                    <span className="text-[11px] text-zinc-400">{test.categoryName}</span>
                  </div>

                  <h3 className="mt-2 text-sm font-bold text-white">{test.name}</h3>

                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-zinc-400">
                    <span>🧪 {test.sampleType}</span>
                    <span>⏱️ {test.standardTatHours}h TAT</span>
                    {test.fastingRequired && <span className="text-amber-400">⚠️ Fasting Req.</span>}
                  </div>

                  {test.synonyms.length > 0 && (
                    <p className="mt-2 text-[10px] text-zinc-400 line-clamp-1">
                      Also known as: {test.synonyms.join(", ")}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-800/80 flex items-center justify-between gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-zinc-400">
                      Your Price (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={currentPrice}
                      onChange={(e) =>
                        setSelectedPrices({
                          ...selectedPrices,
                          [test.id]: Math.max(0, Number(e.target.value)),
                        })
                      }
                      className="mt-0.5 w-24 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs font-bold text-white"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isAdding}
                    onClick={() => handleAddTest(test)}
                    className="rounded-lg bg-sky-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-400 disabled:opacity-50"
                  >
                    {isAdding ? "Adding..." : "+ Add to Lab"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
