"use client";

import Link from "next/link";
import { useCart } from "./cart-context";
import { ShoppingBag, ArrowRight } from "lucide-react";

export function FloatingCartBar() {
  const { labSlug, subtotal, itemCount, items, isHydrated } = useCart();

  if (!isHydrated || itemCount === 0) {
    return null;
  }

  // Show up to 2 test names in the bar
  const previewNames = items
    .slice(0, 2)
    .map((i) => i.name.split(" ").slice(0, 2).join(" "))
    .join(", ");
  const hasMore = itemCount > 2;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-safe"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 12px)" }}
    >
      <div className="mx-auto max-w-xl">
        <Link
          href={`/${labSlug}/cart`}
          className="flex w-full items-center justify-between rounded-2xl bg-slate-900 px-4 py-3.5 text-white shadow-2xl no-tap-highlight transition active:scale-[0.99]"
          aria-label={`View cart — ${itemCount} items, ₹${subtotal}`}
        >
          {/* Left: cart icon + item info */}
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-sky-500">
              <ShoppingBag className="h-5 w-5 text-white" />
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-sky-700 shadow">
                {itemCount}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-300">
                {itemCount} {itemCount === 1 ? "test" : "tests"} added
              </p>
              <p className="truncate text-xs font-semibold text-white max-w-[160px]">
                {previewNames}{hasMore ? "…" : ""}
              </p>
            </div>
          </div>

          {/* Right: total + cta */}
          <div className="flex flex-shrink-0 items-center gap-2">
            <div className="text-right">
              <p className="text-base font-extrabold text-white">₹{subtotal}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500">
              <ArrowRight className="h-4 w-4 text-white" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
