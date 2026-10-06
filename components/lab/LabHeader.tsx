"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { UserRole } from "@prisma/client";
import { ArrowUpRight, ChevronDown, Menu } from "lucide-react";

interface LabHeaderProps {
  lab: {
    id: string;
    name: string;
    slug: string;
    status: string;
    isVerified: boolean;
    nablAccreditationNumber?: string | null;
  };
  user: {
    fullName: string;
    role: UserRole;
  };
  onMenuToggle?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function LabHeader({
  lab,
  user,
  onMenuToggle,
  isCollapsed,
  onToggleCollapse,
}: LabHeaderProps) {
  const initial = user.fullName.trim().charAt(0).toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-6 lg:px-8 backdrop-blur-md">
      {/* Left Area: Desktop collapse button & Mobile menu toggle & Lab Name/NABL */}
      <div className="flex items-center gap-2">
        {/* Mobile menu toggle */}
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Toggle mobile menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* Desktop sidebar collapse toggle */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:inline-flex rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* Desktop Laboratory Context: Laboratory Name & NABL Status Badge */}
        <div className="hidden lg:flex items-center gap-2.5 ml-1">
          <span className="text-sm font-bold text-slate-900 tracking-tight truncate max-w-[280px]" title={lab.name}>
            {lab.name}
          </span>
          {lab.nablAccreditationNumber ? (
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
              NABL Accredited
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
              Diagnostic Lab
            </span>
          )}
        </div>
      </div>

      {/* Mobile Center: Prominently centered Gyrex Labs logo (approx 50% larger) */}
      <div className="flex lg:hidden items-center justify-center">
        <Link href="/lab/dashboard" className="flex items-center">
          <Image
            src="/branding/gyrex-labs.svg"
            alt="Gyrex Labs"
            width={130}
            height={34}
            className="h-7 w-auto"
            priority
          />
        </Link>
      </div>

      {/* Right Area: Store Preview, User Profile */}
      <div className="flex items-center gap-3">
        <Link
          href={`/${lab.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 shadow-2xs"
        >
          <span>Store preview</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>

        <div className="hidden h-4 w-px bg-slate-200 sm:block" />

        <div className="flex items-center gap-2 text-left cursor-default">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-sky-200 bg-sky-100 text-xs font-bold text-sky-700 shadow-2xs">
            {initial}
          </div>
          <div className="hidden md:block">
            <div className="flex items-center gap-1">
              <p className="text-xs font-semibold text-slate-900 leading-tight">{user.fullName}</p>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </div>
            <p className="text-[10px] text-slate-500 font-medium leading-tight">{user.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
