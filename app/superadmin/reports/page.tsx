"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { SuperadminStatusBadge } from "@/components/superadmin/SuperadminStatusBadge";
import { SuperadminStatCard } from "@/components/superadmin/SuperadminStatCard";
import { ConfirmationModal } from "@/components/superadmin/ConfirmationModal";
import { FileText, CheckCircle, Clock, Edit, Search } from "lucide-react";

interface ReportItem {
  id: string;
  reportNumber: string;
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  labId: string;
  labName: string;
  patientName: string;
  patientPhone: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: string;
  uploadedAt: string;
  releasedAt: string | null;
  deliveredViaEmailAt: string | null;
  deliveredViaWhatsappAt: string | null;
  viewCount: number;
  lastAccessedAt: string | null;
}

export default function SuperadminReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    draftCount: 0,
    finalCount: 0,
    amendedCount: 0,
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  // Audited inspection modal
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/superadmin/reports?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch reports");
      const json = await res.json();
      setReports(json.reports || []);
      setStats(json.stats || { total: 0, draftCount: 0, finalCount: 0, amendedCount: 0 });
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [statusFilter]);

  const handleAuditInspection = async (reason: string) => {
    if (!selectedReport) return;
    setIsAuditing(true);
    try {
      const res = await fetch("/api/superadmin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: selectedReport.id, reason }),
      });
      if (!res.ok) throw new Error("Failed to audit inspection");
      alert(`Audit logged for report ${selectedReport.reportNumber}. Note: As an operational governance platform, Gyrex does not edit clinical test results.`);
      setSelectedReport(null);
    } catch (err: unknown) {
      const e = err as Error;
      alert(e.message || "Audit record failed.");
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Platform Diagnostic Reports</h1>
        <p className="mt-1 text-xs text-slate-500">
          Cross-tenant operational monitoring of patient diagnostic report delivery and delivery diagnostics.
        </p>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <SuperadminStatCard
          title="Total Reports Generated"
          value={stats.total}
          subtitle="Uploaded clinical PDF documents"
          icon={<FileText className="w-4 h-4" />}
        />
        <SuperadminStatCard
          title="Final Reports Released"
          value={stats.finalCount}
          subtitle="Delivered or ready for patient"
          badgeVariant="success"
          icon={<CheckCircle className="w-4 h-4" />}
        />
        <SuperadminStatCard
          title="Draft / In-Progress"
          value={stats.draftCount}
          subtitle="Pending release by lab pathologist"
          badgeVariant="warning"
          icon={<Clock className="w-4 h-4" />}
        />
        <SuperadminStatCard
          title="Amended Reports"
          value={stats.amendedCount}
          subtitle="Revised by laboratory with audit log"
          badgeVariant="info"
          icon={<Edit className="w-4 h-4" />}
        />
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search report number (e.g. RPT-2026-0001), order number, or patient..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none shadow-sm"
          />
        </div>

        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none shadow-sm"
          >
            <option value="">All Statuses</option>
            <option value="FINAL">FINAL</option>
            <option value="DRAFT">DRAFT</option>
            <option value="AMENDED">AMENDED</option>
          </select>
        </div>

        <button
          type="button"
          onClick={fetchReports}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
        >
          Refresh
        </button>
      </div>

      {/* Reports Table */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">Loading diagnostic report records...</div>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-12 text-center">
          <p className="text-sm font-semibold text-slate-900">No Diagnostic Reports Match Filter</p>
          <p className="mt-1 text-xs text-slate-500">Reports will appear here once partner laboratories upload diagnostic PDF documents.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-4 py-3">Report Number</th>
                <th className="px-4 py-3">Order Number</th>
                <th className="px-4 py-3">Laboratory</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">File Asset</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Release Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-4 py-3 font-mono font-bold text-sky-700">
                    {r.reportNumber}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/superadmin/orders/${r.orderId}`} className="font-mono text-sky-700 hover:underline">
                      {r.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {r.labName}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-900">{r.patientName}</p>
                    <p className="text-[10px] text-slate-500">{r.patientPhone}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    <span className="truncate block max-w-xs">{r.fileName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {(r.fileSize / 1024).toFixed(1)} KB
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <SuperadminStatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {r.releasedAt ? new Date(r.releasedAt).toLocaleString() : "Not released"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedReport(r)}
                      className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                    >
                      <Search className="w-3 h-3 text-slate-500" />
                      <span>Audit Inspect</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Audited Inspection Modal */}
      {selectedReport && (
        <ConfirmationModal
          isOpen={true}
          title={`Audit Logged Inspection: ${selectedReport.reportNumber}`}
          description={`Viewing report metadata and dispatch history for order ${selectedReport.orderNumber} (${selectedReport.patientName}). As an operational platform administrator, your inspection will be recorded in the immutable audit log.`}
          confirmButtonText="Log & View Diagnostics"
          confirmVariant="primary"
          onConfirm={handleAuditInspection}
          onClose={() => setSelectedReport(null)}
          isLoading={isAuditing}
        />
      )}
    </div>
  );
}
