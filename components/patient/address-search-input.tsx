"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, Loader2, Info } from "lucide-react";
import { AddressSuggestion } from "@/services/integrations/geocoding/address-provider";

export interface AddressSearchInputProps {
  onSelectSuggestion: (suggestion: AddressSuggestion) => void;
  providerStatus: {
    isConfigured: boolean;
    status: "ACTIVE" | "PROVIDER_CREDENTIALS_PENDING";
    message: string;
  } | null;
}

export function AddressSearchInput({
  onSelectSuggestion,
  providerStatus,
}: AddressSearchInputProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3 || providerStatus?.status !== "ACTIVE") {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/patient/address-lookup?q=${encodeURIComponent(trimmed)}`);
        if (res.ok && active) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
          if (data.suggestions && data.suggestions.length > 0) {
            setIsOpen(true);
          }
        }
      } catch {
        if (active) setSuggestions([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, providerStatus]);

  const handleSelect = (item: AddressSuggestion) => {
    setQuery(item.description);
    setIsOpen(false);
    onSelectSuggestion(item);
  };

  const isPending = providerStatus?.status === "PROVIDER_CREDENTIALS_PENDING";

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (providerStatus?.status === "ACTIVE") setIsOpen(true);
          }}
          onFocus={() => {
            if (suggestions.length > 0 && providerStatus?.status === "ACTIVE") {
              setIsOpen(true);
            }
          }}
          placeholder={
            isPending
              ? "Search location (Manual entry active below)"
              : "Search delivery location, area, or landmark..."
          }
          className="w-full rounded-2xl border border-zinc-200 bg-white py-2.5 pl-9 pr-4 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>

      {/* Provider Status Pill */}
      {isPending && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
          <Info className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span>Manual address entry &amp; browser GPS active. Please fill details below.</span>
        </div>
      )}

      {/* Dropdown Suggestions */}
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-2xl border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
          {suggestions.map((item) => (
            <li
              key={item.placeId}
              onClick={() => handleSelect(item)}
              className="flex cursor-pointer items-start gap-2.5 rounded-xl p-2.5 hover:bg-sky-50 dark:hover:bg-zinc-700/60 transition"
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {item.mainText || item.description}
                </div>
                {item.secondaryText && (
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    {item.secondaryText}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
