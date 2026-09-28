"use client";

import Link from "next/link";
import { useCart } from "./cart-context";
import { ShoppingBag, ShieldCheck, MapPin, Phone, FileText, ArrowLeft } from "lucide-react";
import { usePathname } from "next/navigation";

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
  const pathname = usePathname();

  // Show back button when not on the root storefront page
  const isHome = pathname === `/${labSlug}`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3 lg:max-w-5xl">
        {/* Left: back-arrow or lab brand */}
        <div className="flex min-w-0 items-center gap-2.5">
          {!isHome && (
            <Link
              href={`/${labSlug}`}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
              aria-label="Back to storefront"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}

          <Link href={`/${labSlug}`} className="flex min-w-0 items-center gap-2.5">
            {/* Lab logo avatar */}
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-sky-600 text-sm font-bold text-white shadow-sm">
              {labName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="truncate text-sm font-bold text-slate-900">
                  {labName}
                </span>
                {isVerified && (
                  <span title={nablNumber ? `NABL: ${nablNumber}` : "Verified Lab"}>
                    <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{city}, {state}</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Right: phone (sm+) + reports + cart */}
        <div className="flex flex-shrink-0 items-center gap-2">
          <a
            href={`tel:${phone}`}
            className="hidden items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium text-slate-600 transition hover:text-sky-600 sm:flex"
            aria-label={`Call ${labName}`}
          >
            <Phone className="h-3.5 w-3.5" />
            <span className="hidden md:inline">{phone}</span>
          </a>

          <Link
            href={`/${labSlug}/reports`}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
            aria-label="My Reports"
          >
            <FileText className="h-3.5 w-3.5 text-sky-600" />
            <span className="hidden sm:inline">Reports</span>
          </Link>

          <Link
            href={`/${labSlug}/cart`}
            className="relative flex h-9 items-center gap-1.5 rounded-lg bg-sky-600 px-3 text-[11px] font-bold text-white shadow-sm transition hover:bg-sky-700"
            aria-label={`Cart${isHydrated && itemCount > 0 ? `, ${itemCount} items` : ""}`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Cart</span>
            {isHydrated && itemCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-sky-700">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
