"use client";

import { useState } from "react";
import { useCart } from "./cart-context";
import { Sparkles, Check, Plus, ChevronDown, ChevronUp } from "lucide-react";

interface PackageCardProps {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  sellingPrice: number;
  mrpPrice?: number | null;
  testCount: number;
  tests: Array<{ id: string; name: string }>;
  estimatedTatHours?: number | null;
  isPopular?: boolean;
}

export function PackageCard({
  id,
  name,
  code,
  description,
  sellingPrice,
  mrpPrice,
  testCount,
  tests,
  estimatedTatHours = 24,
  isPopular = false,
}: PackageCardProps) {
  const { items, addItem, removeItem, isHydrated } = useCart();
  const [showTests, setShowTests] = useState(false);
  const isInCart = isHydrated && items.some((i) => i.id === id);

  const savings = mrpPrice && mrpPrice > sellingPrice ? mrpPrice - sellingPrice : 0;

  const handleToggle = () => {
    if (isInCart) {
      removeItem(id);
    } else {
      addItem({
        id,
        itemType: "PACKAGE",
        name,
        code,
        price: sellingPrice,
      });
    }
  };

  return (
    <div
      className={`relative flex flex-col justify-between rounded-2xl border p-5 shadow-sm transition ${
        isPopular
          ? "border-sky-500/50 bg-gradient-to-b from-sky-50/50 to-white dark:from-sky-950/20 dark:to-zinc-900"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60"
      }`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-5 flex items-center gap-1 rounded-full bg-sky-600 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow">
          <Sparkles className="h-3 w-3" /> Popular Choice
        </div>
      )}

      <div>
        <div className="flex items-start justify-between gap-2">
          <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {testCount} Tests Included
          </span>
          {savings > 0 && (
            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              Save ₹{savings}
            </span>
          )}
        </div>

        <h3 className="mt-3 text-base font-bold text-zinc-950 dark:text-white">
          {name}
        </h3>

        {description && (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
            {description}
          </p>
        )}

        {/* Collapsible Test List */}
        <div className="mt-3 border-t border-zinc-100 pt-2 dark:border-zinc-800/80">
          <button
            type="button"
            onClick={() => setShowTests(!showTests)}
            className="flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
          >
            <span>{showTests ? "Hide included tests" : `View all ${testCount} tests`}</span>
            {showTests ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {showTests && (
            <ul className="mt-2 space-y-1 rounded-lg bg-zinc-50 p-2.5 text-xs text-zinc-600 dark:bg-zinc-950/60 dark:text-zinc-300">
              {tests.map((t) => (
                <li key={t.id} className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                  <span>{t.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800/80">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-zinc-950 dark:text-white">
              ₹{sellingPrice}
            </span>
            {mrpPrice && mrpPrice > sellingPrice && (
              <span className="text-xs text-zinc-400 line-through">₹{mrpPrice}</span>
            )}
          </div>
          <span className="text-[11px] text-zinc-400">Reports in {estimatedTatHours}h</span>
        </div>

        <button
          type="button"
          onClick={handleToggle}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition shadow-sm ${
            isInCart
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-sky-600 text-white hover:bg-sky-500 shadow-sky-600/20"
          }`}
        >
          {isInCart ? (
            <>
              <Check className="h-4 w-4" /> Added to Cart
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> Add Package
            </>
          )}
        </button>
      </div>
    </div>
  );
}
