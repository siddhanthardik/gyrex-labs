"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
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

interface AnalyzedRow {
  rowNumber: number;
  status: "NEW" | "EXISTING_SKIP" | "ERROR";
  code: string;
  name: string;
  categoryName: string;
  categoryId: string | null;
  sampleType: string;
  standardTatHours: number;
  fastingRequired: boolean;
  preparationInstructions: string | null;
  synonyms: string[];
  standardizedCode: string | null;
  description: string | null;
  isActive: boolean;
  matchedExistingId?: string;
  issues: Array<{ type: "ERROR" | "WARNING"; field: string; message: string }>;
}

interface ImportAnalysis {
  batchId: string;
  filename: string;
  totalRows: number;
  validRows: number;
  newRecordsCount: number;
  existingCount: number;
  duplicateCount: number;
  errorCount: number;
  hasBlockingErrors: boolean;
  items: AnalyzedRow[];
}

interface ImportResult {
  batchId: string;
  filename: string;
  totalProcessed: number;
  createdCount: number;
  skippedCount: number;
  rejectedCount: number;
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

  // Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importAnalysis, setImportAnalysis] = useState<ImportAnalysis | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importFilter, setImportFilter] = useState<"ALL" | "NEW" | "EXISTING" | "ERROR">("ALL");
  const [importErrorMsg, setImportErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || "Failed to create test.");
      }
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

  // Import Handlers
  const handleOpenImport = () => {
    setSelectedFile(null);
    setImportAnalysis(null);
    setImportResult(null);
    setImportErrorMsg(null);
    setImportFilter("ALL");
    setShowImportModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setImportErrorMsg(null);
      setImportAnalysis(null);
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!selectedFile) {
      setImportErrorMsg("Please choose an Excel (.xlsx, .xls) or CSV (.csv) file first.");
      return;
    }

    try {
      setIsAnalyzing(true);
      setImportErrorMsg(null);

      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/superadmin/catalogue/test-master/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to analyze spreadsheet.");
      }

      setImportAnalysis(data.analysis);
    } catch (err: unknown) {
      const e = err as Error;
      setImportErrorMsg(e.message || "An error occurred while analyzing the file.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importAnalysis || !importAnalysis.items || importAnalysis.items.length === 0) {
      return;
    }

    try {
      setIsImporting(true);
      setImportErrorMsg(null);

      const res = await fetch("/api/superadmin/catalogue/test-master/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CONFIRM",
          batchId: importAnalysis.batchId,
          filename: importAnalysis.filename,
          items: importAnalysis.items,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to commit import.");
      }

      setImportResult(data.result);
      fetchCatalogue();
    } catch (err: unknown) {
      const e = err as Error;
      setImportErrorMsg(e.message || "Failed to complete import.");
    } finally {
      setIsImporting(false);
    }
  };

  // Computed analysis metrics & error breakdowns
  const errorRowsCount = useMemo(() => {
    if (!importAnalysis?.items) return 0;
    return importAnalysis.items.filter(
      (it) => it.status === "ERROR" || it.issues?.some((i) => i.type === "ERROR")
    ).length;
  }, [importAnalysis]);

  const totalErrorIssuesCount = useMemo(() => {
    if (!importAnalysis?.items) return 0;
    return importAnalysis.items.reduce(
      (sum, it) => sum + (it.issues?.filter((i) => i.type === "ERROR").length || 0),
      0
    );
  }, [importAnalysis]);

  const errorBreakdown = useMemo(() => {
    if (!importAnalysis?.items) return [];
    const fieldMap = new Map<string, { count: number; rowNumbers: Set<number> }>();

    for (const item of importAnalysis.items) {
      for (const iss of item.issues) {
        if (iss.type === "ERROR") {
          const field = iss.field || "general";
          const existing = fieldMap.get(field) || { count: 0, rowNumbers: new Set<number>() };
          existing.count += 1;
          existing.rowNumbers.add(item.rowNumber);
          fieldMap.set(field, existing);
        }
      }
    }

    return Array.from(fieldMap.entries())
      .map(([field, data]) => ({
        field,
        count: data.count,
        rowCount: data.rowNumbers.size,
      }))
      .sort((a, b) => b.count - a.count);
  }, [importAnalysis]);

  const filteredImportItems = useMemo(() => {
    if (!importAnalysis?.items) return [];
    return importAnalysis.items.filter((item) => {
      if (importFilter === "NEW") return item.status === "NEW";
      if (importFilter === "EXISTING") return item.status === "EXISTING_SKIP";
      if (importFilter === "ERROR") return item.status === "ERROR" || item.issues?.some((i) => i.type === "ERROR");
      return true;
    });
  }, [importAnalysis, importFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Gyrex Test Master Repository ({total})
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Centralized standardization catalogue. Laboratories adopt these definitions and set custom selling prices.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleOpenImport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import Test Master
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-sky-600 transition"
          >
            + Add Standard Test Master
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search test name, code (e.g. CBC, LFT), or LOINC..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none"
          />
        </div>

        <div className="w-full sm:w-56">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none"
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
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          Search
        </button>
      </form>

      {/* Items Table */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">Loading Test Master records...</div>
      ) : items.length === 0 ? (
        <SuperadminEmptyState
          title="No Tests Found"
          description="No tests match your query. You can add a new test master definition or bulk import from spreadsheet."
          actionText="+ Add Standard Test"
          onActionClick={() => setShowCreateModal(true)}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
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
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {items.map((test) => (
                <tr key={test.id} className="hover:bg-slate-50/75 transition">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-900">{test.name}</span>
                    <p className="font-mono text-[10px] text-sky-700">
                      {test.code} {test.standardizedCode ? `• ${test.standardizedCode}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{test.category}</td>
                  <td className="px-4 py-3 text-slate-500">{test.sampleType}</td>
                  <td className="px-4 py-3 font-mono">{test.standardTatHours} hrs</td>
                  <td className="px-4 py-3">
                    {test.fastingRequired ? (
                      <span className="text-amber-700 font-medium">Yes</span>
                    ) : (
                      <span className="text-slate-400">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-500">
                    {test.labsOfferingCount} labs
                  </td>
                  <td className="px-4 py-3">
                    <SuperadminStatusBadge status={test.isActive ? "ACTIVE" : "INACTIVE"} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(test.id, test.isActive)}
                      className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition"
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

      {/* Add Single Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-base font-bold text-slate-900">Add Central Test Master Definition</h2>
            <p className="mt-1 text-xs text-slate-500">
              Standardized investigation entry. Accessible to all partner labs for catalogue pricing.
            </p>

            <form onSubmit={handleCreateTest} className="mt-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-medium">
                    Test Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CBC, LFT, TSH"
                    value={createForm.code}
                    onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-medium">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={createForm.categoryId}
                    onChange={(e) => setCreateForm({ ...createForm, categoryId: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none"
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
                <label className="block text-slate-700 mb-1 font-medium">
                  Standard Test Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Complete Blood Count"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-medium">Sample Specimen</label>
                  <input
                    type="text"
                    placeholder="e.g. EDTA Whole Blood, Serum"
                    value={createForm.sampleType}
                    onChange={(e) => setCreateForm({ ...createForm, sampleType: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-medium">Standard TAT (Hours)</label>
                  <input
                    type="number"
                    min="1"
                    value={createForm.standardTatHours}
                    onChange={(e) => setCreateForm({ ...createForm, standardTatHours: parseInt(e.target.value, 10) || 24 })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-medium">Preparation / Fasting Instructions</label>
                <input
                  type="text"
                  placeholder="e.g. 10-12 hours overnight fasting recommended"
                  value={createForm.preparationInstructions}
                  onChange={(e) => setCreateForm({ ...createForm, preparationInstructions: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="fastingCheckbox"
                  checked={createForm.fastingRequired}
                  onChange={(e) => setCreateForm({ ...createForm, fastingRequired: e.target.checked })}
                  className="rounded border-slate-300 bg-white text-sky-600 focus:ring-sky-500"
                />
                <label htmlFor="fastingCheckbox" className="text-slate-700">
                  Fasting is strictly mandatory for this investigation
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-sky-500 px-4 py-2 font-medium text-white hover:bg-sky-600 transition shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Save Test Master"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-[96vw] max-w-6xl max-h-[92vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Import Test Master Catalogue
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Bulk upload diagnostic investigation definitions via Excel (.xlsx) or CSV. Neutral reference definitions only.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
              {importErrorMsg && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-red-800 flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-red-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <span className="font-semibold">Import Issue:</span> {importErrorMsg}
                  </div>
                </div>
              )}

              {/* View 1: Success Completion State */}
              {importResult ? (
                <div className="py-8 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 mx-auto flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Test Master Import Completed</h3>
                    <p className="text-slate-500 text-xs mt-1">
                      Batch ID: <span className="font-mono text-sky-700 font-semibold bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100">{importResult.batchId}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                      <div className="text-xl font-bold text-emerald-700">{importResult.createdCount}</div>
                      <div className="text-[11px] text-emerald-600 mt-0.5">Created</div>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                      <div className="text-xl font-bold text-amber-700">{importResult.skippedCount}</div>
                      <div className="text-[11px] text-amber-600 mt-0.5">Skipped (Existing)</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xl font-bold text-slate-800">{importResult.totalProcessed}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Total Processed</div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={() => setShowImportModal(false)}
                      className="rounded-lg bg-sky-500 px-5 py-2.5 font-medium text-white hover:bg-sky-600 transition shadow-xs"
                    >
                      Done & Close
                    </button>
                  </div>
                </div>
              ) : !importAnalysis ? (
                /* View 2: Upload File & Template Download */
                <div className="space-y-6">
                  {/* Download Template Bar */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Official Test Master Templates
                      </div>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Includes standard column headers, category mappings, and sample tests.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href="/api/superadmin/catalogue/test-master/template?format=xlsx"
                        download
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition"
                      >
                        Download Excel (.xlsx)
                      </a>
                      <a
                        href="/api/superadmin/catalogue/test-master/template?format=csv"
                        download
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition"
                      >
                        Download CSV (.csv)
                      </a>
                    </div>
                  </div>

                  {/* Upload Box */}
                  <div className="rounded-2xl border-2 border-dashed border-slate-300 hover:border-sky-400 p-8 text-center transition bg-slate-50/50">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      id="testMasterFileInput"
                    />
                    <label htmlFor="testMasterFileInput" className="cursor-pointer space-y-3 block">
                      <div className="w-12 h-12 rounded-full bg-white border border-slate-200 text-slate-500 mx-auto flex items-center justify-center shadow-xs">
                        <svg className="w-6 h-6 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900">Click to select a file</span>
                        <span className="text-slate-500"> or drag and drop</span>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Supported formats: Excel (.xlsx, .xls) and CSV (.csv) • Up to 10 MB (5000 rows max)
                        </p>
                      </div>
                      {selectedFile && (
                        <div className="inline-flex items-center gap-2 rounded-lg bg-sky-50 border border-sky-200 px-3 py-1.5 text-xs text-sky-700 font-medium mt-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                        </div>
                      )}
                    </label>
                  </div>

                  {/* Architecture Guard Info */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-[11px] text-slate-600">
                    <div className="font-semibold text-slate-800">Cataloguing Integrity Rules:</div>
                    <ul className="list-disc list-inside space-y-1">
                      <li>
                        <strong className="text-slate-700">Price-free Guarantee:</strong> TestMaster represents clinical reference definitions and does NOT store prices. Any price or MRP columns in spreadsheets are automatically ignored.
                      </li>
                      <li>
                        <strong className="text-slate-700">No Overwrites:</strong> Tests matching an existing TestMaster code or name will be skipped automatically to prevent accidental changes to partner lab definitions.
                      </li>
                      <li>
                        <strong className="text-slate-700">Preview Safe:</strong> Uploading checks rows without saving. You will inspect validation metrics and confirm before any database writes.
                      </li>
                    </ul>
                  </div>

                  {/* Upload Action */}
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowImportModal(false)}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleUploadAndAnalyze}
                      disabled={!selectedFile || isAnalyzing}
                      className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-2 font-medium text-white hover:bg-sky-600 transition shadow-xs disabled:opacity-50"
                    >
                      {isAnalyzing ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          Analyzing File...
                        </>
                      ) : (
                        "Upload & Preview Analysis"
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* View 3: Analysis Preview & Confirmation */
                <div className="space-y-5">
                  {/* Summary Metric Cards (Interactive Filters) */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setImportFilter("ALL")}
                      className={`rounded-xl border p-3 text-left transition cursor-pointer ${
                        importFilter === "ALL"
                          ? "border-sky-500 bg-sky-50/50 ring-2 ring-sky-200 shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-[11px] text-slate-500 font-medium">Total Rows</div>
                      <div className="text-xl font-bold text-slate-900 mt-1">{importAnalysis.totalRows}</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setImportFilter("NEW")}
                      className={`rounded-xl border p-3 text-left transition cursor-pointer ${
                        importFilter === "NEW"
                          ? "border-emerald-500 bg-emerald-100/60 ring-2 ring-emerald-300 shadow-xs"
                          : "border-emerald-200 bg-emerald-50/60 hover:border-emerald-300 hover:bg-emerald-100/40"
                      }`}
                    >
                      <div className="text-[11px] text-emerald-800 font-medium">New Records</div>
                      <div className="text-xl font-bold text-emerald-700 mt-1">{importAnalysis.newRecordsCount}</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setImportFilter("EXISTING")}
                      className={`rounded-xl border p-3 text-left transition cursor-pointer ${
                        importFilter === "EXISTING"
                          ? "border-amber-500 bg-amber-100/60 ring-2 ring-amber-300 shadow-xs"
                          : "border-amber-200 bg-amber-50/60 hover:border-amber-300 hover:bg-amber-100/40"
                      }`}
                    >
                      <div className="text-[11px] text-amber-800 font-medium">Existing (Skip)</div>
                      <div className="text-xl font-bold text-amber-700 mt-1">{importAnalysis.existingCount}</div>
                    </button>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-[11px] text-slate-500 font-medium">Duplicates in File</div>
                      <div className="text-xl font-bold text-slate-700 mt-1">{importAnalysis.duplicateCount}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setImportFilter("ERROR")}
                      className={`rounded-xl border p-3 text-left transition cursor-pointer ${
                        errorRowsCount > 0
                          ? importFilter === "ERROR"
                            ? "border-red-500 bg-red-100/60 ring-2 ring-red-300 shadow-xs"
                            : "border-red-200 bg-red-50/60 hover:border-red-300 hover:bg-red-100/40"
                          : "border-slate-200 bg-slate-50 opacity-60 cursor-default"
                      }`}
                    >
                      <div className={`text-[11px] font-medium flex items-center justify-between ${
                        errorRowsCount > 0 ? "text-red-800" : "text-slate-500"
                      }`}>
                        <span>Errors</span>
                        {errorRowsCount > 0 && (
                          <span className="text-[9px] font-semibold bg-red-100 text-red-700 px-1 py-0.2 rounded border border-red-200">
                            CLICK TO VIEW
                          </span>
                        )}
                      </div>
                      <div className={`text-xl font-bold mt-1 ${
                        errorRowsCount > 0 ? "text-red-700" : "text-slate-500"
                      }`}>
                        {errorRowsCount}
                      </div>
                    </button>
                  </div>

                  {/* Error Summary Banner */}
                  {(importAnalysis.hasBlockingErrors || errorRowsCount > 0) && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900 space-y-3 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="p-1.5 rounded-lg bg-red-100 text-red-600 border border-red-200 shrink-0 mt-0.5">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                              <span>{errorRowsCount} Blocking Error Row{errorRowsCount !== 1 ? "s" : ""}</span>
                              <span className="text-xs font-normal text-red-700">
                                ({totalErrorIssuesCount} total validation issue{totalErrorIssuesCount !== 1 ? "s" : ""})
                              </span>
                            </div>
                            <p className="text-xs text-red-800 mt-1 leading-relaxed">
                              These records cannot be imported into the global catalogue until the validation issues are corrected. All database transactions remain locked.
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setImportFilter("ERROR")}
                          className={`shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition border cursor-pointer ${
                            importFilter === "ERROR"
                              ? "bg-red-600 text-white border-red-600 shadow-xs"
                              : "bg-white text-red-700 border-red-300 hover:bg-red-50"
                          }`}
                        >
                          {importFilter === "ERROR" ? "Showing Errors" : `View All ${errorRowsCount} Error Rows →`}
                        </button>
                      </div>

                      {/* Summary Breakdown of Error Types by Field */}
                      {errorBreakdown.length > 0 && (
                        <div className="pt-2.5 border-t border-red-200">
                          <div className="text-[11px] font-semibold text-red-800 mb-1.5 uppercase tracking-wider">
                            Validation Failure Breakdown By Field:
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {errorBreakdown.map((b, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 rounded-md bg-white border border-red-200 px-2.5 py-1 text-xs text-red-800 shadow-2xs"
                              >
                                <span className="font-mono font-semibold text-red-700 uppercase">[{b.field}]:</span>
                                <strong className="text-slate-900">{b.count}</strong> issue{b.count !== 1 ? "s" : ""}
                                <span className="text-red-600">({b.rowCount} affected row{b.rowCount !== 1 ? "s" : ""})</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Filter Tabs */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setImportFilter("ALL")}
                        className={`rounded-lg px-3 py-1.5 text-xs transition cursor-pointer ${
                          importFilter === "ALL"
                            ? "bg-white border border-slate-300 text-slate-900 shadow-xs font-semibold"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium"
                        }`}
                      >
                        All ({importAnalysis.totalRows})
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportFilter("NEW")}
                        className={`rounded-lg px-3 py-1.5 text-xs transition cursor-pointer ${
                          importFilter === "NEW"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-300 ring-1 ring-emerald-200 font-semibold"
                            : "text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 font-medium"
                        }`}
                      >
                        New ({importAnalysis.newRecordsCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportFilter("EXISTING")}
                        className={`rounded-lg px-3 py-1.5 text-xs transition cursor-pointer ${
                          importFilter === "EXISTING"
                            ? "bg-amber-50 text-amber-800 border border-amber-300 ring-1 ring-amber-200 font-semibold"
                            : "text-slate-600 hover:text-amber-800 hover:bg-amber-50 font-medium"
                        }`}
                      >
                        Existing Skipped ({importAnalysis.existingCount})
                      </button>
                      {errorRowsCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setImportFilter("ERROR")}
                          className={`rounded-lg px-3 py-1.5 text-xs transition cursor-pointer ${
                            importFilter === "ERROR"
                              ? "bg-red-50 text-red-800 border border-red-300 ring-1 ring-red-200 font-bold"
                              : "bg-red-50/60 text-red-700 border border-red-200 hover:bg-red-100/60 font-semibold"
                          }`}
                        >
                          Errors ({errorRowsCount})
                        </button>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">
                      File: <strong className="text-slate-700 font-medium">{importAnalysis.filename}</strong>
                    </span>
                  </div>

                  {/* Dedicated Error Header when in ERROR filter */}
                  {importFilter === "ERROR" && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-red-800">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-700 border border-red-200 uppercase shrink-0">
                          Blocked Rows
                        </span>
                        <span>
                          <strong>{errorRowsCount} blocking error rows</strong> — These records cannot be imported until the validation issues are resolved.
                        </span>
                      </div>
                      <div className="text-[11px] text-red-700 shrink-0 font-medium">
                        {totalErrorIssuesCount} total issue{totalErrorIssuesCount !== 1 ? "s" : ""} across {errorRowsCount} row{errorRowsCount !== 1 ? "s" : ""}
                      </div>
                    </div>
                  )}

                  {/* Preview Table Container (Scrollable with sticky header) */}
                  <div className="max-h-[500px] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                    {/* View 3A: Dedicated Error Table View */}
                    {importFilter === "ERROR" ? (
                      filteredImportItems.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-2 border border-emerald-200">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <p className="text-sm font-medium text-slate-900">No validation errors detected.</p>
                          <p className="text-xs text-slate-500 mt-0.5">All rows are valid.</p>
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs">
                          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 text-[10px] font-semibold uppercase tracking-wider text-slate-600 shadow-xs">
                            <tr>
                              <th className="px-3.5 py-2.5 w-16">Row</th>
                              <th className="px-3.5 py-2.5 w-20">Status</th>
                              <th className="px-3.5 py-2.5 w-28">Code</th>
                              <th className="px-3.5 py-2.5 min-w-[200px]">Test Name</th>
                              <th className="px-3.5 py-2.5 min-w-[160px]">Category</th>
                              <th className="px-3.5 py-2.5 w-28">Field</th>
                              <th className="px-3.5 py-2.5 min-w-[280px]">Error Message</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {filteredImportItems.map((item) => {
                              const errorIssues = item.issues.filter((i) => i.type === "ERROR");
                              const warningIssues = item.issues.filter((i) => i.type === "WARNING");
                              return (
                                <tr key={item.rowNumber} className="hover:bg-red-50/30 transition">
                                  <td className="px-3.5 py-3 font-mono font-semibold text-slate-500 align-top">
                                    #{item.rowNumber}
                                  </td>
                                  <td className="px-3.5 py-3 align-top">
                                    <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 border border-red-200">
                                      ERROR
                                    </span>
                                  </td>
                                  <td className="px-3.5 py-3 font-mono font-medium text-slate-900 align-top">
                                    {item.code || "—"}
                                  </td>
                                  <td className="px-3.5 py-3 font-medium text-slate-900 align-top break-words">
                                    {item.name || "—"}
                                  </td>
                                  <td className="px-3.5 py-3 text-slate-600 align-top break-words">
                                    {item.categoryName || "—"}
                                  </td>
                                  <td className="px-3.5 py-3 align-top">
                                    <div className="flex flex-col gap-1">
                                      {errorIssues.map((iss, idx) => (
                                        <span
                                          key={idx}
                                          className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 inline-block w-fit font-semibold"
                                        >
                                          {iss.field}
                                        </span>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="px-3.5 py-3 align-top">
                                    <div className="space-y-1.5">
                                      {errorIssues.map((iss, idx) => (
                                        <div key={idx} className="text-xs text-red-800 leading-relaxed break-words">
                                          <span className="font-mono text-[10px] uppercase text-red-700 font-semibold mr-1.5">
                                            [{iss.field}]:
                                          </span>
                                          {iss.message}
                                        </div>
                                      ))}
                                      {warningIssues.map((iss, idx) => (
                                        <div key={idx} className="text-xs text-amber-800 leading-relaxed break-words">
                                          <span className="font-mono text-[10px] uppercase text-amber-700 font-semibold mr-1.5">
                                            [WARN - {iss.field}]:
                                          </span>
                                          {iss.message}
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )
                    ) : (
                      /* View 3B: Standard Table View (All / New / Existing) */
                      filteredImportItems.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-xs">
                          No records found matching the "{importFilter}" filter.
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs">
                          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 text-[10px] font-semibold uppercase tracking-wider text-slate-600 shadow-xs">
                            <tr>
                              <th className="px-3.5 py-2.5 w-16">Row</th>
                              <th className="px-3.5 py-2.5 w-28">Status</th>
                              <th className="px-3.5 py-2.5 w-32">Code</th>
                              <th className="px-3.5 py-2.5 min-w-[220px]">Name</th>
                              <th className="px-3.5 py-2.5 min-w-[180px]">Category</th>
                              <th className="px-3.5 py-2.5 min-w-[140px]">Sample / TAT</th>
                              <th className="px-3.5 py-2.5 min-w-[220px]">Issues / Notes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {filteredImportItems.map((item) => (
                              <tr key={item.rowNumber} className="hover:bg-slate-50 transition">
                                <td className="px-3.5 py-2.5 font-mono text-slate-400">#{item.rowNumber}</td>
                                <td className="px-3.5 py-2.5">
                                  {item.status === "NEW" && (
                                    <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                                      NEW
                                    </span>
                                  )}
                                  {item.status === "EXISTING_SKIP" && (
                                    <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                                      EXISTING (SKIP)
                                    </span>
                                  )}
                                  {item.status === "ERROR" && (
                                    <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 border border-red-200">
                                      ERROR
                                    </span>
                                  )}
                                </td>
                                <td className="px-3.5 py-2.5 font-mono font-medium text-slate-900">{item.code || "—"}</td>
                                <td className="px-3.5 py-2.5 font-medium text-slate-900 break-words">
                                  {item.name || "—"}
                                </td>
                                <td className="px-3.5 py-2.5 text-slate-600 break-words">{item.categoryName || "—"}</td>
                                <td className="px-3.5 py-2.5 text-slate-500">
                                  {item.sampleType} • {item.standardTatHours}h
                                </td>
                                <td className="px-3.5 py-2.5">
                                  {item.issues.length === 0 ? (
                                    <span className="text-slate-400">Valid</span>
                                  ) : (
                                    <div className="space-y-1">
                                      {item.issues.map((iss, idx) => (
                                        <div
                                          key={idx}
                                          className={`text-xs break-words ${
                                            iss.type === "ERROR" ? "text-red-700 font-medium" : "text-amber-700"
                                          }`}
                                        >
                                          • <span className="font-mono text-[10px] uppercase">[{iss.field}]:</span> {iss.message}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setImportAnalysis(null);
                        setSelectedFile(null);
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50 transition cursor-pointer font-medium"
                    >
                      ← Upload Different File
                    </button>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowImportModal(false)}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50 transition cursor-pointer font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmImport}
                        disabled={importAnalysis.hasBlockingErrors || errorRowsCount > 0 || importAnalysis.newRecordsCount === 0 || isImporting}
                        className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-2 font-medium text-white hover:bg-sky-600 transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isImporting ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            Importing Records...
                          </>
                        ) : (
                          `Confirm Import (${importAnalysis.newRecordsCount} New Tests)`
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
