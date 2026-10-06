"use client";

import { useCart } from "./cart-context";
import { Clock, Droplets, Plus, Check, Utensils } from "lucide-react";

interface TestCardProps {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  sellingPrice: number;
  mrpPrice?: number | null;
  sampleType?: string;
  tatHours?: number;
  fastingRequired?: boolean;
  categoryName?: string;
  preparationInstructions?: string | null;
  homeCollectionAvailable?: boolean;
}

export function TestCard({
  id,
  name,
  code,
  description,
  sellingPrice,
  mrpPrice,
  sampleType,
  tatHours = 24,
  fastingRequired = false,
  categoryName,
  preparationInstructions,
  homeCollectionAvailable = true,
}: TestCardProps) {
  const { items, addItem, removeItem, isHydrated } = useCart();
  const isInCart = isHydrated && items.some((i) => i.id === id);

  const discount =
    mrpPrice && mrpPrice > sellingPrice
      ? Math.round(((mrpPrice - sellingPrice) / mrpPrice) * 100)
      : 0;

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
        homeCollectionAvailable,
      });
    }
  };

  return (
    <div
      className={`no-tap-highlight flex flex-col rounded-2xl border bg-white transition ${
        isInCart
          ? "border-sky-200 shadow-sm shadow-sky-100"
          : "border-slate-200 shadow-sm hover:border-slate-300"
      }`}
    >
      {/* Card body */}
      <div className="flex-1 px-4 pt-4 pb-3">
        {/* Category + fasting + collection badge row */}
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            {categoryName && (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-600">
                {categoryName}
              </span>
            )}
            {!homeCollectionAvailable && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                Lab Visit Only
              </span>
            )}
          </div>
          {fastingRequired && (
            <span className="flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              <Utensils className="h-2.5 w-2.5" />
              Fasting
            </span>
          )}
        </div>

        {/* Test name */}
        <h3 className="text-sm font-bold leading-snug text-slate-900">{name}</h3>

        {/* Description */}
        {description && (
          <p className="mt-1 text-[12px] leading-relaxed text-slate-500 line-clamp-2">
            {description}
          </p>
        )}

        {/* Preparation hint */}
        {preparationInstructions && (
          <p className="mt-1 text-[11px] italic text-slate-400 line-clamp-1">
            {preparationInstructions}
          </p>
        )}

        {/* Meta row: sample + TAT */}
        <div className="mt-2.5 flex flex-wrap items-center gap-3">
          {sampleType && (
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <Droplets className="h-3 w-3 text-sky-500" />
              {sampleType}
            </span>
          )}
          <span className="flex items-center gap-1 text-[11px] text-slate-500">
            <Clock className="h-3 w-3 text-emerald-500" />
            Report in {tatHours}h
          </span>
        </div>
      </div>

      {/* Card footer: price + CTA */}
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-extrabold text-slate-900">
              ₹{sellingPrice}
            </span>
            {mrpPrice && mrpPrice > sellingPrice && (
              <span className="text-xs text-slate-400 line-through">₹{mrpPrice}</span>
            )}
          </div>
          {discount > 0 && (
            <span className="text-[10px] font-semibold text-emerald-600">
              {discount}% off
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleToggle}
          aria-label={isInCart ? `Remove ${name} from cart` : `Add ${name} to cart`}
          className={`touch-target flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
            isInCart
              ? "bg-emerald-500 text-white hover:bg-emerald-600"
              : "bg-sky-600 text-white hover:bg-sky-700"
          }`}
        >
          {isInCart ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Added
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" />
              Add
            </>
          )}
        </button>
      </div>
    </div>
  );
}
