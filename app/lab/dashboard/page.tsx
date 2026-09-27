import React from "react";
import Link from "next/link";
import { requireLabAccess } from "@/lib/auth/context";
import { getLabDashboardData } from "@/services/lab/dashboard-service";
import { StatCard } from "@/components/lab/StatCard";
import { StatusBadge } from "@/components/lab/StatusBadge";
import { EmptyState } from "@/components/lab/EmptyState";

export default async function LabDashboardPage() {
  const { labMembership } = await requireLabAccess();
  const data = await getLabDashboardData(labMembership.labId);

  const { metrics, storeStatus, subscriptionStatus, recentOrders } = data;

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Operational Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Real-time diagnostic booking, sample collection, and report status for{" "}
            <span className="font-semibold text-zinc-200">{data.lab.name}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/lab/catalogue/test-master"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-200 transition hover:border-sky-500/40 hover:text-white"
          >
            <span>+ Add Tests</span>
          </Link>
          <Link
            href="/lab/packages/new"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-200 transition hover:border-sky-500/40 hover:text-white"
          >
            <span>+ Create Package</span>
          </Link>
          <Link
            href="/lab/onboarding"
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-400"
          >
            <span>Setup Checklist →</span>
          </Link>
        </div>
      </div>

      {/* Store & Verification State Notification */}
      {storeStatus.status !== "ACTIVE" && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <h2 className="text-sm font-semibold text-amber-200">
                {storeStatus.status === "SUSPENDED"
                  ? "Storefront Suspended"
                  : "Storefront Setup in Progress"}
              </h2>
              <p className="mt-0.5 text-xs text-amber-300/80">
                {storeStatus.status === "SUSPENDED"
                  ? "Your digital store is suspended by platform administration. Please contact Gyrex support."
                  : "Your digital store is not yet active for public patient bookings. Complete the setup checklist to publish."}
              </p>
            </div>
          </div>
          {storeStatus.status !== "SUSPENDED" && (
            <Link
              href="/lab/publish"
              className="inline-flex shrink-0 items-center rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-amber-400"
            >
              Check Readiness & Publish
            </Link>
          )}
        </div>
      )}

      {/* Primary Operational Metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today's Orders"
          value={metrics.todayOrdersCount}
          icon="📦"
          helperText="Booked since 12:00 AM"
          variant="info"
        />
        <StatCard
          label="Pending Orders"
          value={metrics.pendingOrdersCount}
          icon="⏳"
          helperText="Awaiting confirmation"
          variant={metrics.pendingOrdersCount > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Collections Scheduled"
          value={metrics.collectionScheduledCount}
          icon="🚚"
          helperText="Home visits scheduled"
        />
        <StatCard
          label="Reports Pending"
          value={metrics.reportsPendingCount}
          icon="🔬"
          helperText="In processing at LIS"
        />
      </div>

      {/* Secondary Operational & Store Metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Reports Ready"
          value={metrics.reportsReadyCount}
          icon="📄"
          helperText="Ready for delivery"
          variant="success"
        />
        <StatCard
          label="Active Diagnostic Tests"
          value={metrics.activeTestsCount}
          icon="🧪"
          helperText="Bookable in store"
        />
        <StatCard
          label="Active Packages"
          value={metrics.activePackagesCount}
          icon="🎁"
          helperText="Bundled checkups"
        />
        <StatCard
          label="Gyrex Subscription"
          value={subscriptionStatus.planName}
          icon="⚡"
          helperText={`Status: ${subscriptionStatus.status}`}
          badge={
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
              {subscriptionStatus.billingCycle}
            </span>
          }
        />
      </div>

      {/* Recent Orders Overview */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
          <div>
            <h2 className="text-base font-semibold text-white">Recent Orders</h2>
            <p className="text-xs text-zinc-400">Latest diagnostic bookings requiring lab attention</p>
          </div>
          <Link
            href="/lab/orders"
            className="text-xs font-semibold text-sky-400 transition hover:text-sky-300"
          >
            View All Orders →
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="py-8">
            <EmptyState
              icon="📦"
              title="No Orders Received Yet"
              description="When patients book diagnostic tests through your digital store, orders will appear here in real-time."
              actionText="View Digital Store"
              actionHref={`/${data.lab.slug}`}
            />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  <th className="pb-3 pr-4">Order ID</th>
                  <th className="pb-3 pr-4">Patient</th>
                  <th className="pb-3 pr-4">Collection</th>
                  <th className="pb-3 pr-4">Amount</th>
                  <th className="pb-3 pr-4">Payment</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="transition hover:bg-zinc-800/20">
                    <td className="py-3.5 pr-4 font-mono font-medium text-sky-400">
                      <Link href={`/lab/orders/${order.orderNumber}`} className="hover:underline">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="py-3.5 pr-4">
                      <p className="font-medium text-white">{order.patientName}</p>
                      <p className="text-xs text-zinc-400">{order.patientPhone}</p>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="text-xs text-zinc-300">
                        {order.collectionType === "HOME_COLLECTION" ? "🏠 Home Visit" : "🏥 Lab Visit"}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 font-medium text-white">
                      ₹{order.totalAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 pr-4">
                      <StatusBadge status={order.paymentStatus} type="payment" />
                    </td>
                    <td className="py-3.5 pr-4">
                      <StatusBadge status={order.orderStatus} type="order" />
                    </td>
                    <td className="py-3.5 text-right">
                      <Link
                        href={`/lab/orders/${order.orderNumber}`}
                        className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-2.5 py-1 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700 hover:text-white"
                      >
                        Manage
                      </Link>
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
