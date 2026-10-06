"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PackageCheck,
  Plus,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Search,
  Check,
  Edit2,
  Trash2,
  Eye,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Tag,
  ShieldCheck,
  Clock,
  Layers,
  PowerOff,
  Power,
} from "lucide-react";

interface LabTestItem {
  id: string; // LabTest.id
  masterTestId: string;
  name: string;
  code: string;
  categoryName?: string;
  sampleType?: string;
  sellingPrice: number;
  mrpPrice: number | null;
  isActive: boolean;
  fastingRequired?: boolean;
}

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
  savingsPercentage: number;
  testCount: number;
  isActive: boolean;
  isHomeCollectionAvailable: boolean;
  estimatedTatHours: number | null;
  fastingRequired: boolean;
  preparationInstructions: string | null;
  sampleTypes: string[];
  createdAt: string;
  updatedAt: string;
  tests: Array<{
    labTestId: string;
    testName: string;
    testCode: string;
    categoryName?: string;
    sampleType?: string;
    price: number;
  }>;
}

interface PackageFormData {
  id?: string;
  name: string;
  code: string;
  description: string;
  sellingPrice: number | "";
  mrpPrice: number | "";
  isActive: boolean;
  isHomeCollectionAvailable: boolean;
  fastingRequired: boolean;
  preparationInstructions: string;
  estimatedTatHours: number;
  testIds: string[];
}

const INITIAL_FORM: PackageFormData = {
  name: "",
  code: "",
  description: "",
  sellingPrice: "",
  mrpPrice: "",
  isActive: true,
  isHomeCollectionAvailable: true,
  fastingRequired: false,
  preparationInstructions: "",
  estimatedTatHours: 24,
  testIds: [],
};

export default function LabOnboardingPackagesPage() {
  const router = useRouter();

  // Data states
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [catalogueTests, setCatalogueTests] = useState<LabTestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Expanded package cards for details view
  const [expandedPackageId, setExpandedPackageId] = useState<string | null>(null);

  // Modal / Builder state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<PackageFormData>(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Test Selection filters inside modal
  const [testSearch, setTestSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Load packages and lab's catalogue tests
  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const [pkgRes, catRes] = await Promise.all([
        fetch("/api/lab/packages"),
        fetch("/api/lab/catalogue?isActive=true"),
      ]);

      if (pkgRes.ok) {
        const pkgData = await pkgRes.json();
        setPackages(pkgData.packages || []);
      }

      if (catRes.ok) {
        const catData = await catRes.json();
        setCatalogueTests(catData.tests || []);
      }
    } catch (err: any) {
      setErrorBanner("Failed to load laboratory packages and catalogue data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Distinct categories from catalogue tests
  const categories = useMemo(() => {
    const set = new Set<string>();
    catalogueTests.forEach((t) => {
      if (t.categoryName) set.add(t.categoryName);
    });
    return Array.from(set).sort();
  }, [catalogueTests]);

  // Filtered catalogue tests for selection
  const filteredCatalogueTests = useMemo(() => {
    return catalogueTests.filter((t) => {
      if (selectedCategory !== "ALL" && t.categoryName !== selectedCategory) {
        return false;
      }
      if (testSearch.trim()) {
        const q = testSearch.toLowerCase().trim();
        const nameMatch = t.name.toLowerCase().includes(q);
        const codeMatch = t.code.toLowerCase().includes(q);
        return nameMatch || codeMatch;
      }
      return true;
    });
  }, [catalogueTests, selectedCategory, testSearch]);

  // Selected tests details
  const selectedTestsList = useMemo(() => {
    return catalogueTests.filter((t) => formData.testIds.includes(t.id));
  }, [catalogueTests, formData.testIds]);

  // Live price & savings calculation
  const individualValue = useMemo(() => {
    return selectedTestsList.reduce((sum, t) => sum + Number(t.sellingPrice), 0);
  }, [selectedTestsList]);

  const packagePriceNum = typeof formData.sellingPrice === "number" ? formData.sellingPrice : 0;
  const savings = Math.max(0, individualValue - packagePriceNum);
  const savingsPercentage =
    individualValue > 0 ? Math.round((savings / individualValue) * 1000) / 10 : 0;

  // Toggle test selection
  const toggleTestSelection = (testId: string) => {
    setFormData((prev) => {
      const exists = prev.testIds.includes(testId);
      const nextTestIds = exists
        ? prev.testIds.filter((id) => id !== testId)
        : [...prev.testIds, testId];

      // Auto-detect fasting requirement
      const selected = catalogueTests.filter((t) => nextTestIds.includes(t.id));
      const requiresFasting = selected.some((t) => t.fastingRequired);

      return {
        ...prev,
        testIds: nextTestIds,
        fastingRequired: prev.fastingRequired || requiresFasting,
      };
    });

    if (formErrors["testIds"]) {
      setFormErrors((prev) => {
        const copy = { ...prev };
        delete copy["testIds"];
        return copy;
      });
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setIsEditing(false);
    setFormData(INITIAL_FORM);
    setFormErrors({});
    setTestSearch("");
    setSelectedCategory("ALL");
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (pkg: PackageItem) => {
    setIsEditing(true);
    setFormData({
      id: pkg.id,
      name: pkg.name,
      code: pkg.code || "",
      description: pkg.description || "",
      sellingPrice: pkg.sellingPrice,
      mrpPrice: pkg.mrpPrice !== null ? pkg.mrpPrice : "",
      isActive: pkg.isActive,
      isHomeCollectionAvailable: pkg.isHomeCollectionAvailable,
      fastingRequired: pkg.fastingRequired,
      preparationInstructions: pkg.preparationInstructions || "",
      estimatedTatHours: pkg.estimatedTatHours || 24,
      testIds: pkg.tests.map((t) => t.labTestId),
    });
    setFormErrors({});
    setTestSearch("");
    setSelectedCategory("ALL");
    setIsModalOpen(true);
  };

  // Toggle Activate / Deactivate
  const handleToggleActive = async (pkg: PackageItem) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/lab/packages/${pkg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !pkg.isActive }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update package status.");
      }

      setPackages((prev) =>
        prev.map((p) => (p.id === pkg.id ? { ...p, isActive: !p.isActive } : p))
      );
      setSuccessBanner(
        `Package '${pkg.name}' ${!pkg.isActive ? "activated" : "deactivated"} successfully.`
      );
    } catch (err: any) {
      setErrorBanner(err.message || "Failed to toggle package status.");
    } finally {
      setActionLoading(false);
    }
  };

  // Deactivate Package action (safe delete)
  const handleDeactivate = async (packageId: string, packageName: string) => {
    if (!confirm(`Are you sure you want to deactivate '${packageName}'? Patients will no longer be able to book this package.`)) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/lab/packages/${packageId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to deactivate package.");
      }

      setPackages((prev) =>
        prev.map((p) => (p.id === packageId ? { ...p, isActive: false } : p))
      );
      setSuccessBanner(`Package '${packageName}' has been deactivated.`);
    } catch (err: any) {
      setErrorBanner(err.message || "Failed to deactivate package.");
    } finally {
      setActionLoading(false);
    }
  };

  // Form Submission (Create or Edit)
  const handleSubmitPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors["name"] = "Package name is required.";
    }

    if (formData.sellingPrice === "" || isNaN(Number(formData.sellingPrice)) || Number(formData.sellingPrice) <= 0) {
      errors["sellingPrice"] = "A valid selling price greater than 0 is required.";
    }

    if (formData.mrpPrice !== "" && (isNaN(Number(formData.mrpPrice)) || Number(formData.mrpPrice) <= 0)) {
      errors["mrpPrice"] = "MRP must be a valid positive number.";
    }

    if (formData.testIds.length === 0) {
      errors["testIds"] = "You must select at least one diagnostic test.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setActionLoading(true);
    setErrorBanner(null);

    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim() || undefined,
        description: formData.description.trim() || undefined,
        sellingPrice: Number(formData.sellingPrice),
        mrpPrice: formData.mrpPrice !== "" ? Number(formData.mrpPrice) : undefined,
        isActive: formData.isActive,
        isHomeCollectionAvailable: formData.isHomeCollectionAvailable,
        fastingRequired: formData.fastingRequired,
        preparationInstructions: formData.preparationInstructions.trim() || undefined,
        estimatedTatHours: Number(formData.estimatedTatHours) || 24,
        testIds: formData.testIds,
      };

      if (isEditing && formData.id) {
        const res = await fetch(`/api/lab/packages/${formData.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to update package.");
        }

        setSuccessBanner(`Package '${formData.name}' updated successfully.`);
      } else {
        const res = await fetch("/api/lab/packages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to create package.");
        }

        setSuccessBanner(`Package '${formData.name}' created successfully.`);
      }

      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setErrorBanner(err.message || "Failed to save health package.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      {/* ── Top Header & Progress Stepper ────────────────────────────── */}
      <div className="max-w-7xl mx-auto mb-8 text-center sm:text-left sm:flex sm:items-center sm:justify-between border-b border-slate-200 pb-6">
        <div>
          <Link href="/" className="inline-block mb-3">
            <Image
              src="/branding/gyrex-labs.svg"
              alt="Gyrex Labs"
              width={150}
              height={44}
              priority
              className="h-8 w-auto"
            />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Health Checkup Packages
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Step 3 of your digital laboratory setup. Bundle your diagnostic tests into high-margin health packages.
          </p>
        </div>

        {/* 5-Step Progress Indicators */}
        <div className="mt-6 sm:mt-0 flex items-center justify-center space-x-2">
          {/* Step 1: Complete */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>1. Profile</span>
          </div>

          <div className="h-0.5 w-4 bg-emerald-300" />

          {/* Step 2: Complete */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>2. Catalogue</span>
          </div>

          <div className="h-0.5 w-4 bg-blue-300" />

          {/* Step 3: Active (Packages) */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700 ring-2 ring-blue-500/20">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white font-bold">
              3
            </span>
            <span>3. Packages</span>
          </div>

          <div className="h-0.5 w-4 bg-slate-200" />

          {/* Step 4: Locked */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-xs font-medium text-slate-400">
            <span>4. Payments</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Alerts Banner */}
        {errorBanner && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3"
          >
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Action Required</p>
              <p className="text-xs text-red-600 mt-0.5">{errorBanner}</p>
            </div>
            <button
              onClick={() => setErrorBanner(null)}
              className="text-red-400 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {successBanner && (
          <div
            role="alert"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-start gap-3"
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{successBanner}</p>
            </div>
            <button
              onClick={() => setSuccessBanner(null)}
              className="text-emerald-500 hover:text-emerald-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── Main Action Bar ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              <span>Configured Health Packages ({packages.length})</span>
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Bundles created here appear directly on your laboratory&apos;s digital storefront.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={openCreateModal}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
            >
              <Plus className="h-4 w-4" />
              Create Package
            </button>

            <Link
              href="/lab/onboarding/payments"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              <span>Continue to Payments</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* ── Package List or Empty State ────────────────────────────── */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-900">Loading your health packages...</p>
          </div>
        ) : packages.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center max-w-2xl mx-auto space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <PackageCheck className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">No Health Packages Yet</h3>
              <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto leading-relaxed">
                Health packages combine multiple individual diagnostic tests (like CBC, Lipid Profile, Liver and Kidney panels) into a single discounted booking. They are proven to increase average patient order value by up to 65%.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
              >
                <Plus className="h-4 w-4" />
                Create Your First Package
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg) => {
              const isExpanded = expandedPackageId === pkg.id;

              return (
                <div
                  key={pkg.id}
                  className={`bg-white rounded-2xl border transition shadow-sm flex flex-col justify-between ${
                    pkg.isActive
                      ? "border-slate-200 hover:border-blue-300"
                      : "border-slate-200 bg-slate-50/60 opacity-80"
                  }`}
                >
                  <div className="p-6">
                    {/* Header: Title & Badges */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">
                            {pkg.name}
                          </h3>
                        </div>
                        {pkg.code && (
                          <span className="inline-block mt-1 font-mono text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            {pkg.code}
                          </span>
                        )}
                      </div>

                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          pkg.isActive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        {pkg.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {/* Description */}
                    {pkg.description && (
                      <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                        {pkg.description}
                      </p>
                    )}

                    {/* Pricing Display */}
                    <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-slate-500">Package Price:</span>
                        <div className="text-right">
                          <span className="text-lg font-bold text-slate-900">
                            ₹{pkg.sellingPrice}
                          </span>
                          {pkg.mrpPrice && pkg.mrpPrice > pkg.sellingPrice && (
                            <span className="ml-2 text-xs text-slate-400 line-through">
                              ₹{pkg.mrpPrice}
                            </span>
                          )}
                        </div>
                      </div>

                      {pkg.individualTestValue > pkg.sellingPrice && (
                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                          <span className="text-slate-500">Tests Total Value:</span>
                          <span className="font-semibold text-slate-700">
                            ₹{pkg.individualTestValue}
                          </span>
                        </div>
                      )}

                      {pkg.savings > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-emerald-700 font-medium">Patient Savings:</span>
                          <span className="font-bold text-emerald-600">
                            ₹{pkg.savings} ({pkg.savingsPercentage}% OFF)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Included Tests Summary */}
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedPackageId(isExpanded ? null : pkg.id)
                        }
                        className="w-full flex items-center justify-between text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        <span>Included Tests ({pkg.testCount})</span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {pkg.tests.map((t, idx) => (
                            <div
                              key={idx}
                              className="text-[11px] p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-slate-700"
                            >
                              <div>
                                <span className="font-medium">{t.testName}</span>
                                {t.testCode && (
                                  <span className="text-slate-400 ml-1.5 font-mono">
                                    ({t.testCode})
                                  </span>
                                )}
                              </div>
                              <span className="font-semibold text-slate-900">
                                ₹{t.price}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(pkg)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                      >
                        <Edit2 className="h-3 w-3 text-slate-500" />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleActive(pkg)}
                        disabled={actionLoading}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ${
                          pkg.isActive
                            ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {pkg.isActive ? (
                          <>
                            <PowerOff className="h-3 w-3" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Power className="h-3 w-3" />
                            Activate
                          </>
                        )}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeactivate(pkg.id, pkg.name)}
                      disabled={actionLoading}
                      title="Deactivate package safely"
                      className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Continue Flow Card ─────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-600 space-y-0.5 text-center sm:text-left">
            <p className="font-semibold text-slate-900">
              {packages.length > 0
                ? `${packages.length} health checkup package(s) configured.`
                : "You can create packages now or add them later from your dashboard."}
            </p>
            <p className="text-slate-500">
              Next step is setting up your digital payment credentials for online checkout.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              href="/lab/onboarding/catalogue"
              className="w-full sm:w-auto text-center px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5 inline mr-1" />
              Back to Catalogue
            </Link>

            <Link
              href="/lab/onboarding/payments"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
            >
              Continue to Payments
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── CREATE / EDIT PACKAGE MODAL ─────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {isEditing ? "Edit Health Package" : "Create New Health Package"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Combine catalogue tests into an attractive bundled package.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitPackage} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Package Name */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Package Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Comprehensive Full Body Checkup"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formErrors["name"] && (
                    <p className="text-[11px] text-red-600 mt-1">{formErrors["name"]}</p>
                  )}
                </div>

                {/* Package Code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Package Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PKG-FBC-01"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Package Selling Price */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Package Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    placeholder="e.g. 999"
                    value={formData.sellingPrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sellingPrice: e.target.value === "" ? "" : parseFloat(e.target.value),
                      })
                    }
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  />
                  {formErrors["sellingPrice"] && (
                    <p className="text-[11px] text-red-600 mt-1">
                      {formErrors["sellingPrice"]}
                    </p>
                  )}
                </div>

                {/* MRP */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    MRP / Cross-Out Price (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder={`Default: ₹${individualValue || 1499}`}
                    value={formData.mrpPrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        mrpPrice: e.target.value === "" ? "" : parseFloat(e.target.value),
                      })
                    }
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formErrors["mrpPrice"] && (
                    <p className="text-[11px] text-red-600 mt-1">{formErrors["mrpPrice"]}</p>
                  )}
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Package Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Brief summary of what investigations are covered and patient benefits..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* ── Test Selection Workspace ───────────────────────────── */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Select Tests from Your Catalogue * ({formData.testIds.length} selected)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Only tests configured in your laboratory catalogue are available.
                    </p>
                  </div>

                  <span className="text-xs font-bold text-blue-700 bg-blue-100/70 px-2.5 py-1 rounded-full">
                    Selected Tests Value: ₹{individualValue}
                  </span>
                </div>

                {/* Search & Category Filter */}
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search test name or code..."
                      value={testSearch}
                      onChange={(e) => setTestSearch(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {categories.length > 0 && (
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
                    >
                      <option value="ALL">All Categories ({catalogueTests.length})</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Test Selection List */}
                <div className="border border-slate-200 rounded-xl bg-white max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {filteredCatalogueTests.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No catalogue tests match your filter.
                    </div>
                  ) : (
                    filteredCatalogueTests.map((t) => {
                      const isSelected = formData.testIds.includes(t.id);

                      return (
                        <div
                          key={t.id}
                          onClick={() => toggleTestSelection(t.id)}
                          className={`p-2.5 px-3 flex items-center justify-between text-xs cursor-pointer transition select-none ${
                            isSelected
                              ? "bg-blue-50/60 text-blue-900"
                              : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by parent onClick
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                            />
                            <div>
                              <div className="font-semibold">{t.name}</div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                                {t.code && (
                                  <span className="font-mono bg-slate-100 px-1 py-0.2 rounded">
                                    {t.code}
                                  </span>
                                )}
                                {t.categoryName && <span>• {t.categoryName}</span>}
                                {t.fastingRequired && (
                                  <span className="text-amber-600 font-medium">
                                    • Fasting Required
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="font-bold text-slate-900">
                            ₹{t.sellingPrice}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {formErrors["testIds"] && (
                  <p className="text-[11px] text-red-600">{formErrors["testIds"]}</p>
                )}
              </div>

              {/* ── Live Preview & Economics Card ──────────────────────── */}
              <div className="border border-sky-200 rounded-xl p-5 bg-sky-50/50 space-y-3">
                <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 uppercase tracking-wider">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    <span>Package Pricing Summary &amp; Preview</span>
                  </div>
                  <span className="text-[11px] text-blue-700 font-medium">
                    {formData.testIds.length} Tests Included
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-white rounded-xl border border-blue-100">
                    <span className="text-[11px] text-slate-500">Individual Value</span>
                    <p className="text-base font-bold text-slate-800 mt-0.5">
                      ₹{individualValue}
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-blue-200 shadow-sm">
                    <span className="text-[11px] text-blue-700 font-medium">
                      Package Price
                    </span>
                    <p className="text-base font-extrabold text-blue-700 mt-0.5">
                      {packagePriceNum > 0 ? `₹${packagePriceNum}` : "—"}
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-emerald-100">
                    <span className="text-[11px] text-emerald-700 font-medium">
                      Patient Savings
                    </span>
                    <p className="text-base font-bold text-emerald-600 mt-0.5">
                      {savings > 0 ? `₹${savings} (${savingsPercentage}%)` : "—"}
                    </p>
                  </div>
                </div>

                {/* Patient Preview Card Spec */}
                <div className="mt-2 p-3 bg-white/80 rounded-xl border border-blue-100 text-xs text-slate-700">
                  <p className="font-bold text-slate-900 mb-1">
                    {formData.name || "Untitled Package"}
                  </p>
                  <p className="text-[11px] text-slate-500 line-clamp-2">
                    {selectedTestsList.map((t) => t.name).join(", ") || "No tests selected yet."}
                  </p>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {actionLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Saving Package...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      {isEditing ? "Update Package" : "Save Package"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
