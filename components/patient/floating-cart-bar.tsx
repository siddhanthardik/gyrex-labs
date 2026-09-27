"use client";

import Link from "next/link";
import { useCart } from "./cart-context";
import { ShoppingBag, ArrowRight } from "lucide-react";

export function FloatingCartBar() {
  const { labSlug, subtotal, itemCount, isHydrated } = useCart();

  if (!isHydrated || itemCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-30 mx-auto max-w-lg sm:bottom-6">
      <div className="flex items-center justify-between rounded-2xl border border-sky-500/30 bg-zinc-900/95 p-3.5 px-5 text-white shadow-2xl backdrop-blur-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-white font-bold">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-zinc-400">
              {itemCount} {itemCount === 1 ? "Item" : "Items"} in Cart
            </div>
            <div className="text-base font-extrabold text-white">
              ₹{subtotal}
            </div>
          </div>
        </div>

        <Link
          href={`/${labSlug}/cart`}
          className="flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-sky-400 transition"
        >
          <span>View Cart</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
