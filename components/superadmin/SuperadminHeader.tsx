"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface SuperadminHeaderProps {
  userEmail: string;
  userName: string;
}

export function SuperadminHeader({ userEmail, userName }: SuperadminHeaderProps) {
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

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/90 px-6 backdrop-blur-md">
      {/* Search Input */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Search platform labs, orders, patients..."
            className="w-72 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
          />
        </div>
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-3">
        <Link
          href="/superadmin/system/alerts"
          className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
        >
          <span>🚨</span>
          <span className="text-[11px]">Security Alerts</span>
        </Link>

        <div className="h-4 w-px bg-slate-200" />

        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-900">{userName}</p>
            <p className="text-[10px] text-slate-500">{userEmail}</p>
          </div>

          <button
            type="button"
            disabled={isLoggingOut}
            onClick={handleLogout}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-red-200 hover:text-red-600 transition"
          >
            {isLoggingOut ? "..." : "Sign Out"}
          </button>
        </div>
      </div>
    </header>
  );
}
