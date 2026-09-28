"use client";

import React from "react";
import Link from "next/link";
import { UserRole } from "@prisma/client";

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
            ☰
          </button>
        )}
        <div className="flex items-center gap-2">
          <span className="max-w-[200px] truncate text-sm font-semibold text-slate-900 sm:max-w-none">
            {lab.name}
          </span>
          {lab.isVerified ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
              Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              Unverified
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href={`/${lab.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
        >
          <span>Store Preview</span>
          <span className="text-[10px]">↗</span>
        </Link>

        <div className="hidden h-4 w-px bg-slate-200 sm:block" />

        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-700">
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
