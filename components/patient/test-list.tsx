"use client";

import { useState, useMemo } from "react";
import { TestCard } from "@/components/patient/test-card";
import { Search, SlidersHorizontal } from "lucide-react";

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
    <div>
      {/* Search bar */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="search"
          placeholder="Search tests by name, code, or sample type…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-10 pr-4 text-sm placeholder:text-zinc-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-sky-600 dark:focus:ring-sky-900/40"
          aria-label="Search diagnostic tests"
        />
      </div>

      {/* Category chips */}
      {categories.length > 0 && (
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setActiveCategory("")}
            className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              activeCategory === ""
                ? "bg-sky-600 text-white"
                : "border border-zinc-200 text-zinc-600 hover:border-sky-300 hover:text-sky-600 dark:border-zinc-700 dark:text-zinc-400"
            }`}
          >
            All ({tests.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.slug)}
              className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                activeCategory === cat.slug
                  ? "bg-sky-600 text-white"
                  : "border border-zinc-200 text-zinc-600 hover:border-sky-300 hover:text-sky-600 dark:border-zinc-700 dark:text-zinc-400"
              }`}
            >
              {cat.name} ({cat.testCount})
            </button>
          ))}
        </div>
      )}

      {/* Results count */}
      {(query || activeCategory) && (
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          {filtered.length} {filtered.length === 1 ? "test" : "tests"} found
          {query && ` for "${query}"`}
          {activeCategory &&
            categories.find((c) => c.slug === activeCategory) &&
            ` in ${categories.find((c) => c.slug === activeCategory)!.name}`}
        </p>
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
              categoryName={test.categoryName}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white py-14 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <SlidersHorizontal className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
          <h3 className="mt-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            No tests found
          </h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {query
              ? `No tests match "${query}". Try a different search term.`
              : "No tests available in this category yet."}
          </p>
          {(query || activeCategory) && (
            <button
              onClick={() => {
                setQuery("");
                setActiveCategory("");
              }}
              className="mt-3 text-xs font-semibold text-sky-600 hover:underline dark:text-sky-400"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
