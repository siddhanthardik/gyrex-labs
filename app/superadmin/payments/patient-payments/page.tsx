import React from "react";
import Link from "next/link";
import { getPatientDiagnosticPayments } from "@/services/superadmin/payments-service";
import { SuperadminStatusBadge } from "@/components/superadmin/SuperadminStatusBadge";
import { SuperadminEmptyState } from "@/components/superadmin/SuperadminEmptyState";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    page?: string;
  }>;
}

export default async function SuperadminPatientPaymentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.search;
  const page = params.page ? parseInt(params.page, 10) : 1;

  const { payments, total, totalPages } = await getPatientDiagnosticPayments({
    search,
    page,
    pageSize: 20,
  });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-xs text-indigo-700">
        <span className="font-bold">Financial separation:</span> these transactions represent patient payments made directly to a laboratory for diagnostic services. Gyrex Labs is not the merchant of record for these funds.
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Patient payments ({total})
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Audit ledger for patient payments processed directly between patients and laboratories.
        </p>
      </div>

      {payments.length === 0 ? (
        <SuperadminEmptyState
          title="No Diagnostic Payments"
          description="No patient diagnostic transactions have been recorded yet."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-950 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="px-4 py-3">Payment Reference</th>
                <th className="px-4 py-3">Order Number</th>
                <th className="px-4 py-3">Receiving Laboratory</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method / Gateway</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-800/30 transition">
                  <td className="px-4 py-3 font-mono font-bold text-white">
                    {p.paymentNumber}
                  </td>
                  <td className="px-4 py-3 font-mono text-indigo-400">
                    <Link href={`/superadmin/orders/${p.orderId}`} className="hover:underline">
                      {p.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-semibold text-white">
                    <Link href={`/superadmin/labs/${p.labId}`} className="hover:underline">
                      {p.labName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-white">
                    ₹{p.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {p.method} • {p.gateway}
                  </td>
                  <td className="px-4 py-3">
                    <SuperadminStatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : new Date(p.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950 px-4 py-3 text-xs text-zinc-400">
            <div>
              Showing <span className="font-medium text-white">{payments.length}</span> of{" "}
              <span className="font-medium text-white">{total}</span> payments
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
