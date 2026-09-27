"use client";

import { useState } from "react";
import { FileText, Search, ShieldCheck, Download, Lock, AlertCircle } from "lucide-react";

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
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">My Reports</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Enter your booking ID and registered mobile number to access your diagnostic reports.
        </p>
      </div>

      {/* Security Notice */}
      <div className="mb-5 rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-950/30">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-600 dark:text-sky-400" />
          <p className="text-xs text-sky-800 dark:text-sky-200">
            <strong>Secure Access Only.</strong> Reports are protected by your registered phone
            number. Your diagnostic results are strictly private and never shared without
            your verification.
          </p>
        </div>
      </div>

      {/* Lookup Form */}
      <form
        onSubmit={handleSearch}
        className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor="orderNumber"
              className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400"
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
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 font-mono text-sm uppercase tracking-wide focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-sky-600"
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400"
            >
              Registered Mobile Number *
            </label>
            <input
              id="phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter your 10-digit mobile number"
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-sky-600"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 py-3 text-sm font-bold text-white hover:bg-sky-500 transition disabled:opacity-60"
        >
          {loading ? (
            <>
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/50 border-t-white" />
              Verifying…
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Access My Reports
            </>
          )}
        </button>
      </form>

      {/* Reports list */}
      {reports !== null && (
        <div className="mt-6">
          {reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white py-14 text-center dark:border-zinc-700 dark:bg-zinc-900">
              <FileText className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
              <h3 className="mt-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                No Reports Ready Yet
              </h3>
              <p className="mt-1 max-w-xs text-xs text-zinc-500 dark:text-zinc-400">
                Your reports are being processed. Please check back in a few hours or contact the
                laboratory directly.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                {reports.length} {reports.length === 1 ? "report" : "reports"} found for booking{" "}
                <span className="font-mono text-zinc-700 dark:text-zinc-300">
                  {reports[0].orderNumber}
                </span>
              </p>

              {reports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-sky-600" />
                        <span className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
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
                        Patient: {report.patientName} • {report.labName}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-1">
                        {report.testNames.map((test, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                          >
                            {test}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {report.releasedAt && (
                        <p className="text-[10px] text-zinc-400">
                          Released{" "}
                          {new Date(report.releasedAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          // Download route is authenticated by phone; open in new tab
                          const url = `/api/patient/reports/${report.id}?phone=${encodeURIComponent(phone)}`;
                          window.open(url, "_blank");
                        }}
                        className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-sky-500 transition"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-400">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                Reports are securely encrypted and verified by {reports[0]?.labName}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
