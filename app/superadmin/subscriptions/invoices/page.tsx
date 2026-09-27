import React from "react";
import Link from "next/link";
import { getSubscriptionInvoices } from "@/services/superadmin/subscriptions-service";
import { SuperadminStatusBadge } from "@/components/superadmin/SuperadminStatusBadge";
import { SuperadminEmptyState } from "@/components/superadmin/SuperadminEmptyState";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    page?: string;
  }>;
}

export default async function SuperadminInvoicesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.search;
  const page = params.page ? parseInt(params.page, 10) : 1;

  const { invoices, total, totalPages } = await getSubscriptionInvoices({
    search,
    page,
    pageSize: 20,
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Link href="/superadmin/subscriptions" className="hover:text-white transition">
            ← Subscriptions
          </Link>
          <span>/</span>
          <span className="text-zinc-200">SaaS Invoices</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
          Gyrex Platform SaaS Invoices ({total})
        </h1>
        <p className="mt-1 text-xs text-zinc-400">
          Platform subscription invoices generated for laboratory software usage (Lab → Gyrex). Not patient diagnostic receipts.
        </p>
      </div>

      {invoices.length === 0 ? (
        <SuperadminEmptyState
          title="No Invoices Found"
          description="No platform subscription invoices match your query."
          actionText="View Subscriptions"
          actionHref="/superadmin/subscriptions"
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-950 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="px-4 py-3">Invoice Number</th>
                <th className="px-4 py-3">Laboratory</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Amount Due</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Paid Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-zinc-800/30 transition">
                  <td className="px-4 py-3 font-mono font-bold text-white">
                    {inv.invoiceNumber}
                  </td>
                  <td className="px-4 py-3 font-semibold text-white">
                    <Link href={`/superadmin/labs/${inv.labId}`} className="hover:underline">
                      {inv.labName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{inv.planName}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-white">
                    ₹{inv.amountDue.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <SuperadminStatusBadge status={inv.status} />
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {new Date(inv.dueDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950 px-4 py-3 text-xs text-zinc-400">
            <div>
              Showing <span className="font-medium text-white">{invoices.length}</span> of{" "}
              <span className="font-medium text-white">{total}</span> invoices
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
