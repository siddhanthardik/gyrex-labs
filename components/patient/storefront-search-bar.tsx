"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ArrowRight } from "lucide-react";

interface StorefrontSearchBarProps {
  labSlug: string;
  placeholder?: string;
  onQueryChange?: (query: string) => void;
  className?: string;
}

export function StorefrontSearchBar({
  labSlug,
  placeholder = "Search diagnostic tests, health packages, organ profiles…",
  onQueryChange,
  className = "",
}: StorefrontSearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (onQueryChange) {
      onQueryChange(val);
    }
  };

  const handleClear = () => {
    setQuery("");
    if (onQueryChange) {
      onQueryChange("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/${labSlug}/tests?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push(`/${labSlug}/tests`);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`relative w-full ${className}`}
      role="search"
      aria-label="Search laboratory tests and packages"
    >
      <div className="relative flex items-center rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100">
        <div className="pointer-events-none flex items-center pl-4 text-slate-400">
          <Search className="h-5 w-5 text-sky-600" aria-hidden="true" />
        </div>

        <input
          type="search"
          value={query}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full bg-transparent px-3 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          autoComplete="off"
          spellCheck="false"
        />

        <div className="flex items-center gap-1 pr-2">
          {query.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="touch-target flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Clear search query"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <button
            type="submit"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-sky-700"
            aria-label="Search full catalogue"
          >
            <span>Search</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </form>
  );
}
