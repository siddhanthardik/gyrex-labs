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
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-6 backdrop-blur-md">
      {/* Search Input */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Search platform labs, orders, patients..."
            className="w-72 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none transition"
          />
        </div>
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-3">
        <Link
          href="/superadmin/system/alerts"
          className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:text-white transition"
        >
          <span>🚨</span>
          <span className="text-[11px]">Security Alerts</span>
        </Link>

        <div className="h-4 w-px bg-zinc-800" />

        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-xs font-semibold text-white">{userName}</p>
            <p className="text-[10px] text-zinc-400">{userEmail}</p>
          </div>

          <button
            type="button"
            disabled={isLoggingOut}
            onClick={handleLogout}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:border-zinc-700 hover:text-rose-400 transition"
          >
            {isLoggingOut ? "..." : "Sign Out"}
          </button>
        </div>
      </div>
    </header>
  );
}
