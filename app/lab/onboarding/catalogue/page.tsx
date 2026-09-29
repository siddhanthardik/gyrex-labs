"use client";

import React, { useState, useRef, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Search,
  Filter,
  Check,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  Info,
  ShieldCheck,
  FileText,
} from "lucide-react";
import {
  BulkImportAnalysisResult,
  AnalyzedImportItem,
  ConfirmedImportItem,
} from "@/services/lab/catalogue-import-service";

type FilterTab = "ALL" | "READY" | "NEEDS_REVIEW" | "ERROR" | "UPDATES";

export default function LabOnboardingCataloguePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload & Analysis state
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<BulkImportAnalysisResult | null>(null);

  // Table & selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [itemActions, setItemActions] = useState<Record<string, "CREATE" | "UPDATE" | "SKIP">>({});
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Confirmation / import state
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    totalProcessed: number;
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
  } | null>(null);

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = async (file: File) => {
    setUploadError(null);
    setAnalysis(null);
    setImportResult(null);

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls") && !fileName.endsWith(".csv")) {
      setUploadError("Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File size exceeds 10 MB limit.");
      return;
    }

    setIsUploading(true);
    setUploadedFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/lab/catalogue/import-file", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process the spreadsheet.");
      }

      const analysisResult: BulkImportAnalysisResult = data.analysis;
      setAnalysis(analysisResult);

      // Initialize selected items (Select all READY items + valid UPDATES by default)
      const initialSelected = new Set<string>();
      const initialActions: Record<string, "CREATE" | "UPDATE" | "SKIP"> = {};

      analysisResult.items.forEach((item) => {
        initialActions[item.id] = item.action;
        if (item.status === "READY" && item.matchedMaster && item.action !== "SKIP") {
          initialSelected.add(item.id);
        } else if (item.status === "NEEDS_REVIEW" && item.matchedMaster && item.action === "UPDATE") {
          initialSelected.add(item.id);
        }
      });

      setSelectedIds(initialSelected);
      setItemActions(initialActions);
    } catch (err: any) {
      setUploadError(err.message || "An unexpected error occurred during file parsing.");
    } finally {
      setIsUploading(false);
    }
  };

  // Filtered Items
  const filteredItems = useMemo(() => {
    if (!analysis) return [];

    return analysis.items.filter((item) => {
      // Tab filter
      if (activeTab === "READY" && item.status !== "READY") return false;
      if (activeTab === "NEEDS_REVIEW" && item.status !== "NEEDS_REVIEW") return false;
      if (activeTab === "ERROR" && item.status !== "ERROR") return false;
      if (activeTab === "UPDATES" && item.existingLabTest === null) return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const codeMatch = item.uploaded.code?.toLowerCase().includes(query);
        const nameMatch = item.uploaded.name?.toLowerCase().includes(query);
        const masterMatch = item.matchedMaster?.name.toLowerCase().includes(query);
        return Boolean(codeMatch || nameMatch || masterMatch);
      }

      return true;
    });
  }, [analysis, activeTab, searchQuery]);

  // Master selection toggle for current filtered view
  const areAllFilteredSelected = useMemo(() => {
    const selectable = filteredItems.filter((i) => i.status !== "ERROR" && i.matchedMaster);
    if (selectable.length === 0) return false;
    return selectable.every((i) => selectedIds.has(i.id));
  }, [filteredItems, selectedIds]);

  const toggleSelectAllFiltered = () => {
    const selectable = filteredItems.filter((i) => i.status !== "ERROR" && i.matchedMaster);
    const newSelected = new Set(selectedIds);

    if (areAllFilteredSelected) {
      selectable.forEach((i) => newSelected.delete(i.id));
    } else {
      selectable.forEach((i) => newSelected.add(i.id));
    }
    setSelectedIds(newSelected);
  };

  const toggleItemSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleActionToggle = (id: string, newAction: "CREATE" | "UPDATE" | "SKIP") => {
    setItemActions((prev) => ({ ...prev, [id]: newAction }));
    // If set to SKIP, deselect; if set to CREATE/UPDATE, select
    const newSelected = new Set(selectedIds);
    if (newAction === "SKIP") {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Download Error Report
  const handleDownloadErrorReport = async () => {
    if (!analysis) return;
    try {
      const res = await fetch("/api/lab/catalogue/error-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: analysis.items }),
      });

      if (!res.ok) throw new Error("Failed to generate error report.");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Gyrex-Import-Validation-Report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Error downloading report: " + err.message);
    }
  };

  // Confirm Import
  const handleConfirmImport = async () => {
    if (!analysis || selectedIds.size === 0) return;

    setIsImporting(true);
    try {
      const confirmedList: ConfirmedImportItem[] = [];

      for (const item of analysis.items) {
        if (!selectedIds.has(item.id)) continue;
        if (!item.matchedMaster || !item.uploaded.sellingPrice || item.uploaded.sellingPrice <= 0) continue;

        const action = itemActions[item.id] || item.action;
        if (action === "SKIP") continue;

        confirmedList.push({
          masterTestId: item.matchedMaster.id,
          sellingPrice: item.uploaded.sellingPrice,
          mrpPrice: item.uploaded.mrp,
          isHomeCollectionAvailable: item.uploaded.isHomeCollection,
          isActive: item.uploaded.isActive,
          action,
        });
      }

      if (confirmedList.length === 0) {
        alert("No valid tests selected for import.");
        setIsImporting(false);
        return;
      }

      const res = await fetch("/api/lab/catalogue/confirm-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: confirmedList }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to commit import.");
      }

      setImportResult(data.result);
    } catch (err: any) {
      alert("Import failed: " + err.message);
    } finally {
      setIsImporting(false);
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
            Test Catalogue & Pricing Import
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Step 2 of your digital laboratory setup. Upload your investigation pricing in bulk.
          </p>
        </div>

        {/* 5-Step Progress Indicators */}
        <div className="mt-6 sm:mt-0 flex items-center justify-center space-x-2">
          {/* Step 1: Complete */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>1. Profile</span>
          </div>

          <div className="h-0.5 w-4 bg-slate-300" />

          {/* Step 2: Active */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700 ring-2 ring-blue-500/20">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white font-bold">
              2
            </span>
            <span>2. Catalogue</span>
          </div>

          <div className="h-0.5 w-4 bg-slate-200" />

          {/* Step 3: Locked */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-xs font-medium text-slate-400">
            <span>3. Packages</span>
          </div>

          <div className="h-0.5 w-4 bg-slate-200" />

          {/* Step 4: Locked */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-xs font-medium text-slate-400">
            <span>4. Payments</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* ── SUCCESS MODAL / BANNER (AFTER IMPORT) ───────────────────── */}
        {importResult && (
          <div className="rounded-2xl border border-emerald-200 bg-white p-8 shadow-xl shadow-emerald-500/5 text-center max-w-2xl mx-auto">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              Catalogue Successfully Imported!
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Your laboratory catalogue has been updated in your dedicated store database.
            </p>

            <div className="mt-6 grid grid-cols-3 gap-4 border border-slate-100 bg-slate-50 rounded-xl p-4 text-center">
              <div>
                <p className="text-2xl font-bold text-slate-900">{importResult.totalProcessed}</p>
                <p className="text-xs font-medium text-slate-500">Total Processed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{importResult.createdCount}</p>
                <p className="text-xs font-medium text-slate-500">New Tests Added</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{importResult.updatedCount}</p>
                <p className="text-xs font-medium text-slate-500">Prices Updated</p>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/lab/onboarding/packages"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
              >
                Continue to Health Packages
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/lab/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* ── STEP 1: DOWNLOAD OFFICIAL TEMPLATES ──────────────────────── */}
        {!importResult && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Guide Card */}
            <div className="md:col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 text-blue-600 font-semibold text-sm mb-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  <span>Official Templates</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Download & Enter Your Rates
                </h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Our official template comes pre-loaded with over 100 standard diagnostic tests. Simply fill in your laboratory&apos;s selling prices and re-upload.
                </p>
                <div className="mt-4 space-y-2 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Pre-matched Test Codes & Names</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Instructions sheet included</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Custom tests can be added</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2.5">
                <a
                  href="/api/lab/catalogue/template?format=xlsx"
                  download="Gyrex-Labs-Test-Price-Template.xlsx"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
                >
                  <Download className="h-4 w-4" />
                  Download Excel Template (.xlsx)
                </a>

                <a
                  href="/api/lab/catalogue/template?format=csv"
                  download="Gyrex-Labs-Test-Price-Template.csv"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  <FileText className="h-4 w-4 text-slate-500" />
                  Download CSV Template (.csv)
                </a>
              </div>
            </div>

            {/* Upload Dropzone Card */}
            <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5 text-slate-900 font-semibold text-sm">
                    <UploadCloud className="h-5 w-5 text-blue-600" />
                    <span>Upload Completed Spreadsheet</span>
                  </div>
                  {uploadedFileName && (
                    <span className="text-xs bg-blue-50 text-blue-700 font-medium px-2.5 py-1 rounded-full border border-blue-200">
                      Loaded: {uploadedFileName}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mb-4">
                  Drag and drop your filled Excel or CSV file. We&apos;ll automatically validate your prices, match test codes, and generate a review preview.
                </p>

                {uploadError && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Dropzone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center ${
                    isDragging
                      ? "border-blue-500 bg-blue-50/50"
                      : "border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                  />

                  {isUploading ? (
                    <div className="flex flex-col items-center">
                      <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mb-3" />
                      <p className="text-sm font-semibold text-slate-900">
                        Analyzing spreadsheet rows...
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Matching against Gyrex Test Master & validating prices
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-3">
                        <UploadCloud className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        XLSX, XLS, or CSV files up to 10 MB (max 5,000 tests)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Prices validated securely on server before saving
                </span>
                <Link
                  href="/lab/onboarding/packages"
                  className="text-slate-500 hover:text-slate-800 underline underline-offset-2"
                >
                  Skip for now &rarr;
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: IMPORT PREVIEW & VALIDATION DASHBOARD ────────────── */}
        {analysis && !importResult && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden space-y-6">
            {/* Summary Stat Cards */}
            <div className="p-6 border-b border-slate-200 bg-slate-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Import Preview & Analysis
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {analysis.totalRows} tests detected in file. Review matches, identify issues, and confirm import.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                    Re-upload
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadErrorReport}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-500" />
                    Download Issues Report (.csv)
                  </button>
                </div>
              </div>

              {/* 5 Metric Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div
                  onClick={() => setActiveTab("ALL")}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    activeTab === "ALL"
                      ? "border-slate-800 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                  }`}
                >
                  <p className="text-xs font-medium opacity-80">Total Rows</p>
                  <p className="text-2xl font-bold mt-1">{analysis.totalRows}</p>
                </div>

                <div
                  onClick={() => setActiveTab("READY")}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    activeTab === "READY"
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium opacity-90">Ready to Import</p>
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-bold mt-1">{analysis.readyCount}</p>
                </div>

                <div
                  onClick={() => setActiveTab("NEEDS_REVIEW")}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    activeTab === "NEEDS_REVIEW"
                      ? "border-amber-500 bg-amber-500 text-white"
                      : "border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium opacity-90">Needs Review</p>
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-bold mt-1">{analysis.needsReviewCount}</p>
                </div>

                <div
                  onClick={() => setActiveTab("UPDATES")}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    activeTab === "UPDATES"
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-blue-200 bg-blue-50 text-blue-800 hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium opacity-90">Price Updates</p>
                    <RefreshCw className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-bold mt-1">{analysis.updateCount}</p>
                </div>

                <div
                  onClick={() => setActiveTab("ERROR")}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    activeTab === "ERROR"
                      ? "border-red-600 bg-red-600 text-white"
                      : "border-red-200 bg-red-50 text-red-800 hover:border-red-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium opacity-90">Errors</p>
                    <XCircle className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-bold mt-1">{analysis.errorCount}</p>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                {(
                  [
                    { key: "ALL", label: `All (${analysis.totalRows})` },
                    { key: "READY", label: `Ready (${analysis.readyCount})` },
                    { key: "NEEDS_REVIEW", label: `Review (${analysis.needsReviewCount})` },
                    { key: "UPDATES", label: `Updates (${analysis.updateCount})` },
                    { key: "ERROR", label: `Errors (${analysis.errorCount})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
                      activeTab === tab.key
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by test name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Table of Rows */}
            <div className="overflow-x-auto border-t border-slate-200">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={areAllFilteredSelected}
                        onChange={toggleSelectAllFiltered}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                    </th>
                    <th className="py-3 px-3 w-14">Row</th>
                    <th className="py-3 px-4">Uploaded Test</th>
                    <th className="py-3 px-4">Gyrex Master Match</th>
                    <th className="py-3 px-4">Selling Price</th>
                    <th className="py-3 px-4">MRP</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Status & Issues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-500">
                        No rows match your selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const isSelected = selectedIds.has(item.id);
                      const currentAction = itemActions[item.id] || item.action;
                      const isError = item.status === "ERROR";
                      const isSelectable = !isError && item.matchedMaster !== null;

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50/80 transition ${
                            isSelected ? "bg-blue-50/30" : isError ? "bg-red-50/20" : ""
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              disabled={!isSelectable}
                              checked={isSelected}
                              onChange={() => toggleItemSelection(item.id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 disabled:opacity-30"
                            />
                          </td>

                          {/* Row Number */}
                          <td className="py-3 px-3 text-slate-400 font-mono">
                            #{item.rowNumber}
                          </td>

                          {/* Uploaded Test Code & Name */}
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">
                              {item.uploaded.name}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              {item.uploaded.code && (
                                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                                  {item.uploaded.code}
                                </span>
                              )}
                              {item.uploaded.sampleType && (
                                <span>{item.uploaded.sampleType}</span>
                              )}
                            </div>
                          </td>

                          {/* Central Master Match */}
                          <td className="py-3 px-4">
                            {item.matchedMaster ? (
                              <div>
                                <div className="font-medium text-slate-900 flex items-center gap-1.5">
                                  <span>{item.matchedMaster.name}</span>
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                      item.matchType === "EXACT_CODE" || item.matchType === "EXACT_NAME"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : item.matchType === "SYNONYM"
                                        ? "bg-indigo-100 text-indigo-800"
                                        : "bg-amber-100 text-amber-800"
                                    }`}
                                  >
                                    {item.matchType}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {item.matchedMaster.categoryName} • Code: {item.matchedMaster.code}
                                </div>
                              </div>
                            ) : (
                              <span className="text-amber-700 font-medium text-xs flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Unmatched in Master
                              </span>
                            )}
                          </td>

                          {/* Selling Price */}
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {item.uploaded.sellingPrice !== null ? (
                              <div>
                                <span>₹{item.uploaded.sellingPrice}</span>
                                {item.priceDifference && (
                                  <div className="text-[10px] text-blue-600 font-normal">
                                    was ₹{item.priceDifference.oldPrice}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-red-600 font-normal">Missing</span>
                            )}
                          </td>

                          {/* MRP */}
                          <td className="py-3 px-4 text-slate-600">
                            {item.uploaded.mrp !== null ? `₹${item.uploaded.mrp}` : "—"}
                          </td>

                          {/* Action Selector */}
                          <td className="py-3 px-4">
                            {item.existingLabTest ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleActionToggle(item.id, "UPDATE")}
                                  className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                                    currentAction === "UPDATE"
                                      ? "bg-blue-600 text-white"
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                  }`}
                                >
                                  Update
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleActionToggle(item.id, "SKIP")}
                                  className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                                    currentAction === "SKIP"
                                      ? "bg-slate-700 text-white"
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                  }`}
                                >
                                  Skip
                                </button>
                              </div>
                            ) : isSelectable ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700">
                                New Test
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">—</span>
                            )}
                          </td>

                          {/* Status & Issues */}
                          <td className="py-3 px-4">
                            {item.issues.length === 0 ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Ready
                              </span>
                            ) : (
                              <div className="space-y-1 max-w-xs">
                                {item.issues.map((iss, idx) => (
                                  <div
                                    key={idx}
                                    className={`text-[11px] leading-tight flex items-start gap-1 ${
                                      iss.type === "ERROR"
                                        ? "text-red-700 font-medium"
                                        : "text-amber-700"
                                    }`}
                                  >
                                    {iss.type === "ERROR" ? (
                                      <XCircle className="h-3 w-3 shrink-0 mt-0.5" />
                                    ) : (
                                      <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                                    )}
                                    <span>{iss.message}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions Bar */}
            <div className="p-6 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-600 flex items-center gap-2">
                <span className="font-semibold text-slate-900">
                  {selectedIds.size} of {analysis.totalRows} tests selected
                </span>
                <span>• Unmatched items or rows with errors cannot be imported.</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Link
                  href="/lab/onboarding/packages"
                  className="w-full sm:w-auto text-center px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Skip for Now
                </Link>

                <button
                  type="button"
                  disabled={selectedIds.size === 0 || isImporting}
                  onClick={handleConfirmImport}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Importing {selectedIds.size} Tests...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Import {selectedIds.size} Selected Tests
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
