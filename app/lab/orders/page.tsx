"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/lab/StatusBadge";
import { EmptyState } from "@/components/lab/EmptyState";
import { OrderStatus, PaymentStatus, CollectionType } from "@prisma/client";

export default function LabOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [paymentFilter, setPaymentFilter] = useState<string>("");
  const [collectionFilter, setCollectionFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("orderStatus", statusFilter);
      if (paymentFilter) params.set("paymentStatus", paymentFilter);
      if (collectionFilter) params.set("collectionType", collectionFilter);
      params.set("page", page.toString());

      const res = await fetch(`/api/lab/orders?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, paymentFilter, collectionFilter, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Diagnostic Orders</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track and process patient bookings exclusively for your laboratory.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order ID, patient name, or mobile number..."
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
          />

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
            >
              <option value="">All Order Statuses</option>
              {Object.values(OrderStatus).map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>

            <select
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
            >
              <option value="">All Payment Statuses</option>
              {Object.values(PaymentStatus).map((p) => (
                <option key={p} value={p}>
                  {p.replace(/_/g, " ")}
                </option>
              ))}
            </select>

            <select
              value={collectionFilter}
              onChange={(e) => {
                setCollectionFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
            >
              <option value="">All Collection Types</option>
              <option value="HOME_COLLECTION">Home Collection</option>
              <option value="LAB_VISIT">Lab Visit</option>
            </select>

            <button
              type="submit"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
            >
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* Orders Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-16 text-slate-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
            <span className="ml-3 text-sm">Loading orders...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon="📦"
              title="No Diagnostic Orders Found"
              description="No orders match your filter criteria. When patients book tests, they will appear here."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-600">
                  <th className="py-3 px-4">Order ID & Date</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Tests Booked</th>
                  <th className="py-3 px-4">Collection</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Reports</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {orders.map((o) => (
                  <tr key={o.id} className="transition hover:bg-slate-50/60">
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/lab/orders/${o.orderNumber}`}
                        className="font-mono font-bold text-sky-700 hover:underline"
                      >
                        {o.orderNumber}
                      </Link>
                      <p className="text-[11px] text-slate-500">
                        {new Date(o.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{o.patientName}</p>
                      <p className="text-xs text-slate-500">{o.patientPhone}</p>
                    </td>

                    <td className="py-3.5 px-4 max-w-[200px]">
                      <p className="truncate text-xs text-slate-700" title={o.tests.join(", ")}>
                        {o.tests.join(", ")}
                      </p>
                      <span className="text-[10px] text-slate-500">{o.itemCount} items</span>
                    </td>

                    <td className="py-3.5 px-4 text-xs">
                      {o.collectionType === "HOME_COLLECTION" ? (
                        <div>
                          <span className="text-sky-700 font-medium">🏠 Home Visit</span>
                          {o.collection?.scheduledSlot && (
                            <p className="text-[11px] text-slate-500">{o.collection.scheduledSlot}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600">🏥 Lab Visit</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      ₹{o.totalAmount.toLocaleString("en-IN")}
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={o.paymentStatus} type="payment" />
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={o.orderStatus} type="order" />
                    </td>

                    <td className="py-3.5 px-4">
                      {o.hasReadyReport ? (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                          Ready ✓
                        </span>
                      ) : o.reportsCount > 0 ? (
                        <span className="text-xs text-amber-700 font-medium">Draft</span>
                      ) : (
                        <span className="text-xs text-slate-400">Pending</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/lab/orders/${o.orderNumber}`}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                      >
                        Manage →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-4 py-3">
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
