"use client";

import { useCart } from "./cart-context";
import { Clock, Plus, Check } from "lucide-react";

interface TestCardProps {
  id: string;
  name: string;
  code?: string | null;
  sellingPrice: number;
  mrpPrice?: number | null;
  sampleType?: string;
  tatHours?: number;
  fastingRequired?: boolean;
  categoryName?: string;
}

export function TestCard({
  id,
  name,
  code,
  sellingPrice,
  mrpPrice,
  sampleType,
  tatHours = 24,
  fastingRequired = false,
  categoryName,
}: TestCardProps) {
  const { items, addItem, removeItem, isHydrated } = useCart();
  const isInCart = isHydrated && items.some((i) => i.id === id);

  const handleToggle = () => {
    if (isInCart) {
      removeItem(id);
    } else {
      addItem({
        id,
        itemType: "TEST",
        name,
        code,
        price: sellingPrice,
        sampleType,
        fastingRequired,
      });
    }
  };

  return (
    <div className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700">
      <div>
        <div className="flex items-start justify-between gap-2">
          {categoryName && (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              {categoryName}
            </span>
          )}
          {fastingRequired && (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
              Fasting Req.
            </span>
          )}
        </div>

        <h3 className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-2">
          {name}
        </h3>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          {sampleType && <span>{sampleType}</span>}
          <span className="flex items-center gap-1 text-[11px]">
            <Clock className="h-3 w-3 text-zinc-400" /> Reports in {tatHours}h
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800/80">
        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-extrabold text-zinc-900 dark:text-white">
            ₹{sellingPrice}
          </span>
          {mrpPrice && mrpPrice > sellingPrice && (
            <span className="text-xs text-zinc-400 line-through">₹{mrpPrice}</span>
          )}
        </div>

        <button
          type="button"
          onClick={handleToggle}
          className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            isInCart
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "border border-sky-600 text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40"
          }`}
        >
          {isInCart ? (
            <>
              <Check className="h-3.5 w-3.5" /> Added
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" /> Add
            </>
          )}
        </button>
      </div>
    </div>
  );
}
