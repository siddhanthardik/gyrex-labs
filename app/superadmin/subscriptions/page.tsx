import React from "react";
import Link from "next/link";
import { getSubscriptionOverview, getActiveSubscriptions } from "@/services/superadmin/subscriptions-service";
import { SuperadminStatCard } from "@/components/superadmin/SuperadminStatCard";
import { SuperadminStatusBadge } from "@/components/superadmin/SuperadminStatusBadge";
import { CreditCard, TrendingUp, Zap, AlertTriangle, Tag, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SuperadminSubscriptionsPage() {
  const { metrics } = await getSubscriptionOverview();
  const { subscriptions } = await getActiveSubscriptions({ page: 1, pageSize: 10 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Gyrex Platform Subscriptions (Lab → Gyrex)
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Commercial recurring software subscriptions billed by Gyrex to participating diagnostic laboratories.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/superadmin/subscriptions/plans"
            className="rounded-lg bg-sky-500 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-sky-600 transition shadow-xs"
          >
            Manage Plans
          </Link>
          <Link
            href="/superadmin/subscriptions/invoices"
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
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
          icon={<CreditCard className="w-4 h-4" />}
        />
        <SuperadminStatCard
          title="Annualized Run Rate"
          value={`₹${metrics.annualRunRate.toLocaleString()}`}
          subtitle="ARR run rate based on current MRR"
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <SuperadminStatCard
          title="Active Subscriptions"
          value={metrics.activeSubsCount}
          subtitle="Paid active laboratory tenants"
          badgeVariant="success"
          icon={<Zap className="w-4 h-4" />}
        />
        <SuperadminStatCard
          title="Past Due / Dunning"
          value={metrics.pastDueCount}
          subtitle="Payment retries in progress"
          badgeVariant={metrics.pastDueCount > 0 ? "danger" : "neutral"}
          icon={<AlertTriangle className="w-4 h-4" />}
        />
      </div>

      {/* Quick Links Banner */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          href="/superadmin/subscriptions/active"
          className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-slate-300 hover:shadow-sm"
        >
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-sky-600" />
            <p className="text-xs font-bold text-slate-900">All Active Subscriptions</p>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Browse and inspect tenant billing periods and next renewal dates.</p>
        </Link>
        <Link
          href="/superadmin/subscriptions/failed"
          className="flex flex-col justify-between rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs transition hover:border-amber-300 hover:bg-amber-50"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <p className="text-xs font-bold text-amber-900">Failed Invoices & Dunning</p>
          </div>
          <p className="text-[11px] text-amber-700/80 mt-2">Inspect uncollectible platform invoices and grace period status.</p>
        </Link>
        <Link
          href="/superadmin/subscriptions/plans"
          className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-slate-300 hover:shadow-sm"
        >
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-sky-600" />
            <p className="text-xs font-bold text-slate-900">Subscription Pricing Tiers</p>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Configure pricing, monthly order limits, and platform feature entitlements.</p>
        </Link>
      </div>

      {/* Recent Subscriptions Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Active Laboratory Subscriptions
          </h2>
          <Link href="/superadmin/subscriptions/active" className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700">
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {subscriptions.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No subscriptions registered yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Laboratory</th>
                  <th className="px-4 py-3">Plan Tier</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Price / Cycle</th>
                  <th className="px-4 py-3">Current Period Ends</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <Link href={`/superadmin/labs/${s.labId}`} className="hover:text-sky-600 transition">
                        {s.labName}
                      </Link>
                      <p className="text-[10px] text-slate-400">{s.labCity}</p>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {s.planName}
                    </td>
                    <td className="px-4 py-3">
                      <SuperadminStatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-900">
                      ₹{s.priceMonthly} / {s.billingCycle.toLowerCase()}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
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
