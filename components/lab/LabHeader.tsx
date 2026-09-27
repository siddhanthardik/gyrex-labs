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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-4 sm:px-8 backdrop-blur-md">
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 lg:hidden"
            aria-label="Toggle navigation menu"
          >
            ☰
          </button>
        )}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-none">
            {lab.name}
          </span>
          {lab.isVerified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-400 border border-sky-500/20">
              Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400 border border-amber-500/20">
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
          className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-sky-500/50 hover:text-white"
        >
          <span>Store Preview</span>
          <span className="text-[10px]">↗</span>
        </Link>

        <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-200 border border-zinc-700">
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden md:block text-left text-xs">
            <p className="font-semibold text-zinc-200">{user.fullName}</p>
            <p className="text-[11px] text-zinc-400">{user.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
