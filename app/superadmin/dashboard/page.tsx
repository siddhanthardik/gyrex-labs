import React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  CalendarRange,
  CreditCard,
  FileText,
  MessageSquareText,
  PackageCheck,
  ShieldAlert,
  Store,
  Users,
  WalletCards,
} from "lucide-react";
import { getSuperadminDashboardData } from "@/services/superadmin/dashboard-service";
import { SuperadminStatCard } from "@/components/superadmin/SuperadminStatCard";
import { SuperadminStatusBadge } from "@/components/superadmin/SuperadminStatusBadge";

export const dynamic = "force-dynamic";

export default async function SuperadminDashboardPage() {
  const data = await getSuperadminDashboardData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Operations overview</h1>
        <p className="mt-1 text-sm text-slate-500">
          Laboratory onboarding, platform performance, and subscription health across the Gyrex Labs network.
        </p>
      </div>

      {(data.alerts.pendingLabsCount > 0 ||
        data.alerts.failedPaymentsCount > 0 ||
        data.alerts.suspendedLabsCount > 0 ||
        data.alerts.urgentTicketsCount > 0) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.alerts.pendingLabsCount > 0 && (
            <Link
              href="/superadmin/labs/pending"
              className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4 transition hover:bg-amber-100"
            >
              <div>
                <p className="text-xs font-semibold text-amber-800">Pending lab reviews</p>
                <p className="text-[11px] text-amber-700">Awaiting verification</p>
              </div>
              <span className="text-xl font-bold text-amber-700">{data.alerts.pendingLabsCount}</span>
            </Link>
          )}

          {data.alerts.failedPaymentsCount > 0 && (
            <Link
              href="/superadmin/subscriptions/failed"
              className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 transition hover:bg-rose-100"
            >
              <div>
                <p className="text-xs font-semibold text-rose-800">Failed invoices</p>
                <p className="text-[11px] text-rose-700">Billing follow-up required</p>
              </div>
              <span className="text-xl font-bold text-rose-700">{data.alerts.failedPaymentsCount}</span>
            </Link>
          )}

          {data.alerts.suspendedLabsCount > 0 && (
            <Link
              href="/superadmin/labs/suspended"
              className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 transition hover:bg-rose-100"
            >
              <div>
                <p className="text-xs font-semibold text-rose-800">Suspended labs</p>
                <p className="text-[11px] text-rose-700">Storefronts inactive</p>
              </div>
              <span className="text-xl font-bold text-rose-700">{data.alerts.suspendedLabsCount}</span>
            </Link>
          )}

          {data.alerts.urgentTicketsCount > 0 && (
            <Link
              href="/superadmin/support"
              className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 p-4 transition hover:bg-indigo-100"
            >
              <div>
                <p className="text-xs font-semibold text-indigo-800">Open support tickets</p>
                <p className="text-[11px] text-indigo-700">Priority action needed</p>
              </div>
              <span className="text-xl font-bold text-indigo-700">{data.alerts.urgentTicketsCount}</span>
            </Link>
          )}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
          Laboratory network
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SuperadminStatCard
            title="Total labs"
            value={data.overview.totalLabs}
            subtitle="Registered lab partners"
            icon={<Building2 className="h-4 w-4" />}
          />
          <SuperadminStatCard
            title="Active storefronts"
            value={data.overview.activeLabs}
            subtitle="Accepting patient bookings"
            badge="Live"
            badgeVariant="success"
            icon={<Store className="h-4 w-4" />}
          />
          <SuperadminStatCard
            title="Pending review"
            value={data.overview.pendingVerificationLabs}
            subtitle="Awaiting admin approval"
            badge={data.overview.pendingVerificationLabs > 0 ? "Action" : undefined}
            badgeVariant="warning"
            icon={<AlertTriangle className="h-4 w-4" />}
          />
          <SuperadminStatCard
            title="Suspended labs"
            value={data.overview.suspendedLabs}
            subtitle="Currently inactive"
            badgeVariant="danger"
            icon={<ShieldAlert className="h-4 w-4" />}
          />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
          Subscription health
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SuperadminStatCard
            title="Monthly recurring revenue"
            value={`₹${data.overview.subscriptionRevenueMonthly.toLocaleString()}`}
            subtitle="Recurring subscription fees"
            badge="MRR"
            badgeVariant="info"
            icon={<CreditCard className="h-4 w-4" />}
          />
          <SuperadminStatCard
            title="Active subscriptions"
            value={data.overview.activeSubscriptions}
            subtitle="Paying lab partners"
            icon={<BadgeCheck className="h-4 w-4" />}
          />
          <SuperadminStatCard
            title="Trial labs"
            value={data.overview.trialLabs}
            subtitle="Evaluation tier"
            badgeVariant="neutral"
            icon={<WalletCards className="h-4 w-4" />}
          />
          <SuperadminStatCard
            title="Past due"
            value={data.overview.pastDueSubscriptions}
            subtitle="Payment follow-up in progress"
            badgeVariant="danger"
            icon={<AlertTriangle className="h-4 w-4" />}
          />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
          Operational activity
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SuperadminStatCard
            title="Orders today"
            value={data.overview.ordersToday}
            subtitle="Bookings received today"
            icon={<PackageCheck className="h-4 w-4" />}
          />
          <SuperadminStatCard
            title="Orders this month"
            value={data.overview.ordersThisMonth}
            subtitle="Monthly diagnostic volume"
            icon={<CalendarRange className="h-4 w-4" />}
          />
          <SuperadminStatCard
            title="Pending reports"
            value={data.overview.reportsPending}
            subtitle="Awaiting release"
            icon={<FileText className="h-4 w-4" />}
          />
          <SuperadminStatCard
            title="Open support tickets"
            value={data.overview.openTickets}
            subtitle="Active partner requests"
            icon={<MessageSquareText className="h-4 w-4" />}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Recently onboarded labs</h3>
            <Link href="/superadmin/labs" className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800">
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {data.recentLabs.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">No laboratories registered yet.</p>
          ) : (
            <div className="mt-4 divide-y divide-slate-200">
              {data.recentLabs.map((lab) => (
                <div key={lab.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link href={`/superadmin/labs/${lab.id}`} className="text-xs font-semibold text-slate-900 hover:text-blue-700">
                      {lab.name}
                    </Link>
                    <p className="text-[11px] text-slate-500">
                      {lab.city} • Joined {new Date(lab.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <SuperadminStatusBadge status={lab.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Recent orders</h3>
            <Link href="/superadmin/orders" className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800">
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {data.recentOrders.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">No orders placed yet.</p>
          ) : (
            <div className="mt-4 divide-y divide-slate-200">
              {data.recentOrders.map((ord) => (
                <div key={ord.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link href={`/superadmin/orders/${ord.id}`} className="font-mono text-xs font-bold text-blue-700 hover:underline">
                      {ord.orderNumber}
                    </Link>
                    <p className="text-[11px] text-slate-500">
                      {ord.labName} • {ord.patientName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-900">₹{ord.totalAmount.toLocaleString()}</p>
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
