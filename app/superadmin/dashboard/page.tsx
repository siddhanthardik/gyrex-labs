import React from "react";
import Link from "next/link";
import { getSuperadminDashboardData } from "@/services/superadmin/dashboard-service";
import { SuperadminStatCard } from "@/components/superadmin/SuperadminStatCard";
import { SuperadminStatusBadge } from "@/components/superadmin/SuperadminStatusBadge";

export const dynamic = "force-dynamic";

export default async function SuperadminDashboardPage() {
  const data = await getSuperadminDashboardData();

  return (
    <div className="space-y-8">
      {/* Title & Alert Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Platform Operational Overview</h1>
        <p className="mt-1 text-xs text-zinc-400">
          Cross-tenant governance, laboratory onboarding verification, and Gyrex SaaS monetization metrics.
        </p>
      </div>

      {/* Critical Platform Action Alerts */}
      {(data.alerts.pendingLabsCount > 0 ||
        data.alerts.failedPaymentsCount > 0 ||
        data.alerts.suspendedLabsCount > 0 ||
        data.alerts.urgentTicketsCount > 0) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.alerts.pendingLabsCount > 0 && (
            <Link
              href="/superadmin/labs/pending"
              className="flex items-center justify-between rounded-xl border border-amber-800/60 bg-amber-950/30 p-4 transition hover:bg-amber-950/50"
            >
              <div>
                <p className="text-xs font-semibold text-amber-300">Pending Lab Verifications</p>
                <p className="text-[11px] text-amber-400/80">Requires platform documentation review</p>
              </div>
              <span className="text-xl font-bold text-amber-400">{data.alerts.pendingLabsCount}</span>
            </Link>
          )}

          {data.alerts.failedPaymentsCount > 0 && (
            <Link
              href="/superadmin/subscriptions/failed"
              className="flex items-center justify-between rounded-xl border border-rose-800/60 bg-rose-950/30 p-4 transition hover:bg-rose-950/50"
            >
              <div>
                <p className="text-xs font-semibold text-rose-300">Failed SaaS Invoices</p>
                <p className="text-[11px] text-rose-400/80">SaaS subscription dunning queue</p>
              </div>
              <span className="text-xl font-bold text-rose-400">{data.alerts.failedPaymentsCount}</span>
            </Link>
          )}

          {data.alerts.suspendedLabsCount > 0 && (
            <Link
              href="/superadmin/labs/suspended"
              className="flex items-center justify-between rounded-xl border border-rose-900/60 bg-rose-950/20 p-4 transition hover:bg-rose-950/40"
            >
              <div>
                <p className="text-xs font-semibold text-rose-300">Suspended Laboratories</p>
                <p className="text-[11px] text-rose-400/80">Storefronts currently deactivated</p>
              </div>
              <span className="text-xl font-bold text-rose-400">{data.alerts.suspendedLabsCount}</span>
            </Link>
          )}

          {data.alerts.urgentTicketsCount > 0 && (
            <Link
              href="/superadmin/support"
              className="flex items-center justify-between rounded-xl border border-indigo-800/60 bg-indigo-950/30 p-4 transition hover:bg-indigo-950/50"
            >
              <div>
                <p className="text-xs font-semibold text-indigo-300">Urgent Support Requests</p>
                <p className="text-[11px] text-indigo-400/80">Open laboratory incident tickets</p>
              </div>
              <span className="text-xl font-bold text-indigo-400">{data.alerts.urgentTicketsCount}</span>
            </Link>
          )}
        </div>
      )}

      {/* KPI Section 1: Laboratory Tenants */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
          1. Laboratory Ecosystem Governance
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SuperadminStatCard
            title="Total Laboratories"
            value={data.overview.totalLabs}
            subtitle="Registered lab tenants"
            icon="🔬"
          />
          <SuperadminStatCard
            title="Active Storefronts"
            value={data.overview.activeLabs}
            subtitle="Accepting patient bookings"
            badge="LIVE"
            badgeVariant="success"
            icon="🟢"
          />
          <SuperadminStatCard
            title="Pending Verification"
            value={data.overview.pendingVerificationLabs}
            subtitle="Awaiting Superadmin sign-off"
            badge={data.overview.pendingVerificationLabs > 0 ? "ACTION REQ" : undefined}
            badgeVariant="warning"
            icon="⏳"
          />
          <SuperadminStatCard
            title="Suspended Stores"
            value={data.overview.suspendedLabs}
            subtitle="Storefront access blocked"
            badgeVariant="danger"
            icon="🚫"
          />
        </div>
      </div>

      {/* KPI Section 2: Platform Subscriptions & Commercial Revenue */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
          2. Gyrex SaaS Monetization (Lab → Gyrex)
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SuperadminStatCard
            title="SaaS Monthly Run Rate"
            value={`₹${data.overview.subscriptionRevenueMonthly.toLocaleString()}`}
            subtitle="Recurring software subscription fees"
            badge="MRR"
            badgeVariant="info"
            icon="💳"
          />
          <SuperadminStatCard
            title="Active Subscriptions"
            value={data.overview.activeSubscriptions}
            subtitle="Paying laboratory partners"
            icon="⚡"
          />
          <SuperadminStatCard
            title="Trial Laboratories"
            value={data.overview.trialLabs}
            subtitle="14-day evaluation tier"
            badgeVariant="neutral"
            icon="🌱"
          />
          <SuperadminStatCard
            title="Past Due Accounts"
            value={data.overview.pastDueSubscriptions}
            subtitle="Payment retries active"
            badgeVariant="danger"
            icon="⚠️"
          />
        </div>
      </div>

      {/* KPI Section 3: Diagnostic Operations */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
          3. Diagnostic Operational Throughput
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SuperadminStatCard
            title="Orders Today"
            value={data.overview.ordersToday}
            subtitle="Cross-tenant bookings placed today"
            icon="📦"
          />
          <SuperadminStatCard
            title="Orders This Month"
            value={data.overview.ordersThisMonth}
            subtitle="Monthly diagnostic throughput"
            icon="📅"
          />
          <SuperadminStatCard
            title="Pending Reports"
            value={data.overview.reportsPending}
            subtitle="Draft reports awaiting lab release"
            icon="📄"
          />
          <SuperadminStatCard
            title="Open Support Tickets"
            value={data.overview.openTickets}
            subtitle="Active partner inquiries"
            icon="🎫"
          />
        </div>
      </div>

      {/* Tables: Recent Laboratories & Orders */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Labs */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Recently Onboarded Laboratories</h3>
            <Link href="/superadmin/labs" className="text-xs font-medium text-indigo-400 hover:text-indigo-300">
              View All Labs →
            </Link>
          </div>

          {data.recentLabs.length === 0 ? (
            <p className="text-xs text-zinc-500 py-6 text-center">No laboratories registered yet.</p>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {data.recentLabs.map((lab) => (
                <div key={lab.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link
                      href={`/superadmin/labs/${lab.id}`}
                      className="text-xs font-semibold text-white hover:text-indigo-400 transition"
                    >
                      {lab.name}
                    </Link>
                    <p className="text-[11px] text-zinc-500">
                      {lab.city} • Joined {new Date(lab.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <SuperadminStatusBadge status={lab.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Orders Across Platform */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Recent Cross-Tenant Orders</h3>
            <Link href="/superadmin/orders" className="text-xs font-medium text-indigo-400 hover:text-indigo-300">
              View All Orders →
            </Link>
          </div>

          {data.recentOrders.length === 0 ? (
            <p className="text-xs text-zinc-500 py-6 text-center">No diagnostic orders placed yet.</p>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {data.recentOrders.map((ord) => (
                <div key={ord.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link
                      href={`/superadmin/orders/${ord.id}`}
                      className="font-mono text-xs font-bold text-indigo-300 hover:underline"
                    >
                      {ord.orderNumber}
                    </Link>
                    <p className="text-[11px] text-zinc-400">
                      {ord.labName} • {ord.patientName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-white">₹{ord.totalAmount.toLocaleString()}</p>
                    <SuperadminStatusBadge status={ord.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
