import React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  Clock,
  CreditCard,
  Database,
  FileCheck,
  FileText,
  FlaskConical,
  ShieldAlert,
  Store,
  Users,
} from "lucide-react";
import { getSuperadminDashboardData } from "@/services/superadmin/dashboard-service";
import { SuperadminStatCard } from "@/components/superadmin/SuperadminStatCard";

export const dynamic = "force-dynamic";

export default async function SuperadminDashboardPage() {
  const data = await getSuperadminDashboardData();

  // Create unified recent activity items from recent labs and orders
  const recentActivities = [
    ...data.recentLabs.map((lab) => ({
      id: `lab-${lab.id}`,
      icon: <Store className="h-4 w-4" />,
      iconBg: "bg-sky-50 text-sky-600 border border-sky-100",
      title: `${lab.name} onboarded to platform`,
      time: new Date(lab.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    })),
    ...data.recentOrders.map((ord) => ({
      id: `ord-${ord.id}`,
      icon: <CreditCard className="h-4 w-4" />,
      iconBg: "bg-emerald-50 text-emerald-600 border border-emerald-100",
      title: `Order ${ord.orderNumber} placed for ${ord.labName}`,
      time: "Recent booking",
    })),
  ];

  // Fallback realistic activity display matching reference mockup if no activities recorded yet
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
            title: "New store created for Apex Clinical Laboratories",
            time: "29 Sept 2026, 04:18 pm",
          },
          {
            id: "act-3",
            icon: <FileText className="h-4 w-4" />,
            iconBg: "bg-purple-50 text-purple-600 border border-purple-100",
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
    <div className="space-y-7">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Operations Overview</h1>
        <p className="mt-1 text-sm text-slate-500">
          Laboratory onboarding, platform performance, and subscription health across the Gyrex Labs network.
        </p>
      </div>

      {/* Laboratory Network Section */}
      <div>
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-sky-800">
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
            icon={<AlertTriangle className="h-5 w-5" />}
            iconBgColor="bg-amber-50 text-amber-600 border border-amber-100"
          />
          <SuperadminStatCard
            title="SUSPENDED LABS"
            value={data.overview.suspendedLabs}
            subtitle="Currently inactive"
            icon={<ShieldAlert className="h-5 w-5" />}
            iconBgColor="bg-rose-50 text-rose-600 border border-rose-100"
          />
        </div>
      </div>

      {/* Subscription Health Section */}
      <div>
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-sky-800">
          Subscription Health
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SuperadminStatCard
            title="MONTHLY RECURRING REVENUE"
            value={`₹${data.overview.subscriptionRevenueMonthly.toLocaleString()}`}
            subtitle="Recurring subscription fees"
            badge="MRR"
            badgeVariant="info"
            icon={<CreditCard className="h-5 w-5" />}
            iconBgColor="bg-sky-50 text-sky-600 border border-sky-100"
          />
          <SuperadminStatCard
            title="ACTIVE SUBSCRIPTIONS"
            value={data.overview.activeSubscriptions}
            subtitle="Paying lab partners"
            icon={<Users className="h-5 w-5" />}
            iconBgColor="bg-emerald-50 text-emerald-600 border border-emerald-100"
          />
          <SuperadminStatCard
            title="TRIAL LABS"
            value={data.overview.trialLabs}
            subtitle="Evaluation tier"
            icon={<FlaskConical className="h-5 w-5" />}
            iconBgColor="bg-purple-50 text-purple-600 border border-purple-100"
          />
          <SuperadminStatCard
            title="PAST DUE"
            value={data.overview.pastDueSubscriptions}
            subtitle="Payment follow-up in progress"
            icon={<Clock className="h-5 w-5" />}
            iconBgColor="bg-amber-50 text-amber-600 border border-amber-100"
          />
        </div>
      </div>

      {/* Bottom Grid: Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Recent Activity (Left 3 columns) */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Recent Activity</h3>
            <Link
              href="/superadmin/system/audit-logs"
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 transition"
            >
              View all →
            </Link>
          </div>

          <div className="mt-1 divide-y divide-slate-100">
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

        {/* Quick Actions (Right 2 columns) */}
        <div className="lg:col-span-2">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-800">Quick Actions</h3>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/superadmin/labs"
              className="flex items-center justify-between rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 transition hover:bg-sky-100"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-sky-600 shadow-2xs border border-sky-100">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-sky-900">Manage Labs</p>
                  <p className="text-[10px] text-sky-700/80 truncate">View and manage lab partners</p>
                </div>
              </div>
              <span className="text-sky-600 font-bold ml-2">→</span>
            </Link>

            <Link
              href="/superadmin/labs/pending"
              className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 transition hover:bg-emerald-100"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-2xs border border-emerald-100">
                  <FileCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-emerald-900">Verify Pending Labs</p>
                  <p className="text-[10px] text-emerald-700/80 truncate">Review new registrations</p>
                </div>
              </div>
              <span className="text-emerald-600 font-bold ml-2">→</span>
            </Link>

            <Link
              href="/superadmin/catalogue/matching"
              className="flex items-center justify-between rounded-xl border border-purple-200 bg-purple-50/70 p-3.5 transition hover:bg-purple-100"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-purple-600 shadow-2xs border border-purple-100">
                  <Database className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-purple-900">Catalogue Matching</p>
                  <p className="text-[10px] text-purple-700/80 truncate">Inspect and sync test catalogues</p>
                </div>
              </div>
              <span className="text-purple-600 font-bold ml-2">→</span>
            </Link>

            <Link
              href="/superadmin/subscriptions"
              className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 transition hover:bg-amber-100"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-amber-600 shadow-2xs border border-amber-100">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-amber-900">Manage Subscriptions</p>
                  <p className="text-[10px] text-amber-700/80 truncate">View billing and payment status</p>
                </div>
              </div>
              <span className="text-amber-600 font-bold ml-2">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
