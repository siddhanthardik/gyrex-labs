"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { UserRole } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  BadgeCheck,
  Boxes,
  BriefcaseMedical,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  CreditCard,
  FileText,
  FolderKanban,
  Globe,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  PackageCheck,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Users,
  X,
} from "lucide-react";

interface LabSidebarProps {
  lab: {
    id: string;
    name: string;
    slug: string;
    code?: string;
    status: string;
    isVerified: boolean;
    nablAccreditationNumber?: string | null;
  };
  user: {
    fullName: string;
    role: UserRole;
  };
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function LabSidebar({
  lab,
  user,
  isOpen = false,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}: LabSidebarProps) {
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      // Fallback redirect on error
    } finally {
      window.location.href = "/login";
    }
  };

  const isStaff = user.role === UserRole.LAB_STAFF;
  const userInitial = user.fullName.trim().charAt(0).toUpperCase() || "U";

  const navSections: Array<{
    title: string;
    items: Array<{ label: string; href: string; icon: LucideIcon; show: boolean }>;
  }> = [
    {
      title: "Operations",
      items: [
        { label: "Dashboard", href: "/lab/dashboard", icon: LayoutDashboard, show: true },
        { label: "Orders", href: "/lab/orders", icon: PackageCheck, show: true },
        { label: "Home collections", href: "/lab/collections", icon: ShoppingCart, show: true },
        { label: "Patients", href: "/lab/patients", icon: Users, show: true },
        { label: "Reports", href: "/lab/reports", icon: FileText, show: true },
      ],
    },
    {
      title: "Store & Catalogue",
      items: [
        { label: "Catalogue", href: "/lab/catalogue", icon: BriefcaseMedical, show: !isStaff },
        { label: "Test master", href: "/lab/catalogue/test-master", icon: FolderKanban, show: !isStaff },
        { label: "Import tests", href: "/lab/catalogue/import", icon: Boxes, show: !isStaff },
        { label: "Health packages", href: "/lab/packages", icon: PackageCheck, show: !isStaff },
        { label: "Store settings", href: "/lab/settings", icon: Settings, show: !isStaff },
        { label: "WhatsApp channel", href: "/lab/whatsapp", icon: MessageSquare, show: !isStaff },
        { label: "Publish checklist", href: "/lab/publish", icon: CheckCircle2, show: !isStaff },
      ],
    },
    {
      title: "Administration",
      items: [
        { label: "Payment settings", href: "/lab/payment-settings", icon: CreditCard, show: !isStaff },
        { label: "Gyrex subscription", href: "/lab/subscription", icon: BadgeCheck, show: !isStaff },
        { label: "Staff members", href: "/lab/staff", icon: ShieldCheck, show: !isStaff },
        { label: "Help & support", href: "/lab/support", icon: Globe, show: true },
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
        {/* Sidebar Header: Enlarged Gyrex Labs Branding */}
        <div
          className={`flex h-16 items-center border-b border-slate-200 px-4 ${
            isCollapsed ? "justify-between lg:justify-center" : "justify-between"
          }`}
        >
          <Link
            href="/lab/dashboard"
            className="flex items-center gap-2"
            title="Gyrex Labs Operations"
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
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navSections.map((section, idx) => {
            const visibleItems = section.items.filter((item) => item.show);
            if (visibleItems.length === 0) return null;

            return (
              <div key={idx} className="space-y-1">
                <h3
                  className={`px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 ${
                    isCollapsed ? "lg:hidden" : ""
                  }`}
                >
                  {section.title}
                </h3>
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/lab/dashboard"
                      ? pathname === "/lab/dashboard" || pathname === "/lab"
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      title={isCollapsed ? item.label : undefined}
                      className={`flex items-center gap-3 rounded-lg text-sm font-medium transition ${
                        isCollapsed
                          ? "px-3 py-2.5 lg:justify-center lg:px-2"
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
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="border-t border-slate-200 bg-slate-50/70 p-3 space-y-2">
          {isCollapsed ? (
            <div className="hidden lg:flex flex-col items-center gap-2">
              <Link
                href={`/${lab.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Preview digital store"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 transition shadow-2xs"
              >
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <form onSubmit={handleLogout} action="/api/auth/logout" method="POST" className="w-full flex justify-center">
                <button
                  type="submit"
                  disabled={isLoggingOut}
                  title="Sign out"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:border-slate-300 transition"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
            </div>
          ) : null}

          {/* Full Footer view for expanded desktop & mobile drawer */}
          <div className={isCollapsed ? "lg:hidden space-y-2" : "space-y-2"}>
            <Link
              href={`/${lab.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 shadow-2xs"
            >
              <span>Preview digital store</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>

            <div className="flex items-center justify-between pt-1">
              <div className="min-w-0 flex items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-sky-200 bg-sky-100 text-[11px] font-bold text-sky-700">
                  {userInitial}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-900 leading-tight">{user.fullName}</p>
                  <p className="text-[10px] text-slate-500 font-medium leading-tight">{user.role}</p>
                </div>
              </div>
              <form onSubmit={handleLogout} action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  disabled={isLoggingOut}
                  className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-50"
                  title="Sign out"
                >
                  <LogOut className="h-3 w-3 text-slate-400" />
                  <span>{isLoggingOut ? "..." : "Exit"}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
