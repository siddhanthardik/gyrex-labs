import React from "react";
import Link from "next/link";
import { getGyrexSubscriptionPayments } from "@/services/superadmin/payments-service";
import { SuperadminStatusBadge } from "@/components/superadmin/SuperadminStatusBadge";
import { SuperadminEmptyState } from "@/components/superadmin/SuperadminEmptyState";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    page?: string;
  }>;
}

export default async function SuperadminGyrexPaymentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.search;
  const page = params.page ? parseInt(params.page, 10) : 1;

  const { payments, total, totalPages } = await getGyrexSubscriptionPayments({
    search,
    page,
    pageSize: 20,
  });

  return (
    <div className="space-y-6">
      {/* Financial Boundary Callout */}
      <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/20 p-4 text-xs text-emerald-300">
        <span className="font-bold">💼 GYREX REVENUE STREAM: </span>
        These transactions represent <span className="font-bold text-white">GYREX SUBSCRIPTION PAYMENTS (Lab → Gyrex)</span>.
        These are software platform fees paid by diagnostic laboratories to Gyrex Labs.
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Gyrex SaaS Subscription Payments ({total})
        </h1>
        <p className="mt-1 text-xs text-zinc-400">
          Commercial software licensing fees collected by Gyrex from diagnostic laboratories.
        </p>
      </div>

      {payments.length === 0 ? (
        <SuperadminEmptyState
          title="No Subscription Payments"
          description="No laboratory SaaS payments have been recorded yet."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-950 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="px-4 py-3">Payment Reference</th>
                <th className="px-4 py-3">Invoice Number</th>
                <th className="px-4 py-3">Paying Laboratory</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Gateway</th>
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
                    {p.invoiceNumber}
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
                    {p.gateway}
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
