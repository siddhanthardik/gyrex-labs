import React from "react";
import Link from "next/link";
import { getGyrexSubscriptionPayments } from "@/services/superadmin/payments-service";
import { SuperadminStatusBadge } from "@/components/superadmin/SuperadminStatusBadge";
import { SuperadminEmptyState } from "@/components/superadmin/SuperadminEmptyState";
import { CreditCard } from "lucide-react";

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
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-800">
        <CreditCard className="w-4 h-4 text-emerald-600 shrink-0" />
        <div>
          <span className="font-bold">GYREX REVENUE STREAM: </span>
          These transactions represent <span className="font-bold text-emerald-950">GYREX SUBSCRIPTION PAYMENTS (Lab → Gyrex)</span>.
          These are software platform fees paid by diagnostic laboratories to Gyrex Labs.
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Gyrex SaaS Subscription Payments ({total})
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Commercial software licensing fees collected by Gyrex from diagnostic laboratories.
        </p>
      </div>

      {payments.length === 0 ? (
        <SuperadminEmptyState
          title="No Subscription Payments"
          description="No laboratory SaaS payments have been recorded yet."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
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
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {p.paymentNumber}
                    </td>
                    <td className="px-4 py-3 font-mono text-sky-600">
                      {p.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <Link href={`/superadmin/labs/${p.labId}`} className="hover:text-sky-600 hover:underline">
                        {p.labName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                      ₹{p.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {p.gateway}
                    </td>
                    <td className="px-4 py-3">
                      <SuperadminStatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : new Date(p.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-800">{payments.length}</span> of{" "}
              <span className="font-semibold text-slate-800">{total}</span> payments
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
