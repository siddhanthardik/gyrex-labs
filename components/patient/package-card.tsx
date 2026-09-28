"use client";

import { useState } from "react";
import { useCart } from "./cart-context";
import {
  Sparkles,
  Check,
  Plus,
  ChevronDown,
  ChevronUp,
  Clock,
  FlaskConical,
} from "lucide-react";

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

  const savings =
    mrpPrice && mrpPrice > sellingPrice ? mrpPrice - sellingPrice : 0;
  const discount =
    savings > 0 ? Math.round((savings / mrpPrice!) * 100) : 0;

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
      className={`no-tap-highlight relative flex flex-col rounded-2xl border transition ${
        isPopular
          ? "border-sky-400/60 bg-gradient-to-b from-sky-50 to-white shadow-md shadow-sky-100"
          : "border-slate-200 bg-white shadow-sm hover:border-slate-300"
      }`}
    >
      {/* Popular badge */}
      {isPopular && (
        <div className="absolute -top-3 left-4 flex items-center gap-1 rounded-full bg-sky-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow">
          <Sparkles className="h-2.5 w-2.5" />
          Popular
        </div>
      )}

      <div className="flex-1 px-4 pt-5 pb-3">
        {/* Test count + savings badge */}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
            <FlaskConical className="h-3 w-3 text-sky-600" />
            {testCount} Tests
          </span>
          {savings > 0 && (
            <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
              Save ₹{savings} ({discount}% off)
            </span>
          )}
        </div>

        {/* Package name */}
        <h3 className="mt-2.5 text-base font-bold leading-snug text-slate-900">
          {name}
        </h3>

        {/* Description */}
        {description && (
          <p className="mt-1 text-xs leading-relaxed text-slate-500 line-clamp-2">
            {description}
          </p>
        )}

        {/* TAT row */}
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
          <Clock className="h-3.5 w-3.5 text-emerald-500" />
          <span>Reports in {estimatedTatHours}h</span>
        </div>

        {/* Collapsible test list */}
        {tests.length > 0 && (
          <div className="mt-3 border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={() => setShowTests(!showTests)}
              className="flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700"
              aria-expanded={showTests}
            >
              {showTests ? "Hide tests" : `See all ${testCount} tests`}
              {showTests ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
            {showTests && (
              <ul className="mt-2 space-y-1 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                {tests.map((t) => (
                  <li key={t.id} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-400" />
                    <span>{t.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Footer: price + CTA */}
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-extrabold text-slate-900">
              ₹{sellingPrice}
            </span>
            {mrpPrice && mrpPrice > sellingPrice && (
              <span className="text-xs text-slate-400 line-through">₹{mrpPrice}</span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggle}
          aria-label={isInCart ? `Remove ${name}` : `Add ${name} to cart`}
          className={`touch-target flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold shadow-sm transition ${
            isInCart
              ? "bg-emerald-500 text-white hover:bg-emerald-600"
              : "bg-sky-600 text-white hover:bg-sky-700"
          }`}
        >
          {isInCart ? (
            <>
              <Check className="h-4 w-4" />
              Added
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Add
            </>
          )}
        </button>
      </div>
    </div>
  );
}
