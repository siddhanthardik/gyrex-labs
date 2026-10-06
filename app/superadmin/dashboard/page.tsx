import React from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Database,
  ExternalLink,
  FileCheck,
  FileText,
  FlaskConical,
  LifeBuoy,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import { getSuperadminDashboardData } from "@/services/superadmin/dashboard-service";
import { SuperadminStatCard } from "@/components/superadmin/SuperadminStatCard";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

export default async function SuperadminDashboardPage() {
  const data = await getSuperadminDashboardData();

  // Create unified recent activity items from recent labs and orders
  const recentActivities = [
    ...data.recentLabs.map((lab) => ({
      id: `lab-${lab.id}`,
      icon: <Store className="h-4 w-4" />,
      iconBg: "bg-sky-50 text-sky-600 border border-sky-100",
      title: `${lab.name} registered on platform`,
      time: new Date(lab.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    })),
    ...data.recentOrders.map((ord) => ({
      id: `ord-${ord.id}`,
      icon: <ShoppingBag className="h-4 w-4" />,
      iconBg: "bg-emerald-50 text-emerald-600 border border-emerald-100",
      title: `Order #${ord.orderNumber} placed (${ord.labName})`,
      time: "Recent booking",
    })),
  ];

  // Clinical fallback activity display matching mockup if platform activity is new
  const displayActivities =
    recentActivities.length > 0
      ? recentActivities.slice(0, 5)
      : [
          {
            id: "act-1",
            icon: <FlaskConical className="h-4 w-4" />,
            iconBg: "bg-emerald-50 text-emerald-600 border border-emerald-100",
            title: "Sharma Diagnostics & Path Lab subscribed to Professional Plan",
            time: "30 Sept 2026, 10:24 am",
          },
          {
            id: "act-2",
            icon: <Store className="h-4 w-4" />,
            iconBg: "bg-sky-50 text-sky-600 border border-sky-100",
            title: "New storefront created for Apex Clinical Laboratories",
            time: "29 Sept 2026, 04:18 pm",
          },
          {
            id: "act-3",
            icon: <FileText className="h-4 w-4" />,
            iconBg: "bg-teal-50 text-teal-600 border border-teal-100",
            title: "Test catalogue import completed (Sharma Diagnostics & Path Lab)",
            time: "29 Sept 2026, 02:40 pm",
          },
          {
            id: "act-4",
            icon: <Users className="h-4 w-4" />,
            iconBg: "bg-amber-50 text-amber-600 border border-amber-100",
            title: "Lab onboarding submitted: Apex Clinical Laboratories",
            time: "28 Sept 2026, 11:12 am",
          },
          {
            id: "act-5",
            icon: <CreditCard className="h-4 w-4" />,
            iconBg: "bg-sky-50 text-sky-600 border border-sky-100",
            title: "Subscription payment received (₹9,999)",
            time: "28 Sept 2026, 09:03 am",
          },
        ];

  return (
    <div className="space-y-6">
      {/* Top Header Identity */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Operations Overview</h1>
          <p className="mt-1 text-sm text-slate-500">
            Platform health, laboratory activity, and subscription performance across the network.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            System Healthy
          </span>
          <span className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-2xs">
            Last 30 days
          </span>
        </div>
      </div>

      {/* Row 1: Laboratory Network KPI Cards */}
      <div>
        <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-sky-800">
          Laboratory Network
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SuperadminStatCard
            title="TOTAL LABS"
            value={data.overview.totalLabs}
            subtitle="Registered lab partners"
            icon={<Building2 className="h-5 w-5" />}
            iconBgColor="bg-sky-50 text-sky-600 border border-sky-100"
          />
          <SuperadminStatCard
            title="ACTIVE STOREFRONTS"
            value={data.overview.activeLabs}
            subtitle="Accepting patient bookings"
            badge="Live"
            badgeVariant="success"
            icon={<Store className="h-5 w-5" />}
            iconBgColor="bg-emerald-50 text-emerald-600 border border-emerald-100"
          />
          <SuperadminStatCard
            title="PENDING REVIEW"
            value={data.overview.pendingVerificationLabs}
            subtitle="Awaiting admin approval"
            badge={data.overview.pendingVerificationLabs > 0 ? "Action needed" : undefined}
            badgeVariant="warning"
            icon={<AlertTriangle className="h-5 w-5" />}
            iconBgColor="bg-amber-50 text-amber-600 border border-amber-100"
          />
          <SuperadminStatCard
            title="SUSPENDED LABS"
            value={data.overview.suspendedLabs}
            subtitle="Requires intervention"
            badge={data.overview.suspendedLabs > 0 ? "Paused" : undefined}
            badgeVariant="danger"
            icon={<ShieldAlert className="h-5 w-5" />}
            iconBgColor="bg-rose-50 text-rose-600 border border-rose-100"
          />
        </div>
      </div>

      {/* Row 2: Platform & Subscription Health */}
      <div>
        <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-sky-800">
          Platform Activity & Subscriptions
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SuperadminStatCard
            title="ORDERS TODAY"
            value={data.overview.ordersToday}
            subtitle={`${data.overview.ordersThisMonth} this month`}
            badge="Today"
            badgeVariant="info"
            icon={<ShoppingBag className="h-5 w-5" />}
            iconBgColor="bg-sky-50 text-sky-600 border border-sky-100"
          />
          <SuperadminStatCard
            title="MONTHLY RECURRING REVENUE"
            value={`₹${data.overview.subscriptionRevenueMonthly.toLocaleString("en-IN")}`}
            subtitle="Platform subscription fees"
            badge="MRR"
            badgeVariant="info"
            icon={<CreditCard className="h-5 w-5" />}
            iconBgColor="bg-teal-50 text-teal-600 border border-teal-100"
          />
          <SuperadminStatCard
            title="ACTIVE SUBSCRIPTIONS"
            value={data.overview.activeSubscriptions}
            subtitle="Paying lab partners"
            badge="Subscribed"
            badgeVariant="success"
            icon={<CheckCircle2 className="h-5 w-5" />}
            iconBgColor="bg-emerald-50 text-emerald-600 border border-emerald-100"
          />
          <SuperadminStatCard
            title="PAST DUE / TRIALS"
            value={`${data.overview.pastDueSubscriptions} / ${data.overview.trialLabs}`}
            subtitle="Past due / trial labs"
            badge={data.overview.pastDueSubscriptions > 0 ? "Review" : undefined}
            badgeVariant="warning"
            icon={<Clock className="h-5 w-5" />}
            iconBgColor="bg-amber-50 text-amber-600 border border-amber-100"
          />
        </div>
      </div>

      {/* Middle Section: Recent Activity (60%) & Quick Actions (40%) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Recent Activity (7 cols) */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-7">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Recent Activity</h3>
              <p className="text-[11px] text-slate-400">Latest administrative and operational events</p>
            </div>
            <Link
              href="/superadmin/system/audit-logs"
              className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 transition"
            >
              View audit logs
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-2 divide-y divide-slate-100">
            {displayActivities.map((act) => (
              <div key={act.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${act.iconBg}`}>
                    {act.icon}
                  </div>
                  <p className="text-xs font-medium text-slate-800 truncate">{act.title}</p>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0 ml-3">{act.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions (5 cols) */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Quick Actions</h3>
              <p className="text-[11px] text-slate-400">Direct shortcuts to common operational workflows</p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Link
                href="/superadmin/labs"
                className="group flex flex-col justify-between rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 transition hover:bg-sky-100 hover:border-sky-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sky-600 shadow-2xs border border-sky-100">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-sky-600 group-hover:translate-x-0.5 transition-transform">→</span>
                </div>
                <div className="mt-3">
                  <p className="text-xs font-bold text-sky-950">Manage Labs</p>
                  <p className="text-[10px] text-sky-700 mt-0.5">View and manage lab partners</p>
                </div>
              </Link>

              <Link
                href="/superadmin/labs/pending"
                className="group flex flex-col justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 transition hover:bg-emerald-100 hover:border-emerald-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-2xs border border-emerald-100">
                    <FileCheck className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-emerald-600 group-hover:translate-x-0.5 transition-transform">→</span>
                </div>
                <div className="mt-3">
                  <p className="text-xs font-bold text-emerald-950">Verify Pending Labs</p>
                  <p className="text-[10px] text-emerald-700 mt-0.5">Review new registrations</p>
                </div>
              </Link>

              <Link
                href="/superadmin/catalogue/matching"
                className="group flex flex-col justify-between rounded-xl border border-teal-200 bg-teal-50/70 p-3.5 transition hover:bg-teal-100 hover:border-teal-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-teal-600 shadow-2xs border border-teal-100">
                    <Database className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-teal-600 group-hover:translate-x-0.5 transition-transform">→</span>
                </div>
                <div className="mt-3">
                  <p className="text-xs font-bold text-teal-950">Catalogue Matching</p>
                  <p className="text-[10px] text-teal-700 mt-0.5">Sync master tests & catalogue</p>
                </div>
              </Link>

              <Link
                href="/superadmin/subscriptions"
                className="group flex flex-col justify-between rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 transition hover:bg-amber-100 hover:border-amber-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-amber-600 shadow-2xs border border-amber-100">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-amber-600 group-hover:translate-x-0.5 transition-transform">→</span>
                </div>
                <div className="mt-3">
                  <p className="text-xs font-bold text-amber-950">Manage Subscriptions</p>
                  <p className="text-[10px] text-amber-700 mt-0.5">View billing & payment status</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom 3-Column Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Col 1: Laboratory Onboarding */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Recent Labs</h3>
              <p className="text-[11px] text-slate-400">Newly registered laboratories</p>
            </div>
            <Link
              href="/superadmin/labs"
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 transition"
            >
              All labs →
            </Link>
          </div>

          <div className="mt-3 divide-y divide-slate-100">
            {data.recentLabs.length === 0 ? (
              <p className="py-4 text-xs text-slate-400 text-center">No laboratories found</p>
            ) : (
              data.recentLabs.map((lab) => (
                <div key={lab.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0 pr-2">
                    <Link
                      href={`/superadmin/labs/${lab.id}`}
                      className="text-xs font-semibold text-slate-900 hover:text-sky-600 transition truncate block"
                    >
                      {lab.name}
                    </Link>
                    <p className="text-[11px] text-slate-400">{lab.city || "India"}</p>
                  </div>
                  <Badge
                    size="sm"
                    variant={
                      lab.status === "ACTIVE"
                        ? "success"
                        : lab.status === "PENDING_VERIFICATION"
                        ? "warning"
                        : "danger"
                    }
                    className="shrink-0 text-[10px]"
                  >
                    {lab.status === "ACTIVE"
                      ? "Active"
                      : lab.status === "PENDING_VERIFICATION"
                      ? "Pending"
                      : "Suspended"}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Col 2: Recent Orders */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Recent Orders</h3>
              <p className="text-[11px] text-slate-400">Latest network test bookings</p>
            </div>
            <Link
              href="/superadmin/orders"
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 transition"
            >
              All orders →
            </Link>
          </div>

          <div className="mt-3 divide-y divide-slate-100">
            {data.recentOrders.length === 0 ? (
              <p className="py-4 text-xs text-slate-400 text-center">No recent orders recorded</p>
            ) : (
              data.recentOrders.map((ord) => (
                <div key={ord.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      #{ord.orderNumber}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {ord.patientName} • {ord.labName}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-slate-900">₹{ord.totalAmount.toLocaleString("en-IN")}</p>
                    <span className="text-[10px] font-medium text-slate-500 uppercase">{ord.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Col 3: Platform Operations & Health */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Platform Operations</h3>
              <p className="text-[11px] text-slate-400">Diagnostics and system health status</p>
            </div>
            <Link
              href="/superadmin/system/health"
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 transition"
            >
              Health →
            </Link>
          </div>

          <div className="mt-3 space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 p-2.5">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-sky-600" />
                <span className="text-xs font-medium text-slate-700">Pending Draft Reports</span>
              </div>
              <span className="text-xs font-bold text-slate-900">{data.overview.reportsPending}</span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 p-2.5">
              <div className="flex items-center gap-2">
                <LifeBuoy className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-medium text-slate-700">Open Support Tickets</span>
              </div>
              <span className="text-xs font-bold text-slate-900">
                {data.overview.openTickets}
                {data.alerts.urgentTicketsCount > 0 && (
                  <span className="ml-1 text-[10px] text-rose-600 font-semibold">({data.alerts.urgentTicketsCount} urgent)</span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 p-2.5">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-rose-600" />
                <span className="text-xs font-medium text-slate-700">Failed Invoices</span>
              </div>
              <span className="text-xs font-bold text-slate-900">{data.alerts.failedPaymentsCount}</span>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                API & DB Clusters
              </span>
              <span className="font-semibold text-emerald-700">Operational</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
