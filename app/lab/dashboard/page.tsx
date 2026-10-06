import React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarRange,
  CircleDashed,
  ClipboardCheck,
  Clock,
  FileText,
  PackageCheck,
  ShieldCheck,
  ShoppingCart,
  Truck,
  User,
  WalletCards,
} from "lucide-react";
import { requireLabAccess } from "@/lib/auth/context";
import { getLabDashboardData } from "@/services/lab/dashboard-service";
import { prisma } from "@/lib/db/prisma";
import { StatCard } from "@/components/lab/StatCard";
import { StatusBadge } from "@/components/lab/StatusBadge";
import { EmptyState } from "@/components/lab/EmptyState";

export default async function LabDashboardPage() {
  const { labMembership } = await requireLabAccess();

  const [data, scheduledCollections, labInfo] = await Promise.all([
    getLabDashboardData(labMembership.labId),
    prisma.collection.findMany({
      where: { labId: labMembership.labId },
      take: 5,
      orderBy: [{ scheduledDate: "asc" }, { createdAt: "desc" }],
      include: {
        order: {
          select: {
            orderNumber: true,
            orderStatus: true,
            patient: { select: { fullName: true, phone: true } },
          },
        },
      },
    }),
    prisma.lab.findUnique({
      where: { id: labMembership.labId },
      select: {
        name: true,
        code: true,
        status: true,
        isVerified: true,
        nablAccreditationNumber: true,
      },
    }),
  ]);

  const { metrics, storeStatus, subscriptionStatus, recentOrders } = data;
  const labName = labInfo?.name || data.lab.name;
  const isNabl = Boolean(labInfo?.nablAccreditationNumber);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Laboratory Identity Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {labName}
            </h1>
            {isNabl ? (
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                NABL Accredited
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
                Diagnostic Lab
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Booking volume, collection activity, and report processing for your facility.
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/lab/catalogue/test-master"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50"
          >
            Add tests
          </Link>
          <Link
            href="/lab/packages/new"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50"
          >
            Create package
          </Link>
          <Link
            href="/lab/publish"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-sky-600"
          >
            <span>Setup checklist</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Profile completion notice if needed */}
      {(data.lab.addressLine1.includes("Pending") || data.lab.postalCode === "000000") && (
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-sky-200 bg-sky-50/70 p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-semibold text-sky-900">
              Complete your laboratory profile
            </h2>
            <p className="mt-0.5 text-xs text-sky-700">
              Provide complete lab address and credentials to start receiving patient bookings.
            </p>
          </div>
          <Link
            href="/lab/onboarding/profile"
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-sky-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-sky-600"
          >
            Continue setup
          </Link>
        </div>
      )}

      {/* Storefront status banner */}
      {storeStatus.status !== "ACTIVE" && (
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div>
              <h2 className="text-xs font-semibold text-amber-900">
                {storeStatus.status === "SUSPENDED"
                  ? "Storefront suspended"
                  : "Storefront setup in progress"}
              </h2>
              <p className="mt-0.5 text-xs text-amber-700">
                {storeStatus.status === "SUSPENDED"
                  ? "Your digital store is currently inactive. Contact Gyrex support for assistance."
                  : "Your store is not yet published for patient bookings. Complete the checklist to go live."}
              </p>
            </div>
          </div>
          {storeStatus.status !== "SUSPENDED" && (
            <Link
              href="/lab/publish"
              className="inline-flex shrink-0 items-center rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700 shadow-2xs"
            >
              Review checklist
            </Link>
          )}
        </div>
      )}

      {/* 8 Operational KPI Cards: 4 cols on desktop, 2 cols on mobile */}
      <div className="grid grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Today's orders"
          value={metrics.todayOrdersCount}
          icon={<ShoppingCart className="h-4 w-4" />}
          helperText="Booked today"
          variant="sky"
        />
        <StatCard
          label="Pending processing"
          value={metrics.pendingOrdersCount}
          icon={<CalendarRange className="h-4 w-4" />}
          helperText="Awaiting confirmation"
          variant={metrics.pendingOrdersCount > 0 ? "amber" : "default"}
        />
        <StatCard
          label="Home collections"
          value={metrics.collectionScheduledCount}
          icon={<Truck className="h-4 w-4" />}
          helperText="Home visits scheduled"
          variant="teal"
        />
        <StatCard
          label="Reports pending"
          value={metrics.reportsPendingCount}
          icon={<ClipboardCheck className="h-4 w-4" />}
          helperText="Samples in analysis"
          variant="amber"
        />
        <StatCard
          label="Reports ready"
          value={metrics.reportsReadyCount}
          icon={<FileText className="h-4 w-4" />}
          helperText="Ready for delivery"
          variant="emerald"
        />
        <StatCard
          label="Active tests"
          value={metrics.activeTestsCount}
          icon={<PackageCheck className="h-4 w-4" />}
          helperText="Published in store"
          variant="sky"
        />
        <StatCard
          label="Active packages"
          value={metrics.activePackagesCount}
          icon={<WalletCards className="h-4 w-4" />}
          helperText="Bundled profiles"
          variant="info"
        />
        <StatCard
          label="Subscription"
          value={subscriptionStatus.planName}
          icon={<BadgeCheck className="h-4 w-4" />}
          helperText={`Status: ${subscriptionStatus.status}`}
          badge={
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              {subscriptionStatus.billingCycle}
            </span>
          }
          variant="emerald"
        />
      </div>

      {/* Lower Operational Section: Recent Orders & Today's Collections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Recent Orders (7/12 desktop) */}
        <div className="lg:col-span-7 flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Recent orders</h2>
                <p className="text-xs text-slate-500">Latest patient bookings requiring attention</p>
              </div>
              <Link
                href="/lab/orders"
                className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 transition hover:text-sky-700"
              >
                <span>View all</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="py-8">
                <EmptyState
                  icon={<ShoppingCart className="h-5 w-5" />}
                  title="No orders received yet"
                  description="When patients book tests or packages through your digital store, orders will appear here."
                  actionText="Preview digital store"
                  actionHref={`/${data.lab.slug}`}
                />
              </div>
            ) : (
              <>
                {/* Desktop Orders Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        <th className="py-3 pr-3">Order ID</th>
                        <th className="py-3 pr-3">Patient</th>
                        <th className="py-3 pr-3">Type</th>
                        <th className="py-3 pr-3">Amount</th>
                        <th className="py-3 pr-3">Payment</th>
                        <th className="py-3 pr-3">Status</th>
                        <th className="py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentOrders.map((order) => (
                        <tr key={order.id} className="transition hover:bg-slate-50/70">
                          <td className="py-3 pr-3 font-mono font-medium text-sky-600">
                            <Link href={`/lab/orders/${order.orderNumber}`} className="hover:underline">
                              {order.orderNumber}
                            </Link>
                          </td>
                          <td className="py-3 pr-3">
                            <p className="font-medium text-slate-900 leading-tight">{order.patientName}</p>
                            <p className="text-[11px] text-slate-400">{order.patientPhone}</p>
                          </td>
                          <td className="py-3 pr-3 text-slate-600">
                            {order.collectionType === "HOME_COLLECTION" ? "Home visit" : "Lab visit"}
                          </td>
                          <td className="py-3 pr-3 font-semibold text-slate-900">
                            ₹{order.totalAmount.toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 pr-3">
                            <StatusBadge status={order.paymentStatus} type="payment" />
                          </td>
                          <td className="py-3 pr-3">
                            <StatusBadge status={order.orderStatus} type="order" />
                          </td>
                          <td className="py-3 text-right">
                            <Link
                              href={`/lab/orders/${order.orderNumber}`}
                              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50"
                            >
                              Manage
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Responsive Orders Stacked Cards */}
                <div className="divide-y divide-slate-100 md:hidden">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="py-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/lab/orders/${order.orderNumber}`}
                          className="font-mono text-xs font-semibold text-sky-600"
                        >
                          {order.orderNumber}
                        </Link>
                        <StatusBadge status={order.orderStatus} type="order" />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <p className="font-medium text-slate-900">{order.patientName}</p>
                          <p className="text-[11px] text-slate-400">{order.patientPhone}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">₹{order.totalAmount.toLocaleString("en-IN")}</p>
                          <p className="text-[11px] text-slate-500">
                            {order.collectionType === "HOME_COLLECTION" ? "Home visit" : "Lab visit"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <StatusBadge status={order.paymentStatus} type="payment" />
                        <Link
                          href={`/lab/orders/${order.orderNumber}`}
                          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50"
                        >
                          Manage
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Column: Today's Collections (5/12 desktop) */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Today&apos;s collections</h2>
                <p className="text-xs text-slate-500">Scheduled home sample visits</p>
              </div>
              <Link
                href="/lab/collections"
                className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 transition hover:text-sky-700"
              >
                <span>View all</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {scheduledCollections.length === 0 ? (
              <div className="py-8">
                <EmptyState
                  icon={<Truck className="h-5 w-5" />}
                  title="No collections scheduled"
                  description="When patients book home collections, assignments and time slots will appear here."
                  actionText="View all collections"
                  actionHref="/lab/collections"
                />
              </div>
            ) : (
              <div className="mt-3 divide-y divide-slate-100">
                {scheduledCollections.map((col) => {
                  const patientName = col.order?.patient?.fullName || "Patient";
                  const initial = patientName.trim().charAt(0).toUpperCase() || "P";
                  const isDone = Boolean(col.sampleCollectedAt);

                  return (
                    <div
                      key={col.id}
                      className="flex items-center justify-between py-3 transition hover:bg-slate-50/60 rounded-lg px-2 -mx-2"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-xs font-bold text-sky-700 shadow-2xs">
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-slate-900 leading-tight">
                            {patientName}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <Clock className="h-3 w-3 shrink-0 text-slate-400" />
                            <span className="truncate">{col.scheduledSlot || "Morning Slot"}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate">
                            {col.phlebotomistName ? `Phleb: ${col.phlebotomistName}` : "Phleb: Unassigned"}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 pl-2">
                        {isDone ? (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            Collected
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                            Scheduled
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <Link
              href="/lab/collections"
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 shadow-2xs"
            >
              <Truck className="h-3.5 w-3.5 text-slate-500" />
              <span>Manage phlebotomist assignments</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
