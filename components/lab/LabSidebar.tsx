"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRole } from "@prisma/client";

interface LabSidebarProps {
  lab: {
    id: string;
    name: string;
    slug: string;
    status: string;
    isVerified: boolean;
  };
  user: {
    fullName: string;
    role: UserRole;
  };
  isOpen?: boolean;
  onClose?: () => void;
}

export function LabSidebar({ lab, user, isOpen = false, onClose }: LabSidebarProps) {
  const pathname = usePathname();

  const isStaff = user.role === UserRole.LAB_STAFF;

  const navSections = [
    {
      title: "Operations",
      items: [
        { label: "Dashboard", href: "/lab/dashboard", icon: "📊", show: true },
        { label: "Orders", href: "/lab/orders", icon: "📦", show: true },
        { label: "Home Collections", href: "/lab/collections", icon: "🚚", show: true },
        { label: "Patients", href: "/lab/patients", icon: "👥", show: true },
        { label: "Diagnostic Reports", href: "/lab/reports", icon: "📄", show: true },
      ],
    },
    {
      title: "Store & Catalogue",
      items: [
        { label: "Tests Catalogue", href: "/lab/catalogue", icon: "🧪", show: !isStaff },
        { label: "Add from Test Master", href: "/lab/catalogue/test-master", icon: "📚", show: !isStaff },
        { label: "Import Tests", href: "/lab/catalogue/import", icon: "📥", show: !isStaff },
        { label: "Health Packages", href: "/lab/packages", icon: "🎁", show: !isStaff },
        { label: "Store Settings", href: "/lab/settings", icon: "⚙️", show: !isStaff },
        { label: "Publish Checklist", href: "/lab/publish", icon: "🚀", show: !isStaff },
      ],
    },
    {
      title: "Administration",
      items: [
        { label: "Patient Payment Settings", href: "/lab/payment-settings", icon: "💳", show: !isStaff },
        { label: "Gyrex Subscription", href: "/lab/subscription", icon: "⚡", show: !isStaff },
        { label: "Staff Members", href: "/lab/staff", icon: "🛡️", show: !isStaff },
        { label: "Help & Support", href: "/lab/support", icon: "❓", show: true },
      ],
    },
  ];

  const getStatusBadge = () => {
    switch (lab.status) {
      case "ACTIVE":
        return <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">Active Store</span>;
      case "PENDING_VERIFICATION":
        return <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20">Pending Verification</span>;
      case "SUSPENDED":
        return <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-400 border border-rose-500/20">Suspended</span>;
      default:
        return <span className="inline-flex items-center rounded-full bg-zinc-500/10 px-2 py-0.5 text-xs font-semibold text-zinc-400 border border-zinc-500/20">Draft</span>;
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white/95 shadow-sm backdrop-blur-sm transition-transform duration-200 lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand & Lab Header */}
        <div className="flex h-20 items-center justify-between border-b border-slate-200 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm">
              G
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600">Gyrex Lab</span>
                {lab.isVerified && (
                  <span title="Verified by Gyrex" className="text-[10px] font-semibold text-emerald-600">✓</span>
                )}
              </div>
              <h1 className="truncate text-sm font-semibold text-slate-900" title={lab.name}>
                {lab.name}
              </h1>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status pill */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <span className="text-[11px] font-medium text-slate-500">Store Status:</span>
          {getStatusBadge()}
        </div>

        {/* Navigation links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navSections.map((section, idx) => {
            const visibleItems = section.items.filter((item) => item.show);
            if (visibleItems.length === 0) return null;

            return (
              <div key={idx} className="space-y-1">
                <h3 className="px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  {section.title}
                </h3>
                {visibleItems.map((item) => {
                  const isActive =
                    item.href === "/lab/dashboard"
                      ? pathname === "/lab/dashboard" || pathname === "/lab"
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        isActive
                          ? "border border-blue-200 bg-blue-50 text-blue-700"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <span className="text-base">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* User context & Store Preview */}
        <div className="border-t border-slate-200 bg-slate-50/80 p-4 space-y-3">
          <Link
            href={`/${lab.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            <span>↗ Preview Digital Store</span>
          </Link>

          <div className="flex items-center justify-between pt-1">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-900">{user.fullName}</p>
              <p className="text-[11px] text-slate-500">{user.role}</p>
            </div>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 transition hover:border-red-200 hover:text-red-600"
                title="Sign out"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
