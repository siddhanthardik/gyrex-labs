import React from "react";
import Link from "next/link";
import { getAllPlatformOrders } from "@/services/superadmin/orders-service";
import { SuperadminStatusBadge } from "@/components/superadmin/SuperadminStatusBadge";
import { SuperadminEmptyState } from "@/components/superadmin/SuperadminEmptyState";
import { OrderStatus, PaymentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    labId?: string;
    status?: string;
    paymentStatus?: string;
    page?: string;
  }>;
}

export default async function SuperadminOrdersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.search;
  const labId = params.labId;
  const statusParam = params.status;
  const paymentStatusParam = params.paymentStatus;
  const page = params.page ? parseInt(params.page, 10) : 1;

  let status: OrderStatus | undefined;
  if (statusParam && Object.values(OrderStatus).includes(statusParam as OrderStatus)) {
    status = statusParam as OrderStatus;
  }

  let paymentStatus: PaymentStatus | undefined;
  if (paymentStatusParam && Object.values(PaymentStatus).includes(paymentStatusParam as PaymentStatus)) {
    paymentStatus = paymentStatusParam as PaymentStatus;
  }

  const { orders, total, totalPages } = await getAllPlatformOrders({
    search,
    labId,
    status,
    paymentStatus,
    page,
    pageSize: 20,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Diagnostic Orders ({total})</h1>
        <p className="mt-1 text-xs text-slate-500">
          Cross-tenant visibility into diagnostic test bookings across all participating laboratories.
        </p>
      </div>

      {/* Filters */}
      <form method="GET" className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-4 shadow-xs">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Search Order or Patient
          </label>
          <input
            type="text"
            name="search"
            defaultValue={search || ""}
            placeholder="Order number, phone..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Order Status
          </label>
          <select
            name="status"
            defaultValue={status || ""}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="REPORT_READY">REPORT_READY</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Payment Status
          </label>
          <select
            name="paymentStatus"
            defaultValue={paymentStatus || ""}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none"
          >
            <option value="">All Payments</option>
            <option value="PAID">PAID</option>
            <option value="PENDING">PENDING</option>
            <option value="REFUNDED">REFUNDED</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-lg bg-sky-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-sky-600 transition shadow-xs"
          >
            Apply Filters
          </button>
        </div>
      </form>

      {/* Table */}
      {orders.length === 0 ? (
        <SuperadminEmptyState
          title="No Orders Found"
          description="No platform orders match your current filter parameters."
          actionText="Clear Filters"
          actionHref="/superadmin/orders"
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Order Number</th>
                <th className="px-4 py-3">Laboratory</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Order Status</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Collection</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/75 transition">
                  <td className="px-4 py-3">
                    <Link
                      href={`/superadmin/orders/${o.id}`}
                      className="font-mono font-bold text-sky-700 hover:underline"
                    >
                      {o.orderNumber}
                    </Link>
                    <p className="text-[10px] text-slate-500">{new Date(o.createdAt).toLocaleDateString()}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {o.labName}
                    <p className="text-[10px] text-slate-500">{o.labCity}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-800">{o.patientName}</p>
                    <p className="text-[10px] text-slate-500">{o.patientPhone}</p>
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                    ₹{o.totalAmount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <SuperadminStatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3">
                    <SuperadminStatusBadge status={o.paymentStatus} />
                  </td>
                  <td className="px-4 py-3 text-slate-500 capitalize">
                    {o.collectionType.replace(/_/g, " ").toLowerCase()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/superadmin/orders/${o.id}`}
                      className="rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition"
                    >
                      Inspect →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-medium text-slate-900">{orders.length}</span> of{" "}
              <span className="font-medium text-slate-900">{total}</span> orders
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <span>Page {page} of {totalPages}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
