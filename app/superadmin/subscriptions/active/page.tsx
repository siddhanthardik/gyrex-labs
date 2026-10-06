import React from "react";
import Link from "next/link";
import { getActiveSubscriptions } from "@/services/superadmin/subscriptions-service";
import { SuperadminStatusBadge } from "@/components/superadmin/SuperadminStatusBadge";
import { SuperadminEmptyState } from "@/components/superadmin/SuperadminEmptyState";

export const dynamic = "force-dynamic";

export default async function SuperadminActiveSubscriptionsPage() {
  const { subscriptions, total } = await getActiveSubscriptions({ pageSize: 50 });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/superadmin/subscriptions" className="hover:text-slate-900 transition">
            ← Subscriptions
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-700 font-medium">Active Subscriptions</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          Active Laboratory Subscriptions ({total})
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          All active, trial, and past-due platform subscriptions currently tracked in the billing engine.
        </p>
      </div>

      {subscriptions.length === 0 ? (
        <SuperadminEmptyState
          title="No Active Subscriptions"
          description="There are currently no active subscriptions recorded."
          actionText="View Overview"
          actionHref="/superadmin/subscriptions"
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Laboratory</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Price / Cycle</th>
                <th className="px-4 py-3">Current Period Ends</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {subscriptions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/70 transition">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    <Link href={`/superadmin/labs/${s.labId}`} className="hover:text-sky-600 transition">
                      {s.labName}
                    </Link>
                    <p className="text-[10px] text-slate-500">{s.labCity}</p>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{s.planName}</td>
                  <td className="px-4 py-3">
                    <SuperadminStatusBadge status={s.status} />
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-800">
                    ₹{s.priceMonthly} / {s.billingCycle.toLowerCase()}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(s.currentPeriodEnd).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/superadmin/labs/${s.labId}`}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition shadow-2xs"
                    >
                      Inspect →
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
