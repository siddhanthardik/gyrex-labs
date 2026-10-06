"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  FlaskConical,
  Check,
  ShieldCheck,
  Building2,
  Home,
  Save,
  ArrowLeft,
} from "lucide-react";

export interface PackageTestItem {
  id: string; // labTestId
  name: string;
  code: string;
  categoryName: string;
  sampleType: string;
  standardTatHours: number;
  sellingPrice: number;
  homeCollectionEligible?: boolean;
  isHomeCollectionAvailable?: boolean;
}

export interface PackageEditorProps {
  packageId?: string;
  initialData?: {
    name: string;
    description: string;
    sellingPrice: number;
    mrpPrice: number | null;
    isHomeCollectionAvailable: boolean;
    fastingRequired: boolean;
    estimatedTatHours: number;
    isActive: boolean;
    tests: PackageTestItem[];
  };
}

export function PackageEditor({ packageId, initialData }: PackageEditorProps) {
  const router = useRouter();
  const isEdit = Boolean(packageId);

  // Available tests from lab catalogue
  const [catalogueTests, setCatalogueTests] = useState<PackageTestItem[]>([]);
  const [loadingCatalogue, setLoadingCatalogue] = useState(true);

  // Form State
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [sellingPrice, setSellingPrice] = useState<number | string>(
    initialData?.sellingPrice !== undefined ? initialData.sellingPrice : 999
  );
  const [mrpPrice, setMrpPrice] = useState<number | string>(
    initialData?.mrpPrice !== null && initialData?.mrpPrice !== undefined
      ? initialData.mrpPrice
      : 1499
  );
  const [isHomeCollectionAvailable, setIsHomeCollectionAvailable] = useState<boolean>(
    initialData?.isHomeCollectionAvailable ?? true
  );
  const [fastingRequired, setFastingRequired] = useState<boolean>(
    initialData?.fastingRequired ?? false
  );
  const [estimatedTatHours, setEstimatedTatHours] = useState<number>(
    initialData?.estimatedTatHours || 24
  );
  const [isActive, setIsActive] = useState<boolean>(
    initialData?.isActive ?? true
  );

  // Selected tests
  const [selectedTests, setSelectedTests] = useState<PackageTestItem[]>(
    initialData?.tests || []
  );

  // Search & Filter state for test catalogue
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  // Status & Validation
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Load lab's active catalogue tests
  useEffect(() => {
    async function loadCatalogue() {
      try {
        const res = await fetch("/api/lab/catalogue?isActive=true");
        if (res.ok) {
          const data = await res.json();
          const mapped: PackageTestItem[] = (data.tests || []).map((t: any) => {
            const canonicalName = t.name || t.masterTest?.name;
            const canonicalCode = t.code || t.masterTest?.code || "";
            const canonicalCategory = t.categoryName || t.masterTest?.category?.name;
            const canonicalSampleType = t.sampleType || t.masterTest?.sampleType || "Specimen";
            const canonicalTat = t.effectiveTatHours || t.customTatHours || t.masterTest?.standardTatHours || 24;
            const canonicalPrice = Number(t.sellingPrice ?? t.price) || 0;

            const homeEligible =
              t.homeCollectionEligible ?? t.masterTest?.homeCollectionEligible ?? true;
            const labHomeAvailable = t.isHomeCollectionAvailable ?? true;

            if (!canonicalName) {
              return {
                id: t.id,
                name: `[Data Integrity Error: Test #${t.id} Unresolved]`,
                code: canonicalCode,
                categoryName: canonicalCategory || "[Uncategorized]",
                sampleType: canonicalSampleType,
                standardTatHours: canonicalTat,
                sellingPrice: canonicalPrice,
                homeCollectionEligible: homeEligible,
                isHomeCollectionAvailable: labHomeAvailable,
              };
            }

            return {
              id: t.id,
              name: canonicalName,
              code: canonicalCode,
              categoryName: canonicalCategory || "[Uncategorized]",
              sampleType: canonicalSampleType,
              standardTatHours: canonicalTat,
              sellingPrice: canonicalPrice,
              homeCollectionEligible: homeEligible,
              isHomeCollectionAvailable: labHomeAvailable,
            };
          });
          setCatalogueTests(mapped);
        }
      } catch (err) {
        console.error("Failed to load lab catalogue tests:", err);
      } finally {
        setLoadingCatalogue(false);
      }
    }
    loadCatalogue();
  }, []);

  // Compute available categories for filter dropdown
  const categories = useMemo(() => {
    const set = new Set<string>();
    catalogueTests.forEach((t) => {
      if (t.categoryName && !t.categoryName.startsWith("[")) {
        set.add(t.categoryName);
      }
    });
    return Array.from(set).sort();
  }, [catalogueTests]);

  // Filtered catalogue tests based on search and category
  const searchResults = useMemo(() => {
    return catalogueTests.filter((t) => {
      if (selectedCategory !== "ALL" && t.categoryName !== selectedCategory) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q) ||
          t.categoryName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [catalogueTests, selectedCategory, searchTerm]);

  // Test set IDs for O(1) duplicate checks
  const selectedTestIds = useMemo(() => {
    return new Set(selectedTests.map((t) => t.id));
  }, [selectedTests]);

  // Add test to package (interactive, no reload, prevent duplicates)
  const handleAddTest = (test: PackageTestItem) => {
    if (selectedTestIds.has(test.id)) return;
    const updated = [...selectedTests, test];
    setSelectedTests(updated);
    setNotification(null);

    // Auto-update estimated TAT if current TAT is lower than the new test's TAT
    const maxTat = Math.max(...updated.map((t) => t.standardTatHours), 24);
    if (!initialData || Number(estimatedTatHours) < maxTat) {
      setEstimatedTatHours(maxTat);
    }
  };

  // Remove test from package (interactive, no reload)
  const handleRemoveTest = (testId: string) => {
    const updated = selectedTests.filter((t) => t.id !== testId);
    setSelectedTests(updated);
    if (updated.length > 0) {
      const maxTat = Math.max(...updated.map((t) => t.standardTatHours), 24);
      setEstimatedTatHours(maxTat);
    }
  };

  // Calculations
  const numSellingPrice = typeof sellingPrice === "number" ? sellingPrice : parseFloat(sellingPrice) || 0;
  const numMrpPrice = mrpPrice === "" ? null : (typeof mrpPrice === "number" ? mrpPrice : parseFloat(mrpPrice) || null);

  const testsSubtotal = useMemo(() => {
    return selectedTests.reduce((sum, t) => sum + t.sellingPrice, 0);
  }, [selectedTests]);

  const savings = Math.max(0, testsSubtotal - numSellingPrice);
  const savingsPercentage = testsSubtotal > 0 ? Math.round((savings / testsSubtotal) * 100) : 0;

  // Level 2 & Level 3 Home Collection Eligibility for Health Packages
  const testsRequiringLabVisit = useMemo(() => {
    return selectedTests.filter(
      (t) => t.homeCollectionEligible === false || t.isHomeCollectionAvailable === false
    );
  }, [selectedTests]);

  const isPackageHomeCollectionEligible = testsRequiringLabVisit.length === 0;

  // Validation checks
  const priceErrors = useMemo(() => {
    const errors: string[] = [];
    if (numSellingPrice <= 0) {
      errors.push("Package selling price must be greater than zero.");
    }
    if (numMrpPrice !== null && numMrpPrice <= 0) {
      errors.push("MRP must be greater than zero.");
    }
    if (numMrpPrice !== null && numSellingPrice > numMrpPrice) {
      errors.push("Package selling price cannot exceed the MRP / printed price.");
    }
    if (selectedTests.length === 0) {
      errors.push("Add at least one diagnostic test to the package.");
    }
    return errors;
  }, [numSellingPrice, numMrpPrice, selectedTests.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNotification({ type: "error", message: "Please enter a package name." });
      return;
    }
    if (selectedTests.length === 0) {
      setNotification({ type: "error", message: "Please select at least one test for this package." });
      return;
    }
    if (priceErrors.length > 0) {
      setNotification({ type: "error", message: priceErrors[0] });
      return;
    }

    setSaving(true);
    setNotification(null);

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      sellingPrice: numSellingPrice,
      mrpPrice: numMrpPrice !== null ? numMrpPrice : undefined,
      isHomeCollectionAvailable: isPackageHomeCollectionEligible ? isHomeCollectionAvailable : false,
      fastingRequired,
      estimatedTatHours: Number(estimatedTatHours) || 24,
      isActive,
      testIds: selectedTests.map((t) => t.id),
    };

    try {
      const endpoint = isEdit ? `/api/lab/packages/${packageId}` : "/api/lab/packages";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Failed to ${isEdit ? "update" : "create"} package.`);
      }

      setNotification({
        type: "success",
        message: `Package ${isEdit ? "updated" : "created"} successfully!`,
      });

      setTimeout(() => {
        router.push("/lab/packages");
      }, 1000);
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || `Failed to ${isEdit ? "save" : "create"} package.`,
      });
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Top Header */}
      <div>
        <Link
          href="/lab/packages"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Packages</span>
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          {isEdit ? "Edit Health Package" : "Create Health Package"}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Bundle individual diagnostic tests into a high-converting health checkup package. Individual test prices are authoritatively verified.
        </p>
      </div>

      {notification && (
        <div
          className={`rounded-xl p-4 text-xs font-medium border flex items-start gap-2.5 ${
            notification.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-700"
              : "bg-emerald-50 border-emerald-200 text-emerald-700"
          }`}
        >
          {notification.type === "error" ? (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Two-Column Layout */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left Column: Package Information & Test Search (8 cols) */}
        <div className="space-y-6 lg:col-span-7 xl:col-span-8">
          {/* Section 1: Package Information */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
            <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-3">
              Package Information
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700">
                  Package Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Comprehensive Annual Health Checkup"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Recommended for annual health assessment. Evaluates liver, kidneys, lipid profile, and complete hemogram."
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Package Selling Price (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Amount charged to booking patient
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  MRP / Printed Price (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  value={mrpPrice ?? ""}
                  onChange={(e) => setMrpPrice(e.target.value)}
                  placeholder="e.g. 1499"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Maximum retail/printed price (must be ≥ selling price)
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Estimated Report TAT (Hours)
                </label>
                <input
                  type="number"
                  min="1"
                  value={estimatedTatHours}
                  onChange={(e) => setEstimatedTatHours(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col justify-end space-y-2.5 pt-2 sm:pt-0">
                <div className="space-y-1.5">
                  <label
                    className={`flex items-center gap-2 ${
                      !isPackageHomeCollectionEligible ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={!isPackageHomeCollectionEligible}
                      checked={isPackageHomeCollectionEligible ? isHomeCollectionAvailable : false}
                      onChange={(e) => {
                        if (!isPackageHomeCollectionEligible) return;
                        setIsHomeCollectionAvailable(e.target.checked);
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
                    />
                    <span className="text-xs font-medium text-slate-700">
                      Home Sample Collection Available
                    </span>
                  </label>

                  {!isPackageHomeCollectionEligible && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-800">
                      <div className="font-semibold flex items-center gap-1.5 text-amber-900">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span>Home collection unavailable for this package</span>
                      </div>
                      <p className="mt-1 leading-relaxed">
                        Home collection is unavailable for this package because the following tests require laboratory visit:{" "}
                        <strong className="text-amber-950">
                          {testsRequiringLabVisit.map((t) => t.name).join(", ")}
                        </strong>
                      </p>
                    </div>
                  )}
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fastingRequired}
                    onChange={(e) => setFastingRequired(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
                  />
                  <span className="text-xs font-medium text-slate-700">
                    Fasting Required for Package
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
                  />
                  <span className="text-xs font-medium text-slate-700">
                    Active / Visible in Patient Store
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Section 2: Add Diagnostic Tests */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Add Diagnostic Tests</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Search your active laboratory catalogue tests to add to this health package.
              </p>
            </div>

            {/* Search and Category Filter */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="relative sm:col-span-8">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search test name, code or synonym..."
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-4">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Test Results List */}
            {loadingCatalogue ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Loading laboratory tests...
              </div>
            ) : catalogueTests.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                No active tests in your laboratory catalogue. Please add tests to your catalogue first.
              </div>
            ) : searchResults.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                No tests match your search criteria.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 max-h-96 overflow-y-auto">
                {searchResults.map((test) => {
                  const isAdded = selectedTestIds.has(test.id);
                  return (
                    <div
                      key={test.id}
                      className="p-3 flex items-center justify-between hover:bg-slate-50/70 transition gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-900 truncate">
                            {test.name}
                          </span>
                          {test.code && (
                            <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                              {test.code}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                          <span>{test.categoryName}</span>
                          <span>•</span>
                          <span>{test.sampleType}</span>
                          <span>•</span>
                          <span>{test.standardTatHours}h TAT</span>
                          <span>•</span>
                          <span className="font-medium text-slate-700">₹{test.sellingPrice}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => (isAdded ? handleRemoveTest(test.id) : handleAddTest(test))}
                        className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition shrink-0 ${
                          isAdded
                            ? "bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 border border-slate-200"
                            : "bg-sky-500 text-white hover:bg-sky-600 shadow-xs"
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5" />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Sticky Summary & Validation (4-5 cols) */}
        <div className="space-y-4 lg:col-span-5 xl:col-span-4 sticky top-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-semibold text-slate-900">Package Summary</h2>
              <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-bold text-sky-700 border border-sky-200">
                {selectedTests.length} Tests Selected
              </span>
            </div>

            {/* Selected Tests List */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                Selected Tests ({selectedTests.length})
              </span>

              {selectedTests.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-500">
                  No tests added yet. Use the search panel on the left to add investigations.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
                  {selectedTests.map((test) => (
                    <div
                      key={test.id}
                      className="flex items-center justify-between pt-1.5 first:pt-0 text-xs"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="font-medium text-slate-900 truncate">{test.name}</p>
                        <p className="text-[11px] text-slate-500">₹{test.sellingPrice}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveTest(test.id)}
                        className="rounded p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Remove test"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pricing Metrics Breakdown */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Tests Subtotal:</span>
                <span className="font-semibold text-slate-900">₹{testsSubtotal}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Package MRP:</span>
                <span className="font-semibold text-slate-900">
                  {numMrpPrice !== null ? `₹${numMrpPrice}` : "Not set"}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Package Selling Price:</span>
                <span className="font-bold text-slate-900">₹{numSellingPrice}</span>
              </div>

              <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-emerald-700 font-medium">
                <span>Patient Saves:</span>
                <span className="text-sm font-bold">
                  ₹{savings} ({savingsPercentage}%)
                </span>
              </div>
            </div>

            {/* Validation Alerts */}
            {priceErrors.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-[11px] text-amber-800 space-y-1">
                {priceErrors.map((err, i) => (
                  <p key={i}>• {err}</p>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="submit"
                disabled={saving || selectedTests.length === 0 || priceErrors.length > 0}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-xs font-medium text-white shadow-xs hover:bg-sky-700 transition disabled:opacity-50 cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>
                  {saving
                    ? isEdit
                      ? "Updating Package..."
                      : "Creating Package..."
                    : isEdit
                    ? "Update Health Package"
                    : "Save Health Package"}
                </span>
              </button>

              <Link
                href="/lab/packages"
                className="w-full inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
