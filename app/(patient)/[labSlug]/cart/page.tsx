"use client";

import { useCart } from "@/components/patient/cart-context";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ShoppingBag,
  Trash2,
  Home,
  MapPin,
  ArrowRight,
  FlaskConical,
  Package2,
  Clock,
  Droplets,
  AlertCircle,
  ShieldCheck,
  Plus,
} from "lucide-react";

export default function CartPage() {
  const routeParams = useParams<{ labSlug: string }>();
  const { items, collectionType, setCollectionType, removeItem, clearCart, subtotal, labSlug: cartLabSlug, isHydrated } = useCart();
  const labSlug = routeParams?.labSlug || cartLabSlug;

  if (!isHydrated) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="h-16 w-16 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
          <div className="mt-4 h-6 w-32 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
          <div className="mt-2 h-4 w-48 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <div className="flex flex-col items-center justify-center text-center rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
            <ShoppingBag className="h-10 w-10" />
          </div>
          <h2 className="mt-5 text-xl font-extrabold text-zinc-900 dark:text-white">
            Your Cart is Empty
          </h2>
          <p className="mt-2 max-w-xs text-xs text-zinc-500 dark:text-zinc-400">
            You haven&apos;t added any diagnostic tests or health check-up packages yet.
          </p>
          <div className="mt-6 flex flex-col w-full max-w-xs gap-2.5">
            <Link
              href={`/${labSlug}/tests`}
              className="flex items-center justify-center gap-2 rounded-2xl bg-sky-700 py-3.5 text-xs font-bold text-white shadow-md hover:bg-sky-600 transition"
            >
              <FlaskConical className="h-4 w-4" />
              <span>Browse Diagnostic Tests</span>
            </Link>
            <Link
              href={`/${labSlug}/packages`}
              className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white py-3 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            >
              <Package2 className="h-4 w-4 text-violet-600" />
              <span>Explore Health Packages</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const hasFasting = items.some((i) => i.fastingRequired);
  const uniqueSampleTypes = [...new Set(items.filter((i) => i.sampleType).map((i) => i.sampleType))];

  return (
    <div className="mx-auto max-w-xl px-4 py-4 sm:px-6 space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white">Your Cart</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {items.length} {items.length === 1 ? "item" : "items"} in booking
          </p>
        </div>
        <button
          onClick={clearCart}
          className="text-xs font-bold text-red-500 hover:text-red-600 dark:text-red-400 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition"
        >
          Clear All
        </button>
      </div>

      {/* Cart Items List */}
      <div className="overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-sm divide-y divide-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:divide-zinc-800">
        {items.map((item) => (
          <div key={item.id} className="p-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  item.itemType === "PACKAGE"
                    ? "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                    : "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                }`}
              >
                {item.itemType === "PACKAGE" ? (
                  <Package2 className="h-4 w-4" />
                ) : (
                  <FlaskConical className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">
                  {item.name}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                  {item.code && (
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] dark:bg-zinc-800">
                      {item.code}
                    </span>
                  )}
                  {item.sampleType && (
                    <span className="flex items-center gap-0.5 text-zinc-600 dark:text-zinc-300">
                      <Droplets className="h-3 w-3 text-red-500" /> {item.sampleType}
                    </span>
                  )}
                  {item.fastingRequired && (
                    <span className="font-semibold text-amber-700 dark:text-amber-400">
                      • Fasting Required
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end justify-between gap-2 shrink-0">
              <span className="text-sm font-extrabold text-zinc-900 dark:text-white">
                ₹{item.price}
              </span>
              <button
                onClick={() => removeItem(item.id)}
                className="p-1.5 text-zinc-400 hover:text-red-500 transition rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label={`Remove ${item.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Preparation notices box */}
      {(hasFasting || uniqueSampleTypes.length > 0) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/50 dark:bg-amber-950/30 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200 mb-1">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span>Preparation Instructions</span>
          </div>
          {hasFasting && (
            <p className="text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
              • <strong>Fasting required:</strong> 8-12 hours fasting before sample collection (only plain water allowed).
            </p>
          )}
          {uniqueSampleTypes.length > 0 && (
            <p className="text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
              • <strong>Sample types required:</strong> {uniqueSampleTypes.join(", ")}.
            </p>
          )}
        </div>
      )}

      {/* Collection Type Selector */}
      <div className="rounded-3xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
          Select Collection Method
        </h2>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setCollectionType("HOME_COLLECTION")}
            className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 text-center transition ${
              collectionType === "HOME_COLLECTION"
                ? "border-sky-600 bg-sky-50/80 text-sky-900 dark:border-sky-500 dark:bg-sky-950/40 dark:text-sky-200"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            <Home
              className={`h-5 w-5 mb-1.5 ${
                collectionType === "HOME_COLLECTION" ? "text-sky-600 dark:text-sky-400" : "text-zinc-400"
              }`}
            />
            <span className="text-xs font-bold">Home Collection</span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Phlebotomist visits home
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCollectionType("LAB_VISIT")}
            className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 text-center transition ${
              collectionType === "LAB_VISIT"
                ? "border-sky-600 bg-sky-50/80 text-sky-900 dark:border-sky-500 dark:bg-sky-950/40 dark:text-sky-200"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            <MapPin
              className={`h-5 w-5 mb-1.5 ${
                collectionType === "LAB_VISIT" ? "text-sky-600 dark:text-sky-400" : "text-zinc-400"
              }`}
            />
            <span className="text-xs font-bold">Visit Laboratory</span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Walk in directly
            </span>
          </button>
        </div>
      </div>

      {/* Bill Breakdown Card */}
      <div className="rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
          Bill Details
        </h2>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
            <span>Tests & Packages ({items.length})</span>
            <span className="font-semibold text-zinc-900 dark:text-white">₹{subtotal}</span>
          </div>
          {collectionType === "HOME_COLLECTION" && (
            <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-sky-600" /> Home Sample Pickup
              </span>
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                Calculated at checkout
              </span>
            </div>
          )}
          <div className="border-t border-zinc-100 pt-2.5 mt-2 dark:border-zinc-800">
            <div className="flex justify-between items-baseline text-sm font-extrabold text-zinc-900 dark:text-white">
              <span>Total Payable</span>
              <span className="text-base text-sky-700 dark:text-sky-400">₹{subtotal}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Payment is made directly to the laboratory on sample collection or online.</span>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2.5 pt-2">
        <Link
          href={`/${labSlug}/checkout`}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-700 py-4 text-sm font-bold text-white shadow-md hover:bg-sky-600 active:scale-[0.99] transition"
        >
          <span>Proceed to Patient Details</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href={`/${labSlug}/tests`}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-zinc-200 bg-white py-3 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add More Tests or Packages</span>
        </Link>
      </div>
    </div>
  );
}
