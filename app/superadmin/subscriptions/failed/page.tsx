import React from "react";
import Link from "next/link";
import { getFailedPayments } from "@/services/superadmin/subscriptions-service";
import { SuperadminEmptyState } from "@/components/superadmin/SuperadminEmptyState";
import { SuperadminStatusBadge } from "@/components/superadmin/SuperadminStatusBadge";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SuperadminFailedPaymentsPage() {
  const failedInvoices = await getFailedPayments();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/superadmin/subscriptions" className="inline-flex items-center gap-1 hover:text-slate-900 transition">
            <ArrowLeft className="h-3.5 w-3.5" />
            Subscriptions
          </Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">Failed Invoices</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          Failed SaaS Payments & Dunning Queue ({failedInvoices.length})
        </h1>
        <p className="mt-1 text-xs text-slate-500">
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
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {failedInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-mono font-bold text-rose-600">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <Link href={`/superadmin/labs/${inv.labId}`} className="hover:text-sky-600 hover:underline">
                        {inv.labName}
                      </Link>
                      <p className="text-[10px] text-slate-400 font-normal">{inv.labPhone}</p>
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
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/superadmin/labs/${inv.labId}`}
                        className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                      >
                        Contact Tenant →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
