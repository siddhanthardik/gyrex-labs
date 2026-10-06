"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Menu, PanelLeft, PanelLeftClose, Search, ShieldAlert } from "lucide-react";

interface SuperadminHeaderProps {
  userEmail: string;
  userName: string;
  onMenuToggle?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function SuperadminHeader({
  userEmail,
  userName,
  onMenuToggle,
  isCollapsed,
  onToggleCollapse,
}: SuperadminHeaderProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      setIsLoggingOut(false);
    }
  };

  // Derive initials for avatar
  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "GS";

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-6 lg:px-8 backdrop-blur-md">
      <div className="flex flex-1 items-center gap-3 mr-4 max-w-xl">
        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={onMenuToggle}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Desktop collapse toggle */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 lg:flex shrink-0"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>

        {/* Central Search bar */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search labs, orders, patients, invoices..."
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {/* Security alerts CTA */}
        <Link
          href="/superadmin/system/security-alerts"
          className="hidden sm:flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-medium text-sky-700 transition hover:bg-sky-100"
        >
          <ShieldAlert className="h-3.5 w-3.5 text-sky-600" />
          <span className="text-[11px] font-semibold">Security alerts</span>
        </Link>

        <div className="hidden sm:block h-4 w-px bg-slate-200" />

        {/* Superadmin profile */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-sky-200 bg-sky-100 text-xs font-bold text-sky-700 shadow-xs">
            {initials}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold leading-tight text-slate-900">{userName || "Super Admin"}</p>
            <p className="text-[10px] text-slate-500 leading-tight">{userEmail}</p>
          </div>

          <button
            type="button"
            disabled={isLoggingOut}
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-rose-200 hover:text-rose-600"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isLoggingOut ? "Signing out..." : "Sign out"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
