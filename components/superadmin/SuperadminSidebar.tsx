"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRole } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRightLeft,
  BadgeCheck,
  BellRing,
  BookOpenText,
  Boxes,
  Building2,
  CircleDashed,
  Clock3,
  CreditCard,
  FileText,
  FolderKanban,
  KeyRound,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  PackageCheck,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

interface SuperadminSidebarProps {
  userRole: UserRole;
  userEmail: string;
}

interface NavSection {
  title: string;
  items: Array<{
    label: string;
    href: string;
    icon: LucideIcon;
  }>;
}

export function SuperadminSidebar({ userRole }: SuperadminSidebarProps) {
  const pathname = usePathname();

  const navSections: NavSection[] = [
    {
      title: "Overview",
      items: [{ label: "Dashboard", href: "/superadmin/dashboard", icon: LayoutDashboard }],
    },
    {
      title: "Laboratories",
      items: [
        { label: "Labs", href: "/superadmin/labs", icon: Building2 },
        { label: "Pending verification", href: "/superadmin/labs/pending", icon: Clock3 },
        { label: "Suspended labs", href: "/superadmin/labs/suspended", icon: CircleDashed },
      ],
    },
    {
      title: "Catalogue",
      items: [
        { label: "Test master", href: "/superadmin/catalogue/test-master", icon: BookOpenText },
        { label: "Categories", href: "/superadmin/catalogue/categories", icon: FolderKanban },
        { label: "Matching", href: "/superadmin/catalogue/matching", icon: ArrowRightLeft },
      ],
    },
    {
      title: "Operations",
      items: [
        { label: "Orders", href: "/superadmin/orders", icon: PackageCheck },
        { label: "Patients", href: "/superadmin/patients", icon: Users },
        { label: "Reports", href: "/superadmin/reports", icon: FileText },
      ],
    },
    {
      title: "Subscriptions",
      items: [
        { label: "Overview", href: "/superadmin/subscriptions", icon: CreditCard },
        { label: "Plans", href: "/superadmin/subscriptions/plans", icon: Boxes },
        { label: "Active", href: "/superadmin/subscriptions/active", icon: BadgeCheck },
        { label: "Failed", href: "/superadmin/subscriptions/failed", icon: ShieldCheck },
        { label: "Invoices", href: "/superadmin/subscriptions/invoices", icon: ScrollText },
      ],
    },
    {
      title: "Payments",
      items: [
        { label: "Patient payments", href: "/superadmin/payments/patient-payments", icon: Landmark },
        { label: "Gyrex payments", href: "/superadmin/payments/gyrex-payments", icon: CreditCard },
        { label: "Refunds", href: "/superadmin/payments/refunds", icon: ArrowRightLeft },
      ],
    },
    {
      title: "Access",
      items: [
        { label: "Users", href: "/superadmin/users", icon: Users },
        { label: "Roles", href: "/superadmin/roles", icon: KeyRound },
      ],
    },
    {
      title: "Support & System",
      items: [
        { label: "Tickets", href: "/superadmin/support", icon: LifeBuoy },
        { label: "Audit logs", href: "/superadmin/system/audit-logs", icon: ScrollText },
        { label: "Security alerts", href: "/superadmin/system/security-alerts", icon: BellRing },
        { label: "System health", href: "/superadmin/system/health", icon: ShieldCheck },
        { label: "Notifications", href: "/superadmin/system/notifications", icon: BellRing },
        { label: "Integrations", href: "/superadmin/system/integrations", icon: Boxes },
        { label: "Settings", href: "/superadmin/system/settings", icon: Settings },
      ],
    },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white/95 shadow-sm backdrop-blur-sm">
      <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white shadow-sm">
          G
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold tracking-tight text-slate-900">Gyrex Lab</span>
            <span className="rounded border border-blue-200 bg-blue-50 px-1 text-[9px] font-bold text-blue-700">
              ADMIN
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 text-xs">
        {navSections.map((section) => (
          <div key={section.title}>
            <div className="px-2 pb-1.5 text-[10px] font-bold tracking-[0.12em] text-slate-400">
              {section.title.toUpperCase()}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
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
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
            {userRole.slice(0, 2).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="truncate text-xs font-semibold text-slate-900">{userRole}</p>
            <p className="truncate text-[10px] text-slate-500">Platform administrator</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
