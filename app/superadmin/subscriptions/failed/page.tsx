import React from "react";
import Link from "next/link";
import { getFailedPayments } from "@/services/superadmin/subscriptions-service";
import { SuperadminEmptyState } from "@/components/superadmin/SuperadminEmptyState";
import { SuperadminStatusBadge } from "@/components/superadmin/SuperadminStatusBadge";

export const dynamic = "force-dynamic";

export default async function SuperadminFailedPaymentsPage() {
  const failedInvoices = await getFailedPayments();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Link href="/superadmin/subscriptions" className="hover:text-white transition">
            ← Subscriptions
          </Link>
          <span>/</span>
          <span className="text-zinc-200">Failed Invoices</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
          Failed SaaS Payments & Dunning Queue ({failedInvoices.length})
        </h1>
        <p className="mt-1 text-xs text-zinc-400">
          Platform invoices that failed payment processing, requiring dunning retry or account contact.
        </p>
      </div>

      {failedInvoices.length === 0 ? (
        <SuperadminEmptyState
          title="No Failed Payments"
          description="All laboratory subscription invoices have been paid or are within normal payment cycles."
          actionText="View Invoices"
          actionHref="/superadmin/subscriptions/invoices"
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
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {failedInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-zinc-800/30 transition">
                  <td className="px-4 py-3 font-mono font-bold text-rose-400">
                    {inv.invoiceNumber}
                  </td>
                  <td className="px-4 py-3 font-semibold text-white">
                    <Link href={`/superadmin/labs/${inv.labId}`} className="hover:underline">
                      {inv.labName}
                    </Link>
                    <p className="text-[10px] text-zinc-500">{inv.labPhone}</p>
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
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/superadmin/labs/${inv.labId}`}
                      className="rounded border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[11px] font-medium text-zinc-200 hover:bg-zinc-700 transition"
                    >
                      Contact Tenant →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
