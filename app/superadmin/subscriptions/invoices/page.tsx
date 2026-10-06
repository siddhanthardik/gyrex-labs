import React from "react";
import Link from "next/link";
import { getSubscriptionInvoices } from "@/services/superadmin/subscriptions-service";
import { SuperadminStatusBadge } from "@/components/superadmin/SuperadminStatusBadge";
import { SuperadminEmptyState } from "@/components/superadmin/SuperadminEmptyState";
import { ArrowLeft } from "lucide-react";

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
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/superadmin/subscriptions" className="inline-flex items-center gap-1 hover:text-slate-900 transition">
            <ArrowLeft className="h-3.5 w-3.5" />
            Subscriptions
          </Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">SaaS Invoices</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          Gyrex Platform SaaS Invoices ({total})
        </h1>
        <p className="mt-1 text-xs text-slate-500">
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
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
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
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <Link href={`/superadmin/labs/${inv.labId}`} className="hover:text-sky-600 hover:underline">
                        {inv.labName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{inv.planName}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                      ₹{inv.amountDue.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <SuperadminStatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(inv.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-800">{invoices.length}</span> of{" "}
              <span className="font-semibold text-slate-800">{total}</span> invoices
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
