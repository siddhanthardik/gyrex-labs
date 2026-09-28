"use client";

import { useState } from "react";
import { FileText, Search, ShieldCheck, Download, Lock, AlertCircle, Sparkles } from "lucide-react";

interface ReportItem {
  id: string;
  reportNumber: string;
  orderNumber: string;
  labName: string;
  patientName: string;
  status: string;
  releasedAt: string | null;
  uploadedAt: string;
  testNames: string[];
}

export default function ReportsPage({
  searchParams,
}: {
  params?: { labSlug: string };
  searchParams?: { orderNumber?: string };
}) {
  const defaultOrderNumber = searchParams?.orderNumber || "";

  const [orderNumber, setOrderNumber] = useState(defaultOrderNumber);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<ReportItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setReports(null);

    if (!orderNumber.trim() || !phone.trim()) {
      setError("Please enter both your Booking ID and registered mobile number.");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        orderNumber: orderNumber.trim(),
        phone: phone.trim(),
      });

      const res = await fetch(`/api/patient/reports?${params}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to find reports for this booking.");
      }

      setReports(data.reports);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-4 sm:px-6 space-y-4">
      {/* Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-sky-800 to-sky-700 p-5 text-white shadow-md">
        <div className="flex items-center gap-1.5 text-xs font-bold text-sky-200">
          <FileText className="h-4 w-4" />
          <span>Patient Portal</span>
        </div>
        <h1 className="mt-1 text-xl font-extrabold text-white">Download Test Reports</h1>
        <p className="mt-1 text-xs text-sky-100 leading-relaxed">
          Access and download verified diagnostic reports using your Booking ID and registered phone number.
        </p>
      </div>

      {/* Security notice */}
      <div className="flex items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 p-3.5 text-xs text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200">
        <Lock className="h-4 w-4 shrink-0 text-sky-700 dark:text-sky-400 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold">Protected Health Information</p>
          <p className="text-[11px] text-sky-800/80 dark:text-sky-300">
            Reports require mobile verification to ensure patient medical confidentiality.
          </p>
        </div>
      </div>

      {/* Lookup Form */}
      <form
        onSubmit={handleSearch}
        className="rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-3.5"
      >
        <div>
          <label
            htmlFor="orderNumber"
            className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1"
          >
            Booking ID *
          </label>
          <input
            id="orderNumber"
            type="text"
            required
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
            placeholder="e.g. GYR-2026-12345678"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 font-mono text-sm uppercase tracking-wide text-zinc-900 placeholder:text-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-sky-600"
          />
        </div>

        <div>
          <label
            htmlFor="phone"
            className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1"
          >
            Registered Mobile Number *
          </label>
          <input
            id="phone"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="10-digit mobile number"
            maxLength={10}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-sky-600"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-700 py-3.5 text-xs font-bold text-white shadow-md hover:bg-sky-600 active:scale-[0.99] transition disabled:opacity-60"
        >
          {loading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Verifying Booking…</span>
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              <span>Access &amp; View Reports</span>
            </>
          )}
        </button>
      </form>

      {/* Reports Results */}
      {reports !== null && (
        <div className="space-y-3">
          {reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300 bg-white py-12 px-4 text-center dark:border-zinc-800 dark:bg-zinc-900">
              <FileText className="h-10 w-10 text-zinc-300 dark:text-zinc-600" />
              <h3 className="mt-3 text-sm font-bold text-zinc-900 dark:text-white">
                No Reports Ready Yet
              </h3>
              <p className="mt-1 max-w-xs text-xs text-zinc-500 dark:text-zinc-400">
                Your samples may still be undergoing laboratory analysis. Please check back shortly.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400 px-1">
                {reports.length} {reports.length === 1 ? "report" : "reports"} found for{" "}
                <span className="font-mono text-zinc-900 dark:text-white">
                  {reports[0].orderNumber}
                </span>
              </p>

              {reports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-sky-600" />
                        <span className="font-mono text-xs font-bold text-zinc-900 dark:text-white">
                          {report.reportNumber}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            report.status === "FINAL" || report.status === "AMENDED"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                          }`}
                        >
                          {report.status}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Patient: <strong>{report.patientName}</strong> • {report.labName}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-1">
                        {report.testNames.map((test, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          >
                            {test}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {report.releasedAt && (
                        <p className="text-[10px] text-zinc-400">
                          {new Date(report.releasedAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const url = `/api/patient/reports/${report.id}?phone=${encodeURIComponent(phone)}`;
                          window.open(url, "_blank");
                        }}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 transition"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>PDF</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-400 pt-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Digitally signed and certified reports</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
