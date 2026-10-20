"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { TestCard } from "./test-card";
import { StorefrontSearchBar } from "./storefront-search-bar";
import {
  Home,
  Star,
  ChevronRight,
  Search,
  ArrowRight,
  Filter,
} from "lucide-react";

export interface PopularTestItem {
  id: string;
  code: string;
  name: string;
  slug: string;
  sellingPrice: number;
  mrpPrice: number | null;
  sampleType: string;
  tatHours: number;
  fastingRequired: boolean;
  preparationInstructions: string | null;
  categoryName: string;
  homeCollectionAvailable: boolean;
}

export interface StorefrontCatalogueBrowserProps {
  labSlug: string;
  popularTests: PopularTestItem[];
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    testCount: number;
  }>;
  homeCollectionAvailable: boolean;
  city: string;
}

export function StorefrontCatalogueBrowser({
  labSlug,
  popularTests,
  categories,
  homeCollectionAvailable,
  city,
}: StorefrontCatalogueBrowserProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return popularTests;
    return popularTests.filter((test) => {
      return (
        test.name.toLowerCase().includes(q) ||
        test.code.toLowerCase().includes(q) ||
        test.categoryName.toLowerCase().includes(q) ||
        test.sampleType.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, popularTests]);

  return (
    <div className="space-y-6">
      {/* ── Standalone Prominent Search Bar ─────────────────────────── */}
      <section aria-label="Search Diagnostic Tests">
        <StorefrontSearchBar
          labSlug={labSlug}
          onQueryChange={setSearchQuery}
          placeholder="Search diagnostic tests, health packages, organ profiles…"
        />
      </section>

      {/* ── Primary Category Quick Navigation ───────────────────────── */}
      {categories.length > 0 && (
        <section aria-label="Test Categories">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <Link
              href={`/${labSlug}/tests`}
              className="shrink-0 flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50"
            >
              <Filter className="h-3.5 w-3.5 text-sky-600" />
              <span>All Categories</span>
            </Link>
            {categories.slice(0, 8).map((cat) => (
              <Link
                key={cat.id}
                href={`/${labSlug}/tests?category=${cat.id}`}
                className="shrink-0 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50 hover:text-sky-600"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Doorstep Home Sample Collection Presentation ─────────────── */}
      {homeCollectionAvailable && (
        <section
          aria-label="Doorstep Home Sample Collection"
          className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50/90 via-blue-50/50 to-slate-50 p-5 shadow-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-xs">
                <Home className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Doorstep Home Sample Collection
                  </h2>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                    Active in {city}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed max-w-xl">
                  Certified healthcare phlebotomists collect diagnostic samples safely and hygienically from the comfort of your home. Timely doorstep arrival, sterile vacutainers, and temperature-monitored sample transport.
                </p>
              </div>
            </div>
            <Link
              href={`/${labSlug}/tests`}
              className="shrink-0 inline-flex items-center justify-center rounded-xl bg-sky-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-sky-700 transition"
            >
              Book Home Collection
            </Link>
          </div>
        </section>
      )}

      {/* ── Popular Tests Section (3-4 Column Desktop Grid) ─────────── */}
      <section aria-label="Popular Diagnostic Tests" className="pt-2">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            <h2 className="text-base font-bold text-slate-900">
              {searchQuery.trim() ? "Search Results" : "Popular Diagnostic Tests"}
            </h2>
            {searchQuery.trim() && (
              <span className="text-xs text-slate-500 font-medium">
                ({filteredTests.length} matching)
              </span>
            )}
          </div>
          <Link
            href={
              searchQuery.trim()
                ? `/${labSlug}/tests?q=${encodeURIComponent(searchQuery.trim())}`
                : `/${labSlug}/tests`
            }
            className="flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700"
          >
            <span>{searchQuery.trim() ? "Search full catalogue" : "View all tests"}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {filteredTests.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredTests.map((test) => (
              <TestCard
                key={test.id}
                id={test.id}
                name={test.name}
                code={test.code}
                sellingPrice={test.sellingPrice}
                mrpPrice={test.mrpPrice}
                sampleType={test.sampleType}
                tatHours={test.tatHours}
                fastingRequired={test.fastingRequired}
                categoryName={test.categoryName}
                homeCollectionAvailable={test.homeCollectionAvailable}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
            <Search className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <h3 className="text-sm font-bold text-slate-700">
              No matching tests found in popular tests
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              We couldn&apos;t find &ldquo;{searchQuery}&rdquo; in the highlighted tests. Check the comprehensive laboratory catalogue.
            </p>
            <Link
              href={`/${labSlug}/tests?q=${encodeURIComponent(searchQuery.trim())}`}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-sky-700 transition"
            >
              <span>Search Complete Catalogue</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
