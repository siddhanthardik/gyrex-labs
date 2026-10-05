"use client";

import React from "react";
import Link from "next/link";
import { UserRole } from "@prisma/client";
import { ArrowUpRight, Menu } from "lucide-react";

interface LabHeaderProps {
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
  onMenuToggle?: () => void;
}

export function LabHeader({ lab, user, onMenuToggle }: LabHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 sm:px-8 backdrop-blur-md">
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Laboratory Workspace
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href={`/${lab.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
        >
          <span>Store preview</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>

        <div className="hidden h-4 w-px bg-slate-200 sm:block" />

        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-xs font-semibold text-sky-700">
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden md:block text-left text-xs">
            <p className="font-semibold text-slate-900">{user.fullName}</p>
            <p className="text-[11px] text-slate-500">{user.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
