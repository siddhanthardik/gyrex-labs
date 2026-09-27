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
} from "lucide-react";

export default function CartPage() {
  const routeParams = useParams<{ labSlug: string }>();
  const { items, collectionType, setCollectionType, removeItem, clearCart, subtotal, labSlug: cartLabSlug, isHydrated } = useCart();
  const labSlug = routeParams?.labSlug || cartLabSlug;

  if (!isHydrated) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
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
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
            <ShoppingBag className="h-8 w-8 text-zinc-400" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Your Cart is Empty
          </h2>
          <p className="mt-2 max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
            Add diagnostic tests or health packages to continue booking.
          </p>
          <Link
            href={`/${labSlug}/tests`}
            className="mt-6 rounded-xl bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-sky-500 transition"
          >
            Browse Tests
          </Link>
        </div>
      </div>
    );
  }

  const hasFasting = items.some((i) => i.fastingRequired);
  const uniqueSampleTypes = [...new Set(items.filter((i) => i.sampleType).map((i) => i.sampleType))];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Your Cart</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {items.length} {items.length === 1 ? "item" : "items"} selected
          </p>
        </div>
        <button
          onClick={clearCart}
          className="text-xs font-medium text-red-500 hover:text-red-600 dark:text-red-400"
        >
          Clear All
        </button>
      </div>

      {/* Cart items */}
      <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400">
                {item.itemType === "PACKAGE" ? (
                  <Package2 className="h-3.5 w-3.5" />
                ) : (
                  <FlaskConical className="h-3.5 w-3.5" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {item.name}
                </p>
                <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-zinc-400">
                  {item.code && <span>{item.code}</span>}
                  {item.sampleType && (
                    <span className="flex items-center gap-0.5">
                      <Droplets className="h-3 w-3" /> {item.sampleType}
                    </span>
                  )}
                  {item.fastingRequired && (
                    <span className="text-amber-600 dark:text-amber-400">• Fasting Required</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-zinc-900 dark:text-white">₹{item.price}</span>
              <button
                onClick={() => removeItem(item.id)}
                className="text-zinc-300 hover:text-red-500 transition dark:text-zinc-600"
                aria-label={`Remove ${item.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Preparation notices */}
      {(hasFasting || uniqueSampleTypes.length > 0) && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/50 dark:bg-amber-950/30">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">
            Preparation Notes
          </p>
          {hasFasting && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              • Some tests require 8-12 hours of fasting. Avoid eating or drinking (except water) before your collection.
            </p>
          )}
          {uniqueSampleTypes.length > 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              • Sample types required: {uniqueSampleTypes.join(", ")}
            </p>
          )}
        </div>
      )}

      {/* Collection Type Selector */}
      <div className="mt-6">
        <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-100">
          Collection Method
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setCollectionType("HOME_COLLECTION")}
            className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition ${
              collectionType === "HOME_COLLECTION"
                ? "border-sky-600 bg-sky-50 dark:border-sky-500 dark:bg-sky-950/30"
                : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900"
            }`}
          >
            <Home
              className={`h-5 w-5 ${
                collectionType === "HOME_COLLECTION"
                  ? "text-sky-600 dark:text-sky-400"
                  : "text-zinc-400"
              }`}
            />
            <span
              className={`text-xs font-semibold ${
                collectionType === "HOME_COLLECTION"
                  ? "text-sky-700 dark:text-sky-300"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              Home Collection
            </span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
              Phlebotomist visits you
            </span>
          </button>

          <button
            onClick={() => setCollectionType("LAB_VISIT")}
            className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition ${
              collectionType === "LAB_VISIT"
                ? "border-sky-600 bg-sky-50 dark:border-sky-500 dark:bg-sky-950/30"
                : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900"
            }`}
          >
            <MapPin
              className={`h-5 w-5 ${
                collectionType === "LAB_VISIT"
                  ? "text-sky-600 dark:text-sky-400"
                  : "text-zinc-400"
              }`}
            />
            <span
              className={`text-xs font-semibold ${
                collectionType === "LAB_VISIT"
                  ? "text-sky-700 dark:text-sky-300"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              Visit Laboratory
            </span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
              Come to the lab centre
            </span>
          </button>
        </div>
      </div>

      {/* Order Summary */}
      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-100">
          Price Summary
        </h3>

        <div className="space-y-2">
          <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400">
            <span>Tests & Packages ({items.length})</span>
            <span>₹{subtotal}</span>
          </div>
          {collectionType === "HOME_COLLECTION" && (
            <div className="flex justify-between text-sm text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Home Collection Fee
              </span>
              <span className="text-xs">Calculated at checkout</span>
            </div>
          )}
          <div className="border-t border-zinc-100 pt-2 dark:border-zinc-800">
            <div className="flex justify-between font-bold text-zinc-900 dark:text-white">
              <span>Subtotal</span>
              <span>₹{subtotal}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout CTA */}
      <div className="mt-5">
        <Link
          href={`/${labSlug}/checkout`}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-6 py-4 text-sm font-bold text-white shadow-md hover:bg-sky-500 transition"
        >
          <span>Proceed to Checkout</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href={`/${labSlug}/tests`}
          className="mt-3 flex w-full items-center justify-center rounded-xl border border-zinc-200 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          + Add More Tests
        </Link>
      </div>
    </div>
  );
}
