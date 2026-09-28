import React from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarRange, CircleDashed, ClipboardCheck, FileText, PackageCheck, ShoppingCart, Truck, WalletCards } from "lucide-react";
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Operations dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Booking volume, collection activity, and report status for <span className="font-semibold text-slate-700">{data.lab.name}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/lab/catalogue/test-master" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700">
            Add tests
          </Link>
          <Link href="/lab/packages/new" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700">
            Create package
          </Link>
          <Link href="/lab/onboarding" className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700">
            Setup checklist <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {storeStatus.status !== "ACTIVE" && (
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <CircleDashed className="mt-0.5 h-5 w-5 text-amber-700" />
            <div>
              <h2 className="text-sm font-semibold text-amber-800">
                {storeStatus.status === "SUSPENDED" ? "Storefront suspended" : "Storefront setup in progress"}
              </h2>
              <p className="mt-0.5 text-xs text-amber-700">
                {storeStatus.status === "SUSPENDED"
                  ? "Your digital store is currently inactive. Contact Gyrex support for assistance."
                  : "Your store is not yet live for patient bookings. Complete the setup checklist to publish."}
              </p>
            </div>
          </div>
          {storeStatus.status !== "SUSPENDED" && (
            <Link href="/lab/publish" className="inline-flex shrink-0 items-center rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700">
              Review checklist
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today's orders" value={metrics.todayOrdersCount} icon={<ShoppingCart className="h-4 w-4" />} helperText="Booked today" variant="info" />
        <StatCard label="Pending orders" value={metrics.pendingOrdersCount} icon={<CalendarRange className="h-4 w-4" />} helperText="Awaiting confirmation" variant={metrics.pendingOrdersCount > 0 ? "warning" : "default"} />
        <StatCard label="Collections scheduled" value={metrics.collectionScheduledCount} icon={<Truck className="h-4 w-4" />} helperText="Home visits planned" />
        <StatCard label="Reports pending" value={metrics.reportsPendingCount} icon={<ClipboardCheck className="h-4 w-4" />} helperText="In processing" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Reports ready" value={metrics.reportsReadyCount} icon={<FileText className="h-4 w-4" />} helperText="Ready for delivery" variant="success" />
        <StatCard label="Active tests" value={metrics.activeTestsCount} icon={<PackageCheck className="h-4 w-4" />} helperText="Bookable in store" />
        <StatCard label="Active packages" value={metrics.activePackagesCount} icon={<WalletCards className="h-4 w-4" />} helperText="Bundled services" />
        <StatCard
          label="Gyrex subscription"
          value={subscriptionStatus.planName}
          icon={<CircleDashed className="h-4 w-4" />}
          helperText={`Status: ${subscriptionStatus.status}`}
          badge={<span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{subscriptionStatus.billingCycle}</span>}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Recent orders</h2>
            <p className="text-xs text-slate-500">Latest bookings requiring attention</p>
          </div>
          <Link href="/lab/orders" className="text-xs font-semibold text-blue-700 transition hover:text-blue-800">
            View all orders <ArrowUpRight className="inline h-3.5 w-3.5" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="py-8">
            <EmptyState
              icon={<ShoppingCart className="h-5 w-5" />}
              title="No orders received yet"
              description="When patients book services through your digital store, orders appear here."
              actionText="View digital store"
              actionHref={`/${data.lab.slug}`}
            />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="pb-3 pr-4">Order ID</th>
                  <th className="pb-3 pr-4">Patient</th>
                  <th className="pb-3 pr-4">Collection</th>
                  <th className="pb-3 pr-4">Amount</th>
                  <th className="pb-3 pr-4">Payment</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="transition hover:bg-slate-50">
                    <td className="py-3.5 pr-4 font-mono font-medium text-blue-700">
                      <Link href={`/lab/orders/${order.orderNumber}`} className="hover:underline">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="py-3.5 pr-4">
                      <p className="font-medium text-slate-900">{order.patientName}</p>
                      <p className="text-xs text-slate-500">{order.patientPhone}</p>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="text-xs text-slate-600">
                        {order.collectionType === "HOME_COLLECTION" ? "Home visit" : "Lab visit"}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 font-medium text-slate-900">₹{order.totalAmount.toLocaleString("en-IN")}</td>
                    <td className="py-3.5 pr-4"><StatusBadge status={order.paymentStatus} type="payment" /></td>
                    <td className="py-3.5 pr-4"><StatusBadge status={order.orderStatus} type="order" /></td>
                    <td className="py-3.5 text-right">
                      <Link href={`/lab/orders/${order.orderNumber}`} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100">
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
