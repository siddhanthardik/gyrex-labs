"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/lab/StatusBadge";
import { EmptyState } from "@/components/lab/EmptyState";
import { ReportStatus } from "@prisma/client";

interface ReportItem {
  id: string;
  reportNumber: string;
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  patientName: string;
  patientPhone: string;
  testsSummary: string;
  status: ReportStatus;
  uploadedAt: string;
  releasedAt: string | null;
  fileName: string;
  fileSize: number;
  viewCount: number;
  lastAccessedAt: string | null;
}

export default function LabReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadOrderId, setUploadOrderId] = useState("");
  const [fileName, setFileName] = useState("");
  const [releasedNow, setReleasedNow] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/lab/reports?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [statusFilter]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadOrderId.trim() || (!fileName.trim() && !selectedFile)) {
      setNotification({ type: "error", message: "Order ID and report file (or name) are required." });
      return;
    }

    setUploading(true);
    setNotification(null);

    try {
      const formData = new FormData();
      formData.append("action", "UPLOAD");
      formData.append("orderId", uploadOrderId.trim());
      formData.append("releasedNow", releasedNow ? "true" : "false");

      if (selectedFile) {
        formData.append("file", selectedFile);
      } else {
        const validName = fileName.trim().endsWith(".pdf") ? fileName.trim() : `${fileName.trim()}.pdf`;
        const blob = new Blob([`%PDF-1.4\n% Diagnostic Report: ${validName}`], { type: "application/pdf" });
        formData.append("file", new File([blob], validName, { type: "application/pdf" }));
      }

      const res = await fetch("/api/lab/reports", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to upload report.");
      }

      setNotification({ type: "success", message: "Report successfully uploaded and associated with order." });
      setShowUploadModal(false);
      setUploadOrderId("");
      setFileName("");
      setSelectedFile(null);
      fetchReports();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Failed to upload report." });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with CTA */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Diagnostic Report Delivery</h1>
          <p className="mt-1 text-sm text-slate-500">
            Securely upload, release, and monitor diagnostic PDF reports. Gyrex Labs is not an LIS; clinical reporting remains your laboratory&apos;s responsibility.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-600 transition"
        >
          <span>+ Upload & Associate Report</span>
        </button>
      </div>

      {notification && (
        <div
          className={`rounded-xl p-4 text-xs font-medium border ${
            notification.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-700"
              : "bg-emerald-50 border-emerald-200 text-emerald-700"
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchReports();
          }}
          className="flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reports by report ID (RPT-...), order number, or patient name..."
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
          >
            <option value="">All Report Statuses</option>
            {Object.values(ReportStatus).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Reports Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-16 text-slate-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
            <span className="ml-3 text-sm">Loading diagnostic reports...</span>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon="📄"
              title="No Diagnostic Reports Uploaded"
              description="Attach clinical PDF reports generated from your LIS to patient orders."
              actionText="+ Upload First Report"
              onAction={() => setShowUploadModal(true)}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-600">
                  <th className="py-3 px-4">Report Number</th>
                  <th className="py-3 px-4">Order Number</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">File Name</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Uploaded Date</th>
                  <th className="py-3 px-4">Patient Views</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {reports.map((r) => (
                  <tr key={r.id} className="transition hover:bg-slate-50/60">
                    <td className="py-3.5 px-4 font-mono font-bold text-sky-700">
                      {r.reportNumber}
                    </td>

                    <td className="py-3.5 px-4">
                      <Link
                        href={`/lab/orders/${r.orderNumber}`}
                        className="font-mono text-xs text-sky-700 hover:underline"
                      >
                        {r.orderNumber}
                      </Link>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{r.patientName}</p>
                      <p className="text-xs text-slate-500">{r.patientPhone}</p>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-700">
                      {r.fileName}
                      <span className="ml-1 text-[10px] text-slate-500">
                        ({Math.round(r.fileSize / 1024)} KB)
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={r.status} type="report" />
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {new Date(r.uploadedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    <td className="py-3.5 px-4 text-xs">
                      <span className="font-semibold text-slate-900">{r.viewCount}</span>
                      <span className="text-slate-500"> views</span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/lab/orders/${r.orderNumber}`}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                      >
                        View Order
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">Upload Diagnostic Report</h3>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Booking Order ID (or Database Order ID) *
                </label>
                <input
                  type="text"
                  required
                  value={uploadOrderId}
                  onChange={(e) => setUploadOrderId(e.target.value)}
                  placeholder="e.g. GYR-2026-0001"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Select Diagnostic Report (PDF)
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setSelectedFile(file);
                    if (file && !fileName) {
                      setFileName(file.name);
                    }
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:border-sky-500 focus:outline-none file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Report File Name *
                </label>
                <input
                  type="text"
                  required
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="e.g. Sharma_Lab_Report_CBC.pdf"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={releasedNow}
                  onChange={(e) => setReleasedNow(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
                />
                <span className="text-xs text-slate-700">
                  Release immediately to patient (Sets status to FINAL)
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="rounded-lg bg-sky-500 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-600 transition disabled:opacity-50"
                >
                  {uploading ? "Saving Report..." : "Attach Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
