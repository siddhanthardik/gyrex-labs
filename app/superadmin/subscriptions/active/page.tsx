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
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Link href="/superadmin/subscriptions" className="hover:text-white transition">
            ← Subscriptions
          </Link>
          <span>/</span>
          <span className="text-zinc-200">Active Subscriptions</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
          Active Laboratory Subscriptions ({total})
        </h1>
        <p className="mt-1 text-xs text-zinc-400">
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
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-950 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="px-4 py-3">Laboratory</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Price / Cycle</th>
                <th className="px-4 py-3">Current Period Ends</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {subscriptions.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-800/30 transition">
                  <td className="px-4 py-3 font-semibold text-white">
                    <Link href={`/superadmin/labs/${s.labId}`} className="hover:text-indigo-400 transition">
                      {s.labName}
                    </Link>
                    <p className="text-[10px] text-zinc-500">{s.labCity}</p>
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-200">{s.planName}</td>
                  <td className="px-4 py-3">
                    <SuperadminStatusBadge status={s.status} />
                  </td>
                  <td className="px-4 py-3 font-mono">
                    ₹{s.priceMonthly} / {s.billingCycle.toLowerCase()}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {new Date(s.currentPeriodEnd).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/superadmin/labs/${s.labId}`}
                      className="rounded border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[11px] font-medium text-zinc-200 hover:bg-zinc-700 transition"
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
