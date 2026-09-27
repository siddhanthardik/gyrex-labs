"use client";

import React, { useEffect, useState } from "react";
import { SuperadminStatusBadge } from "@/components/superadmin/SuperadminStatusBadge";
import { SuperadminEmptyState } from "@/components/superadmin/SuperadminEmptyState";

interface TestItem {
  id: string;
  code: string;
  name: string;
  slug: string;
  synonyms: string[];
  category: string;
  categoryId: string;
  sampleType: string;
  standardTatHours: number;
  fastingRequired: boolean;
  preparationInstructions: string | null;
  description: string | null;
  standardizedCode: string | null;
  isActive: boolean;
  labsOfferingCount: number;
  createdAt: string;
}

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
}

export default function SuperadminTestMasterPage() {
  const [items, setItems] = useState<TestItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(true);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    code: "",
    name: "",
    categoryId: "",
    sampleType: "Serum",
    standardTatHours: 24,
    fastingRequired: false,
    preparationInstructions: "",
    description: "",
    standardizedCode: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCatalogue = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedCategory) params.set("categoryId", selectedCategory);

      const res = await fetch(`/api/superadmin/catalogue/test-master?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch catalogue.");
      const json = await res.json();
      setItems(json.items || []);
      setCategories(json.categories || []);
      setTotal(json.total || 0);
    } catch {
      // empty error handling
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogue();
  }, [selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCatalogue();
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/superadmin/catalogue/test-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      if (!res.ok) throw new Error("Failed to create test.");
      setShowCreateModal(false);
      setCreateForm({
        code: "",
        name: "",
        categoryId: "",
        sampleType: "Serum",
        standardTatHours: 24,
        fastingRequired: false,
        preparationInstructions: "",
        description: "",
        standardizedCode: "",
      });
      fetchCatalogue();
    } catch (err: unknown) {
      const e = err as Error;
      alert(e.message || "Failed to create test master record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (testId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/superadmin/catalogue/test-master/${testId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      if (!res.ok) throw new Error("Failed to toggle test status.");
      fetchCatalogue();
    } catch {
      alert("Unable to update test status.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Gyrex Test Master Repository ({total})
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Centralized standardization catalogue. Laboratories adopt these definitions and set custom selling prices.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition"
        >
          + Add Standard Test Master
        </button>
      </div>

      {/* Filter and Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search test name, code (e.g. CBC, LFT), or LOINC..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/80 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="w-full sm:w-56">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-zinc-800 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-700 transition"
        >
          Search
        </button>
      </form>

      {/* Items Table */}
      {loading ? (
        <div className="py-12 text-center text-xs text-zinc-500">Loading Test Master records...</div>
      ) : items.length === 0 ? (
        <SuperadminEmptyState
          title="No Tests Found"
          description="No tests match your query. You can add a new test master definition."
          actionText="+ Add Standard Test"
          onActionClick={() => setShowCreateModal(true)}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-950 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="px-4 py-3">Code & Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Sample Type</th>
                <th className="px-4 py-3">Standard TAT</th>
                <th className="px-4 py-3">Fasting</th>
                <th className="px-4 py-3">Labs Offering</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {items.map((test) => (
                <tr key={test.id} className="hover:bg-zinc-800/30 transition">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-white">{test.name}</span>
                    <p className="font-mono text-[10px] text-indigo-400">
                      {test.code} {test.standardizedCode ? `• ${test.standardizedCode}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{test.category}</td>
                  <td className="px-4 py-3 text-zinc-400">{test.sampleType}</td>
                  <td className="px-4 py-3 font-mono">{test.standardTatHours} hrs</td>
                  <td className="px-4 py-3">
                    {test.fastingRequired ? (
                      <span className="text-amber-400 font-medium">Yes</span>
                    ) : (
                      <span className="text-zinc-500">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-zinc-400">
                    {test.labsOfferingCount} labs
                  </td>
                  <td className="px-4 py-3">
                    <SuperadminStatusBadge status={test.isActive ? "ACTIVE" : "INACTIVE"} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(test.id, test.isActive)}
                      className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] font-medium text-zinc-300 hover:bg-zinc-700 transition"
                    >
                      {test.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <h2 className="text-base font-bold text-white">Add Central Test Master Definition</h2>
            <p className="mt-1 text-xs text-zinc-400">
              Standardized investigation entry. Accessible to all partner labs for catalogue pricing.
            </p>

            <form onSubmit={handleCreateTest} className="mt-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 mb-1 font-medium">
                    Test Code <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CBC, LFT, TSH"
                    value={createForm.code}
                    onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 mb-1 font-medium">
                    Category <span className="text-rose-400">*</span>
                  </label>
                  <select
                    required
                    value={createForm.categoryId}
                    onChange={(e) => setCreateForm({ ...createForm, categoryId: e.target.value })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-medium">
                  Standard Test Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Complete Blood Count"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 mb-1 font-medium">Sample Specimen</label>
                  <input
                    type="text"
                    placeholder="e.g. EDTA Whole Blood, Serum"
                    value={createForm.sampleType}
                    onChange={(e) => setCreateForm({ ...createForm, sampleType: e.target.value })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 mb-1 font-medium">Standard TAT (Hours)</label>
                  <input
                    type="number"
                    min="1"
                    value={createForm.standardTatHours}
                    onChange={(e) => setCreateForm({ ...createForm, standardTatHours: parseInt(e.target.value, 10) || 24 })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-medium">Preparation / Fasting Instructions</label>
                <input
                  type="text"
                  placeholder="e.g. 10-12 hours overnight fasting recommended"
                  value={createForm.preparationInstructions}
                  onChange={(e) => setCreateForm({ ...createForm, preparationInstructions: e.target.value })}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="fastingCheckbox"
                  checked={createForm.fastingRequired}
                  onChange={(e) => setCreateForm({ ...createForm, fastingRequired: e.target.checked })}
                  className="rounded border-zinc-800 bg-zinc-900 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="fastingCheckbox" className="text-zinc-300">
                  Fasting is strictly mandatory for this investigation
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-zinc-300 hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-500 transition shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Save Test Master"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
