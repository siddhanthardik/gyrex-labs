"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
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
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavSection {
  title: string;
  items: Array<{
    label: string;
    href: string;
    icon: LucideIcon;
  }>;
}

export function SuperadminSidebar({
  userRole,
  userEmail,
  isOpen = false,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}: SuperadminSidebarProps) {
  const pathname = usePathname();

  const navSections: NavSection[] = [
    {
      title: "Overview",
      items: [{ label: "Dashboard", href: "/superadmin/dashboard", icon: LayoutDashboard }],
    },
    {
      title: "Laboratories",
      items: [
        { label: "Laboratories", href: "/superadmin/labs", icon: Building2 },
        { label: "Pending verification", href: "/superadmin/labs/pending", icon: Clock3 },
        { label: "Suspended labs", href: "/superadmin/labs/suspended", icon: CircleDashed },
      ],
    },
    {
      title: "Catalogue",
      items: [
        { label: "Test master", href: "/superadmin/catalogue/test-master", icon: BookOpenText },
        { label: "Categories", href: "/superadmin/catalogue/categories", icon: FolderKanban },
        { label: "Catalogue Matching", href: "/superadmin/catalogue/matching", icon: ArrowRightLeft },
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
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white shadow-xs transition-all duration-200 lg:static ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${isCollapsed ? "w-72 lg:w-20" : "w-72 lg:w-64"}`}
      >
        {/* Top Header: Logo & Collapse Button */}
        <div
          className={`flex h-16 items-center border-b border-slate-200 px-4 ${
            isCollapsed ? "justify-between lg:justify-center" : "justify-between"
          }`}
        >
          <Link
            href="/superadmin/dashboard"
            className="flex items-center gap-2"
            title="Gyrex Labs Platform Governance"
          >
            <Image
              src="/branding/gyrex-labs.svg"
              alt="Gyrex Labs"
              width={140}
              height={36}
              className={`w-auto transition-all ${isCollapsed ? "h-6 lg:h-6" : "h-7"}`}
              priority
            />
          </Link>

          {/* Desktop collapse toggle */}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden lg:flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <span className="text-xs font-bold leading-none">{isCollapsed ? "»" : "«"}</span>
            </button>
          )}

          {/* Mobile close button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
              aria-label="Close navigation"
            >
              <span className="text-base font-bold leading-none">✕</span>
            </button>
          )}
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 text-xs">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <div
                className={`px-3 text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase ${
                  isCollapsed ? "lg:hidden" : ""
                }`}
              >
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/superadmin/dashboard"
                      ? pathname === "/superadmin/dashboard" || pathname === "/superadmin"
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      title={isCollapsed ? item.label : undefined}
                      className={`flex items-center gap-2.5 rounded-lg text-xs font-medium transition ${
                        isCollapsed
                          ? "px-3 py-2 lg:justify-center lg:px-2"
                          : "px-3 py-2"
                      } ${
                        isActive
                          ? "border border-sky-200 bg-sky-50 text-sky-700 font-semibold shadow-2xs"
                          : "border border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className={isCollapsed ? "lg:hidden truncate" : "truncate"}>
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer: Superadmin User Snippet */}
        <div className="border-t border-slate-200 bg-slate-50/70 p-3">
          {isCollapsed ? (
            <div className="hidden lg:flex flex-col items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full border border-sky-200 bg-sky-100 text-xs font-bold text-sky-700 shadow-2xs"
                title={`${userEmail} (SUPERADMIN)`}
              >
                GS
              </div>
            </div>
          ) : null}

          <div className={isCollapsed ? "lg:hidden" : ""}>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-2xs">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-sky-200 bg-sky-100 text-xs font-bold text-sky-700">
                GS
              </div>
              <div className="overflow-hidden min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-900">Gyrex Superadmin</p>
                <p className="truncate text-[10px] text-slate-500">{userEmail}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
