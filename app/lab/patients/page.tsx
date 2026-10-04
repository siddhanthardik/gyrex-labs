"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/lab/EmptyState";

interface LabPatientItem {
  labPatientId: string;
  patientId: string;
  fullName: string;
  phone: string;
  email: string | null;
  gender: string;
  ageYears: number | null;
  uhid: string | null;
  totalOrdersCount: number;
  totalSpent: number;
  lastVisitAt: string;
  lastOrder: {
    orderNumber: string;
    createdAt: string;
    orderStatus: string;
    totalAmount: number;
  } | null;
  reportsSummary: {
    totalCount: number;
    hasReadyReport: boolean;
  };
}

export default function LabPatientsPage() {
  const [patients, setPatients] = useState<LabPatientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/lab/patients?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPatients(data.patients || []);
      }
    } catch (err) {
      console.error("Failed to load patients:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const openPatientDetail = async (labPatientId: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/lab/patients?labPatientId=${labPatientId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedPatient(data.patient);
      }
    } catch (err) {
      console.error("Failed to load patient detail:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Laboratory Patient Directory</h1>
        <p className="mt-1 text-sm text-slate-500">
          Patients who have booked tests or received diagnostic reports exclusively with your laboratory.
        </p>
      </div>

      {/* Search Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchPatients();
          }}
          className="flex items-center gap-3"
        >
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patients by name, mobile number, or email..."
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            Search
          </button>
        </form>
      </div>

      {/* Patients Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-16 text-slate-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
            <span className="ml-3 text-sm">Loading laboratory patients...</span>
          </div>
        ) : patients.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon="👥"
              title="No Patient Records Found"
              description="When patients book tests through your digital store, their laboratory profile and order history will appear here."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-600">
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Demographics</th>
                  <th className="py-3 px-4">Orders Count</th>
                  <th className="py-3 px-4">Last Visit</th>
                  <th className="py-3 px-4">Reports Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {patients.map((p) => (
                  <tr key={p.labPatientId} className="transition hover:bg-slate-50/60">
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{p.fullName}</p>
                      {p.uhid && (
                        <span className="font-mono text-[10px] text-slate-500">UHID: {p.uhid}</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-xs">
                      <p className="font-mono text-slate-900">{p.phone}</p>
                      {p.email && <p className="text-slate-500 truncate max-w-[150px]">{p.email}</p>}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {p.ageYears ? `${p.ageYears} yrs` : "N/A"} • {p.gender}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900">{p.totalOrdersCount}</span>
                      <span className="text-xs text-slate-500"> orders</span>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {new Date(p.lastVisitAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    <td className="py-3.5 px-4">
                      {p.reportsSummary.hasReadyReport ? (
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                          Ready ✓
                        </span>
                      ) : p.reportsSummary.totalCount > 0 ? (
                        <span className="text-xs text-amber-700 font-medium">In Progress</span>
                      ) : (
                        <span className="text-xs text-slate-400">No Reports</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openPatientDetail(p.labPatientId)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                      >
                        View History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Patient Detail Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 space-y-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedPatient.fullName}</h3>
                <p className="text-xs text-slate-500">
                  {selectedPatient.phone} • {selectedPatient.gender}
                  {selectedPatient.bloodGroup && ` • Blood Group: ${selectedPatient.bloodGroup}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {/* Orders with this Lab */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Diagnostic Orders with Your Lab ({selectedPatient.orders.length})
              </h4>
              <div className="space-y-2">
                {selectedPatient.orders.map((o: any) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs"
                  >
                    <div>
                      <Link
                        href={`/lab/orders/${o.orderNumber}`}
                        className="font-mono font-bold text-sky-700 hover:underline"
                      >
                        {o.orderNumber}
                      </Link>
                      <p className="text-slate-700 mt-0.5">{o.tests.join(", ")}</p>
                      <span className="text-[10px] text-slate-500">
                        {new Date(o.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-slate-900">₹{o.totalAmount}</p>
                      <span className="text-[10px] text-slate-500">{o.orderStatus}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
