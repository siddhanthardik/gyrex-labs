"use client";

import Link from "next/link";
import { useCart } from "./cart-context";
import { ShoppingBag, ShieldCheck, MapPin, Phone, FileText } from "lucide-react";

interface HeaderProps {
  labName: string;
  labSlug: string;
  city: string;
  state: string;
  phone: string;
  isVerified?: boolean;
  nablNumber?: string | null;
}

export function StorefrontHeader({
  labName,
  labSlug,
  city,
  state,
  phone,
  isVerified = true,
  nablNumber,
}: HeaderProps) {
  const { itemCount, isHydrated } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        {/* Laboratory Branding (Primary) */}
        <Link href={`/${labSlug}`} className="group flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white font-bold text-lg shadow-sm group-hover:bg-sky-500 transition">
            {labName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-50 group-hover:text-sky-600 transition">
                {labName}
              </h1>
              {isVerified && (
                <span title={nablNumber ? `NABL Accredited: ${nablNumber}` : "Verified Diagnostic Lab"}>
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-0.5">
                <MapPin className="h-3 w-3" /> {city}, {state}
              </span>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <span className="text-[11px] font-medium text-zinc-400">
                Powered by Gyrex Labs
              </span>
            </div>
          </div>
        </Link>

        {/* Quick Actions & Navigation */}
        <div className="flex items-center gap-2 sm:gap-4">
          <a
            href={`tel:${phone}`}
            className="hidden items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-sky-600 dark:text-zinc-400 sm:flex"
          >
            <Phone className="h-3.5 w-3.5" />
            <span>{phone}</span>
          </a>

          <Link
            href={`/${labSlug}/reports`}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 transition"
          >
            <FileText className="h-3.5 w-3.5 text-sky-600" />
            <span className="hidden sm:inline">My Reports</span>
            <span className="sm:hidden">Reports</span>
          </Link>

          <Link
            href={`/${labSlug}/cart`}
            className="relative flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-500 transition"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Cart</span>
            {isHydrated && itemCount > 0 && (
              <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-sky-700">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
