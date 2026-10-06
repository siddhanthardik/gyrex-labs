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
}

export function LabSidebar({ lab, user, isOpen = false, onClose }: LabSidebarProps) {
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

  const navSections: Array<{ title: string; items: Array<{ label: string; href: string; icon: LucideIcon; show: boolean }> }> = [
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

  const getStatusBadge = () => {
    switch (lab.status) {
      case "ACTIVE":
        return <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Active store</span>;
      case "PENDING_VERIFICATION":
        return <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">Pending verification</span>;
      case "SUSPENDED":
        return <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">Suspended</span>;
      default:
        return <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">Draft</span>;
    }
  };

  return (
    <>
      {isOpen && <div onClick={onClose} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" />}

      <aside
        className={`fixed bottom-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white/95 shadow-xs backdrop-blur-sm transition-transform duration-200 lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <Link href="/lab/dashboard" className="flex items-center gap-2">
            <Image
              src="/branding/gyrex-labs.svg"
              alt="Gyrex Labs"
              width={110}
              height={28}
              className="h-5 w-auto"
              priority
            />
          </Link>
          {onClose && (
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Close navigation">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Tenant Laboratory Context */}
        <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Laboratory
            </span>
            {lab.code && (
              <span className="font-mono text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                {lab.code}
              </span>
            )}
          </div>
          <h2 className="truncate text-xs font-bold text-slate-900" title={lab.name}>
            {lab.name}
          </h2>

          {lab.nablAccreditationNumber && (
            <div className="flex items-center">
              <span className="inline-flex items-center rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                <span>NABL Accredited</span>
              </span>
            </div>
          )}

          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[10px] text-slate-500">Storefront</span>
            {getStatusBadge()}
          </div>
        </div>

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
                  const Icon = item.icon;
                  const isActive = item.href === "/lab/dashboard" ? pathname === "/lab/dashboard" || pathname === "/lab" : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        isActive ? "border border-sky-200 bg-sky-50 text-sky-700 font-semibold" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="border-t border-slate-200 bg-slate-50/80 p-4 space-y-3">
          <Link
            href={`/${lab.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
          >
            <span>Preview digital store</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>

          <div className="flex items-center justify-between pt-1">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-900">{user.fullName}</p>
              <p className="text-[11px] text-slate-500">{user.role}</p>
            </div>
            <form onSubmit={handleLogout} action="/api/auth/logout" method="POST">
              <button
                type="submit"
                disabled={isLoggingOut}
                className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-50"
                title="Sign out"
              >
                <LogOut className="h-3 w-3 text-slate-400" />
                <span>{isLoggingOut ? "Signing out..." : "Log out"}</span>
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
