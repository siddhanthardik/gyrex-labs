"use client";

import { useState, useMemo } from "react";
import { TestCard } from "@/components/patient/test-card";
import { Search, SlidersHorizontal, X } from "lucide-react";

interface Test {
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
}

interface Category {
  id: string;
  name: string;
  slug: string;
  testCount: number;
}

interface TestListProps {
  tests: Test[];
  categories: Category[];
  initialCategory?: string;
}

export function TestList({ tests, categories, initialCategory }: TestListProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(initialCategory || "");

  const filtered = useMemo(() => {
    let result = tests;
    if (activeCategory) {
      result = result.filter(
        (t) =>
          t.categoryName.toLowerCase().replace(/\s+/g, "-") === activeCategory ||
          categories.find((c) => c.slug === activeCategory)?.name.toLowerCase() ===
            t.categoryName.toLowerCase()
      );
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q) ||
          t.categoryName.toLowerCase().includes(q) ||
          t.sampleType.toLowerCase().includes(q)
      );
    }
    return result;
  }, [tests, activeCategory, query, categories]);

  return (
    <div className="space-y-4">
      {/* Search bar with instant clear */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="search"
          placeholder="Search blood tests, scans, profiles…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-2xl border border-zinc-200 bg-white py-3.5 pl-10 pr-10 text-sm font-medium text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-sky-600 dark:focus:ring-sky-950"
          aria-label="Search diagnostic tests"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category horizontal scrolling chips */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            onClick={() => setActiveCategory("")}
            className={`flex-shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
              activeCategory === ""
                ? "bg-sky-700 text-white shadow-sm"
                : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            }`}
          >
            All Tests ({tests.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.slug)}
              className={`flex-shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${
                activeCategory === cat.slug
                  ? "bg-sky-700 text-white shadow-sm"
                  : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
              }`}
            >
              {cat.name} ({cat.testCount})
            </button>
          ))}
        </div>
      )}

      {/* Results header count */}
      {(query || activeCategory) && (
        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 px-1">
          <span>
            {filtered.length} {filtered.length === 1 ? "test" : "tests"} found
            {query && ` for "${query}"`}
            {activeCategory &&
              categories.find((c) => c.slug === activeCategory) &&
              ` in ${categories.find((c) => c.slug === activeCategory)!.name}`}
          </span>
          <button
            onClick={() => {
              setQuery("");
              setActiveCategory("");
            }}
            className="font-semibold text-sky-600 hover:underline dark:text-sky-400"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Test grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((test) => (
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
              preparationInstructions={test.preparationInstructions}
              categoryName={test.categoryName}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300 bg-white py-14 px-4 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
            <SlidersHorizontal className="h-6 w-6 text-zinc-400" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-zinc-900 dark:text-zinc-100">
            No diagnostic tests match
          </h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-xs">
            {query
              ? `No tests match "${query}". Try searching for hemoglobin, thyroid, lipid, etc.`
              : "No tests available in this category yet."}
          </p>
          {(query || activeCategory) && (
            <button
              onClick={() => {
                setQuery("");
                setActiveCategory("");
              }}
              className="mt-4 rounded-xl bg-sky-50 px-4 py-2 text-xs font-bold text-sky-700 hover:bg-sky-100 transition dark:bg-sky-950/50 dark:text-sky-300"
            >
              Reset Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
