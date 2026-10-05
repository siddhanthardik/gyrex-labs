"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  RefreshCw,
  Trash2,
  Search,
  Check,
  FileDown,
  Info,
} from "lucide-react";
import {
  AnalyzedImportItem,
  BulkImportAnalysisResult,
  ConfirmedImportItem,
} from "@/services/lab/catalogue-import-service";

export default function BulkImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);

  const [analysis, setAnalysis] = useState<BulkImportAnalysisResult | null>(null);
  const [items, setItems] = useState<AnalyzedImportItem[]>([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [tabFilter, setTabFilter] = useState<"ALL" | "READY" | "NEEDS_REVIEW" | "ERROR">("ALL");

  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const ext = file.name.toLowerCase();
    if (!ext.endsWith(".xlsx") && !ext.endsWith(".xls") && !ext.endsWith(".csv")) {
      setNotification({
        type: "error",
        message: "Please select an Excel (.xlsx, .xls) or CSV (.csv) file.",
      });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setNotification({
        type: "error",
        message: "File exceeds 10 MB limit. Please select a smaller file.",
      });
      return;
    }
    setSelectedFile(file);
    setNotification(null);
  };

  const handleUploadAndAnalyze = async () => {
    if (!selectedFile) return;

    setAnalyzing(true);
    setNotification(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/lab/catalogue/import-file", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to analyze the uploaded file.");
      }

      const data = await res.json();
      setAnalysis(data.analysis);
      setItems(data.analysis.items || []);
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to parse and analyze file.",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!analysis) return;
    setConfirming(true);
    setNotification(null);

    try {
      // Filter items ready to be imported (have matchedMaster, valid price, action is not SKIP)
      const confirmed: ConfirmedImportItem[] = items
        .filter(
          (item) =>
            item.matchedMaster !== null &&
            item.action !== "SKIP" &&
            item.uploaded.sellingPrice !== null &&
            item.uploaded.sellingPrice > 0
        )
        .map((item) => ({
          masterTestId: item.matchedMaster!.id,
          sellingPrice: Number(item.uploaded.sellingPrice),
          mrpPrice: item.uploaded.mrp ? Number(item.uploaded.mrp) : null,
          isHomeCollectionAvailable: item.uploaded.isHomeCollection,
          isActive: item.uploaded.isActive,
          action: item.action,
        }));

      if (confirmed.length === 0) {
        throw new Error("No matched tests with valid selling prices are ready to import.");
      }

      const res = await fetch("/api/lab/catalogue/confirm-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: confirmed }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Import confirmation failed.");
      }

      const data = await res.json();
      setNotification({
        type: "success",
        message: `Successfully imported ${data.result.totalProcessed} diagnostic tests (${data.result.createdCount} new, ${data.result.updatedCount} updated) to your catalogue!`,
      });

      setTimeout(() => {
        router.push("/lab/catalogue");
      }, 1500);
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to confirm catalogue import.",
      });
    } finally {
      setConfirming(false);
    }
  };

  const handleDownloadErrorReport = async () => {
    if (!items.length) return;
    setDownloadingReport(true);
    try {
      const res = await fetch("/api/lab/catalogue/error-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (!res.ok) throw new Error("Failed to generate error report.");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Gyrex-Import-Validation-Report.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to download error report.",
      });
    } finally {
      setDownloadingReport(false);
    }
  };

  const handleToggleAction = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextAction = item.action === "SKIP" ? "CREATE" : "SKIP";
          return { ...item, action: nextAction };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setAnalysis(null);
    setItems([]);
    setSearchFilter("");
    setNotification(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Filtered preview items
  const filteredItems = items.filter((item) => {
    if (tabFilter !== "ALL" && item.status !== tabFilter) {
      return false;
    }
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const nameMatch = item.uploaded.name?.toLowerCase().includes(q);
      const codeMatch = item.uploaded.code?.toLowerCase().includes(q);
      const masterNameMatch = item.matchedMaster?.name?.toLowerCase().includes(q);
      const masterCodeMatch = item.matchedMaster?.code?.toLowerCase().includes(q);
      return nameMatch || codeMatch || masterNameMatch || masterCodeMatch;
    }
    return true;
  });

  const importableCount = items.filter(
    (i) => i.matchedMaster && i.action !== "SKIP" && i.uploaded.sellingPrice && i.uploaded.sellingPrice > 0
  ).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/lab/catalogue"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <span>← Back to Catalogue</span>
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          Bulk Catalogue Import
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Upload your laboratory&apos;s existing test list in Excel or CSV. We will match it
          against the Gyrex Test Master and let you review the results before anything is added.
        </p>
      </div>

      {notification && (
        <div
          className={`rounded-xl p-4 text-xs font-medium border flex items-start gap-2.5 ${
            notification.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-700"
              : notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-sky-50 border-sky-200 text-sky-700"
          }`}
        >
          {notification.type === "error" ? (
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          ) : notification.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <Info className="h-4 w-4 shrink-0 text-sky-600 mt-0.5" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Stage 1: File Upload */}
      {!analysis && (
        <div className="space-y-6">
          {/* Main Dropzone Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Upload Spreadsheet</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Supported formats: Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv). Maximum size: 10 MB.
                </p>
              </div>

              {/* Template Downloads */}
              <div className="flex items-center gap-2">
                <a
                  href="/api/lab/catalogue/template?format=xlsx"
                  download="Gyrex-Labs-Test-Price-Template.xlsx"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 transition"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                  <span>Excel Template (.xlsx)</span>
                </a>
                <a
                  href="/api/lab/catalogue/template?format=csv"
                  download="Gyrex-Labs-Test-Price-Template.csv"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 transition"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                  <span>CSV Template (.csv)</span>
                </a>
              </div>
            </div>

            {/* Dropzone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition ${
                dragActive
                  ? "border-sky-500 bg-sky-50/50"
                  : selectedFile
                  ? "border-emerald-400 bg-emerald-50/20"
                  : "border-slate-300 bg-slate-50/50 hover:border-slate-400 hover:bg-slate-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedFile ? (
                <div className="flex flex-col items-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-xs">
                    <FileSpreadsheet className="h-7 w-7" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-900">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {(selectedFile.size / 1024).toFixed(1)} KB • Ready for analysis
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      resetUpload();
                    }}
                    className="mt-3 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-rose-600 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Choose different file</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 shadow-xs">
                    <UploadCloud className="h-7 w-7" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-900">
                    Click to browse or drag and drop your spreadsheet here
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Columns: Test Name, Test Code, Selling Price, MRP, Home Collection.
                  </p>
                </div>
              )}
            </div>

            {/* Safety Guarantee Notice */}
            <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-4 flex items-start gap-3">
              <Info className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 space-y-0.5">
                <p className="font-semibold text-slate-900">Zero Database Changes During Preview</p>
                <p>
                  Your file will be safely parsed and matched against the Gyrex Test Master in preview mode.
                  You can inspect matched investigations, adjust actions, and confirm prices before anything is written to your database.
                </p>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={!selectedFile || analyzing}
                onClick={handleUploadAndAnalyze}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-6 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-sky-600 transition disabled:opacity-50 cursor-pointer"
              >
                {analyzing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Analyzing Investigations...</span>
                  </>
                ) : (
                  <>
                    <span>Upload & Preview Matches</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stage 2: Preview, Review & Confirmation */}
      {analysis && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Total Rows</span>
              <p className="mt-1 text-2xl font-bold text-slate-900">{analysis.totalRows}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs">
              <span className="text-xs font-medium text-emerald-800">Auto-Matched</span>
              <p className="mt-1 text-2xl font-bold text-emerald-700">{analysis.readyCount}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 shadow-xs">
              <span className="text-xs font-medium text-amber-800">Needs Review</span>
              <p className="mt-1 text-2xl font-bold text-amber-700">{analysis.needsReviewCount}</p>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 shadow-xs">
              <span className="text-xs font-medium text-rose-800">Validation Errors</span>
              <p className="mt-1 text-2xl font-bold text-rose-700">{analysis.errorCount}</p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetUpload}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
                <span>Upload Another File</span>
              </button>

              {(analysis.errorCount > 0 || analysis.needsReviewCount > 0) && (
                <button
                  type="button"
                  disabled={downloadingReport}
                  onClick={handleDownloadErrorReport}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
                >
                  <FileDown className="h-3.5 w-3.5 text-slate-500" />
                  <span>{downloadingReport ? "Generating..." : "Download Issue Report (.csv)"}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">
                Ready to import: <strong className="text-slate-900">{importableCount}</strong> tests
              </span>
              <button
                type="button"
                disabled={confirming || importableCount === 0}
                onClick={handleConfirmImport}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-600 transition disabled:opacity-50"
              >
                {confirming ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Importing Catalogue...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Confirm & Import ({importableCount}) Tests</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Filter Tabs */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-xs shadow-xs">
              <button
                type="button"
                onClick={() => setTabFilter("ALL")}
                className={`rounded-md px-3 py-1 font-medium transition ${
                  tabFilter === "ALL"
                    ? "bg-slate-100 text-slate-900 font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Rows ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setTabFilter("READY")}
                className={`rounded-md px-3 py-1 font-medium transition ${
                  tabFilter === "READY"
                    ? "bg-emerald-50 text-emerald-800 font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Ready ({items.filter((i) => i.status === "READY").length})
              </button>
              <button
                type="button"
                onClick={() => setTabFilter("NEEDS_REVIEW")}
                className={`rounded-md px-3 py-1 font-medium transition ${
                  tabFilter === "NEEDS_REVIEW"
                    ? "bg-amber-50 text-amber-800 font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Needs Review ({items.filter((i) => i.status === "NEEDS_REVIEW").length})
              </button>
              {analysis.errorCount > 0 && (
                <button
                  type="button"
                  onClick={() => setTabFilter("ERROR")}
                  className={`rounded-md px-3 py-1 font-medium transition ${
                    tabFilter === "ERROR"
                      ? "bg-rose-50 text-rose-800 font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Errors ({items.filter((i) => i.status === "ERROR").length})
                </button>
              )}
            </div>

            {/* Search Filter */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search uploaded or matched test..."
                className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Detailed Review Table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-600">
                    <th className="py-3 px-4">Row #</th>
                    <th className="py-3 px-4">Uploaded Test & Pricing</th>
                    <th className="py-3 px-4">Matched Gyrex Master Test</th>
                    <th className="py-3 px-4">Match Confidence</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4 text-right">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-slate-500">
                        No rows found matching the current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={item.id} className="transition hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-mono text-xs text-slate-500">
                          #{item.rowNumber}
                        </td>

                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900">{item.uploaded.name}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                            {item.uploaded.code && (
                              <span className="font-mono text-[11px] text-slate-600">
                                {item.uploaded.code}
                              </span>
                            )}
                            <span>•</span>
                            <span>
                              Price:{" "}
                              <strong className="text-slate-900">
                                {item.uploaded.sellingPrice !== null
                                  ? `₹${item.uploaded.sellingPrice}`
                                  : "Missing"}
                              </strong>
                            </span>
                            {item.uploaded.mrp && (
                              <span className="text-slate-400">MRP: ₹{item.uploaded.mrp}</span>
                            )}
                          </div>
                          {item.issues.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {item.issues.map((iss, i) => (
                                <p
                                  key={i}
                                  className={`text-[11px] ${
                                    iss.type === "ERROR" ? "text-rose-600" : "text-amber-600"
                                  }`}
                                >
                                  {iss.type === "ERROR" ? "✕" : "⚠"} {iss.message}
                                </p>
                              ))}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {item.matchedMaster ? (
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-sky-700">
                                  {item.matchedMaster.code}
                                </span>
                                <span className="font-medium text-slate-900">
                                  {item.matchedMaster.name}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {item.matchedMaster.categoryName} • {item.matchedMaster.sampleType} • {item.matchedMaster.standardTatHours}h TAT
                              </p>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium">
                              <XCircle className="h-4 w-4" />
                              <span>No Gyrex Master Match</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                                item.confidence >= 0.95
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : item.confidence >= 0.75
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                              }`}
                            >
                              {Math.round(item.confidence * 100)}%
                            </span>
                            <span className="text-[11px] text-slate-500">{item.matchReason}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleAction(item.id)}
                            className={`rounded-md px-2 py-1 text-[11px] font-semibold border transition ${
                              item.action === "SKIP"
                                ? "bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200"
                                : item.action === "UPDATE"
                                ? "bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100"
                                : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          >
                            {item.action === "SKIP"
                              ? "Skip"
                              : item.action === "UPDATE"
                              ? "Update Price"
                              : "Create"}
                          </button>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600 transition"
                            title="Ignore row"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
