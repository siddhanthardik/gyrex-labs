import React from "react";
import { getPlatformRefunds } from "@/services/superadmin/payments-service";
import { SuperadminStatusBadge } from "@/components/superadmin/SuperadminStatusBadge";
import { SuperadminEmptyState } from "@/components/superadmin/SuperadminEmptyState";

export const dynamic = "force-dynamic";

export default async function SuperadminRefundsPage() {
  const { refunds, total } = await getPlatformRefunds({ pageSize: 50 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Platform Refunds & Adjustments ({total})</h1>
        <p className="mt-1 text-xs text-slate-500">
          Oversight of diagnostic order refunds processed by laboratories or platform operations.
        </p>
      </div>

      {refunds.length === 0 ? (
        <SuperadminEmptyState
          title="No Refunds Processed"
          description="There are currently no refunded transactions recorded across the platform."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Refund Reference</th>
                  <th className="px-4 py-3">Order Number</th>
                  <th className="px-4 py-3">Laboratory</th>
                  <th className="px-4 py-3">Original Amount</th>
                  <th className="px-4 py-3">Refunded Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Processed Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {refunds.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-mono font-bold text-rose-600">
                      {r.refundId}
                    </td>
                    <td className="px-4 py-3 font-mono text-sky-600">{r.orderNumber}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{r.labName}</td>
                    <td className="px-4 py-3 font-mono text-slate-500">₹{r.originalAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono font-bold text-rose-600">
                      ₹{r.refundedAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <SuperadminStatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(r.updatedAt).toLocaleDateString()}
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
