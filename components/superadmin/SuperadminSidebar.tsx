"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRole } from "@prisma/client";

interface SuperadminSidebarProps {
  userRole: UserRole;
  userEmail: string;
}

interface NavSection {
  title: string;
  items: Array<{
    label: string;
    href: string;
    icon: string;
  }>;
}

export function SuperadminSidebar({ userRole }: SuperadminSidebarProps) {
  const pathname = usePathname();

  const navSections: NavSection[] = [
    {
      title: "OVERVIEW",
      items: [
        { label: "Dashboard", href: "/superadmin/dashboard", icon: "📊" },
      ],
    },
    {
      title: "LABORATORIES",
      items: [
        { label: "All Labs", href: "/superadmin/labs", icon: "🔬" },
        { label: "Pending Verification", href: "/superadmin/labs/pending", icon: "⏳" },
        { label: "Suspended Labs", href: "/superadmin/labs/suspended", icon: "🚫" },
      ],
    },
    {
      title: "CENTRAL CATALOGUE",
      items: [
        { label: "Test Master", href: "/superadmin/catalogue/test-master", icon: "🧬" },
        { label: "Categories", href: "/superadmin/catalogue/categories", icon: "📑" },
        { label: "Catalogue Matching", href: "/superadmin/catalogue/matching", icon: "🔄" },
      ],
    },
    {
      title: "OPERATIONS",
      items: [
        { label: "All Orders", href: "/superadmin/orders", icon: "📦" },
        { label: "Patients", href: "/superadmin/patients", icon: "👥" },
        { label: "Report Centre", href: "/superadmin/reports", icon: "📄" },
      ],
    },
    {
      title: "SAAS SUBSCRIPTIONS (LAB → GYREX)",
      items: [
        { label: "Subscription Overview", href: "/superadmin/subscriptions", icon: "💳" },
        { label: "SaaS Plans", href: "/superadmin/subscriptions/plans", icon: "🏷️" },
        { label: "Active Subscriptions", href: "/superadmin/subscriptions/active", icon: "⚡" },
        { label: "Failed Payments", href: "/superadmin/subscriptions/failed", icon: "⚠️" },
        { label: "SaaS Invoices", href: "/superadmin/subscriptions/invoices", icon: "🧾" },
      ],
    },
    {
      title: "FINANCIAL SEPARATION",
      items: [
        { label: "Patient Diagnostic Payments", href: "/superadmin/payments/patient-payments", icon: "💰" },
        { label: "Gyrex SaaS Payments", href: "/superadmin/payments/gyrex-payments", icon: "📈" },
        { label: "Platform Refunds", href: "/superadmin/payments/refunds", icon: "↩️" },
      ],
    },
    {
      title: "ACCESS CONTROL",
      items: [
        { label: "Platform Users", href: "/superadmin/users", icon: "🛡️" },
        { label: "Roles & Permissions", href: "/superadmin/roles", icon: "🔑" },
      ],
    },
    {
      title: "SUPPORT & SYSTEM",
      items: [
        { label: "Support Tickets", href: "/superadmin/support", icon: "🎫" },
        { label: "Audit Logs", href: "/superadmin/system/audit-logs", icon: "📜" },
        { label: "Security Alerts", href: "/superadmin/system/security-alerts", icon: "🚨" },
        { label: "System Health", href: "/superadmin/system/health", icon: "🩺" },
        { label: "Notifications", href: "/superadmin/system/notifications", icon: "🔔" },
        { label: "Integrations", href: "/superadmin/system/integrations", icon: "🔌" },
        { label: "Platform Settings", href: "/superadmin/system/settings", icon: "⚙️" },
      ],
    },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white/95 shadow-sm backdrop-blur-sm">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white shadow-sm">
          G
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold tracking-tight text-slate-900">Gyrex Lab</span>
            <span className="rounded border border-blue-200 bg-blue-50 px-1 text-[9px] font-bold text-blue-700">
              SUPERADMIN
            </span>
          </div>
          <p className="text-[10px] text-slate-500">Platform Command Center</p>
        </div>
      </div>

      {/* Navigation Tree */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 text-xs">
        {navSections.map((section) => (
          <div key={section.title}>
            <div className="px-2 pb-1.5 text-[10px] font-bold tracking-[0.12em] text-slate-400">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 font-medium transition ${
                      isActive
                        ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Role Context */}
      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
            SA
          </div>
          <div className="overflow-hidden">
            <p className="truncate text-xs font-semibold text-slate-900">{userRole}</p>
            <p className="truncate text-[10px] text-slate-500">Platform Administrator</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
