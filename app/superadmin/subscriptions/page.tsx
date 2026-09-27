import React from "react";
import Link from "next/link";
import { getSubscriptionOverview, getActiveSubscriptions } from "@/services/superadmin/subscriptions-service";
import { SuperadminStatCard } from "@/components/superadmin/SuperadminStatCard";
import { SuperadminStatusBadge } from "@/components/superadmin/SuperadminStatusBadge";

export const dynamic = "force-dynamic";

export default async function SuperadminSubscriptionsPage() {
  const { metrics } = await getSubscriptionOverview();
  const { subscriptions } = await getActiveSubscriptions({ page: 1, pageSize: 10 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Gyrex Platform SaaS Subscriptions (Lab → Gyrex)
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Commercial recurring software subscriptions billed by Gyrex to participating diagnostic laboratories.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/superadmin/subscriptions/plans"
            className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-sm"
          >
            Manage SaaS Plans
          </Link>
          <Link
            href="/superadmin/subscriptions/invoices"
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition"
          >
            View Invoices
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <SuperadminStatCard
          title="Monthly Recurring Revenue"
          value={`₹${metrics.monthlyRecurringRevenue.toLocaleString()}`}
          subtitle="Real active recurring subscriptions"
          badge="MRR"
          badgeVariant="info"
          icon="💳"
        />
        <SuperadminStatCard
          title="Annualized Run Rate"
          value={`₹${metrics.annualRunRate.toLocaleString()}`}
          subtitle="ARR run rate based on current MRR"
          icon="📈"
        />
        <SuperadminStatCard
          title="Active Subscriptions"
          value={metrics.activeSubsCount}
          subtitle="Paid active laboratory tenants"
          badgeVariant="success"
          icon="⚡"
        />
        <SuperadminStatCard
          title="Past Due / Dunning"
          value={metrics.pastDueCount}
          subtitle="Payment retries in progress"
          badgeVariant={metrics.pastDueCount > 0 ? "danger" : "neutral"}
          icon="⚠️"
        />
      </div>

      {/* Quick Links Banner */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          href="/superadmin/subscriptions/active"
          className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-zinc-700 hover:bg-zinc-900"
        >
          <p className="text-xs font-bold text-white">⚡ All Active Subscriptions</p>
          <p className="text-[11px] text-zinc-400 mt-1">Browse and inspect tenant billing periods and next renewal dates.</p>
        </Link>
        <Link
          href="/superadmin/subscriptions/failed"
          className="rounded-xl border border-rose-900/40 bg-rose-950/20 p-4 transition hover:border-rose-800/60 hover:bg-rose-950/30"
        >
          <p className="text-xs font-bold text-rose-300">⚠️ Failed Invoices & Dunning</p>
          <p className="text-[11px] text-rose-400/80 mt-1">Inspect uncollectible platform invoices and grace period status.</p>
        </Link>
        <Link
          href="/superadmin/subscriptions/plans"
          className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-zinc-700 hover:bg-zinc-900"
        >
          <p className="text-xs font-bold text-white">🏷️ SaaS Pricing Tiers</p>
          <p className="text-[11px] text-zinc-400 mt-1">Configure pricing, monthly order limits, and AI feature entitlements.</p>
        </Link>
      </div>

      {/* Recent Subscriptions Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Active Laboratory Subscriptions
          </h2>
          <Link href="/superadmin/subscriptions/active" className="text-xs font-semibold text-indigo-400 hover:underline">
            View All →
          </Link>
        </div>

        {subscriptions.length === 0 ? (
          <p className="text-xs text-zinc-500 py-6 text-center">No subscriptions registered yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 bg-zinc-900 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Laboratory</th>
                  <th className="px-4 py-3">Plan Tier</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Price / Cycle</th>
                  <th className="px-4 py-3">Current Period Ends</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-zinc-900/40 transition">
                    <td className="px-4 py-3 font-semibold text-white">
                      <Link href={`/superadmin/labs/${s.labId}`} className="hover:text-indigo-400 transition">
                        {s.labName}
                      </Link>
                      <p className="text-[10px] text-zinc-500">{s.labCity}</p>
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-200">
                      {s.planName}
                    </td>
                    <td className="px-4 py-3">
                      <SuperadminStatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-3 font-mono">
                      ₹{s.priceMonthly} / {s.billingCycle.toLowerCase()}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {new Date(s.currentPeriodEnd).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
