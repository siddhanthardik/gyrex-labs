"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  INDIA_LOCATIONS,
  findIndiaLocation,
  getCitiesForIndianState,
  isCityInIndianState,
} from "@/data/india-locations";
import { Search, ChevronDown, Check, MapPin, AlertCircle } from "lucide-react";

export interface IndiaLocationSelectorProps {
  selectedState: string;
  selectedCity: string;
  onStateChange: (state: string) => void;
  onCityChange: (city: string) => void;
  stateLabel?: string;
  cityLabel?: string;
  stateError?: string;
  cityError?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  idPrefix?: string;
}

const OTHER_CITY_VALUE = "__OTHER__";

export function IndiaLocationSelector({
  selectedState,
  selectedCity,
  onStateChange,
  onCityChange,
  stateLabel = "State / Union Territory *",
  cityLabel = "City *",
  stateError,
  cityError,
  disabled = false,
  required = true,
  className = "",
  idPrefix = "location",
}: IndiaLocationSelectorProps) {
  // State search & dropdown popover open state
  const [isStateOpen, setIsStateOpen] = useState(false);
  const [stateSearch, setStateSearch] = useState("");
  const stateDropdownRef = useRef<HTMLDivElement>(null);
  const stateSearchInputRef = useRef<HTMLInputElement>(null);

  // Custom city manual input state
  const [isOtherCity, setIsOtherCity] = useState(false);
  const [customCity, setCustomCity] = useState("");

  // Resolve canonical state
  const matchedLocation = useMemo(() => {
    return findIndiaLocation(selectedState);
  }, [selectedState]);

  const canonicalStateName = matchedLocation?.state || selectedState || "";

  // Available cities for currently selected state
  const availableCities = useMemo(() => {
    if (!canonicalStateName) return [];
    return getCitiesForIndianState(canonicalStateName);
  }, [canonicalStateName]);

  // Synchronize city and determine if it's a curated city or "Other"
  useEffect(() => {
    if (!selectedCity) {
      setIsOtherCity(false);
      setCustomCity("");
      return;
    }

    if (canonicalStateName && availableCities.length > 0) {
      const inList = isCityInIndianState(canonicalStateName, selectedCity);
      if (inList) {
        setIsOtherCity(false);
        setCustomCity("");
      } else {
        // City is custom or not in curated list
        setIsOtherCity(true);
        setCustomCity(selectedCity);
      }
    } else if (!canonicalStateName && selectedCity) {
      // No state selected yet, preserve existing city
      setIsOtherCity(true);
      setCustomCity(selectedCity);
    }
  }, [selectedCity, canonicalStateName, availableCities]);

  // Close state popover on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        stateDropdownRef.current &&
        !stateDropdownRef.current.contains(event.target as Node)
      ) {
        setIsStateOpen(false);
      }
    }
    if (isStateOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isStateOpen]);

  // Focus search input when popover opens
  useEffect(() => {
    if (isStateOpen) {
      setStateSearch("");
      setTimeout(() => {
        stateSearchInputRef.current?.focus();
      }, 50);
    }
  }, [isStateOpen]);

  // Filtered states based on search query
  const filteredLocations = useMemo(() => {
    const q = stateSearch.trim().toLowerCase();
    if (!q) return INDIA_LOCATIONS;
    return INDIA_LOCATIONS.filter((loc) => {
      if (loc.state.toLowerCase().includes(q)) return true;
      if (loc.aliases && loc.aliases.some((a) => a.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [stateSearch]);

  const handleSelectState = (stateName: string) => {
    setIsStateOpen(false);
    if (stateName !== canonicalStateName) {
      onStateChange(stateName);
      // Reset city if changing state and previous city doesn't belong to the new state
      if (selectedCity && !isCityInIndianState(stateName, selectedCity)) {
        setIsOtherCity(false);
        setCustomCity("");
        onCityChange("");
      }
    }
  };

  const handleCityDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === OTHER_CITY_VALUE) {
      setIsOtherCity(true);
      setCustomCity("");
      onCityChange("");
    } else {
      setIsOtherCity(false);
      setCustomCity("");
      onCityChange(val);
    }
  };

  const handleCustomCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomCity(val);
    onCityChange(val);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* STATE / UNION TERRITORY SELECTOR */}
        <div className="relative" ref={stateDropdownRef}>
          <label
            htmlFor={`${idPrefix}-state-btn`}
            className="block text-xs font-medium text-slate-700 mb-1"
          >
            {stateLabel}
          </label>

          <button
            id={`${idPrefix}-state-btn`}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && setIsStateOpen((prev) => !prev)}
            aria-haspopup="listbox"
            aria-expanded={isStateOpen}
            className={`w-full flex items-center justify-between rounded-lg border bg-white px-3.5 py-2 text-left text-sm transition focus:outline-none focus:ring-1 ${
              stateError
                ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500"
                : "border-slate-300 focus:border-sky-500 focus:ring-sky-500"
            } ${disabled ? "bg-slate-50 text-slate-400 cursor-not-allowed" : "text-slate-900 cursor-pointer"}`}
          >
            <span className={canonicalStateName ? "text-slate-900 font-medium" : "text-slate-400"}>
              {canonicalStateName || "-- Select State / UT --"}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                isStateOpen ? "rotate-180 text-sky-600" : ""
              }`}
            />
          </button>

          {/* Searchable Dropdown Popover */}
          {isStateOpen && (
            <div className="absolute left-0 right-0 z-50 mt-1.5 max-h-72 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl animate-in fade-in-50 zoom-in-95 duration-100">
              {/* Search Field */}
              <div className="sticky top-0 border-b border-slate-100 bg-slate-50/90 p-2.5 backdrop-blur-xs">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    ref={stateSearchInputRef}
                    type="text"
                    value={stateSearch}
                    onChange={(e) => setStateSearch(e.target.value)}
                    placeholder="Search State or Union Territory..."
                    className="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* States / UTs List */}
              <div className="max-h-56 overflow-y-auto p-1 text-xs">
                {filteredLocations.length === 0 ? (
                  <div className="p-3 text-center text-slate-400">
                    No matching State or UT found
                  </div>
                ) : (
                  filteredLocations.map((loc) => {
                    const isSelected = loc.state === canonicalStateName;
                    return (
                      <button
                        key={loc.state}
                        type="button"
                        onClick={() => handleSelectState(loc.state)}
                        className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-left transition ${
                          isSelected
                            ? "bg-sky-50 text-sky-800 font-semibold"
                            : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{loc.state}</span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                              loc.type === "Union Territory"
                                ? "bg-amber-50 text-amber-700 border border-amber-200/50"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {loc.type === "Union Territory" ? "UT" : "State"}
                          </span>
                        </div>
                        {isSelected && <Check className="h-3.5 w-3.5 text-sky-600" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {stateError && (
            <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              <span>{stateError}</span>
            </p>
          )}
        </div>

        {/* CASCADING CITY SELECTOR */}
        <div>
          <label
            htmlFor={`${idPrefix}-city-select`}
            className="block text-xs font-medium text-slate-700 mb-1"
          >
            {cityLabel}
          </label>

          <select
            id={`${idPrefix}-city-select`}
            disabled={disabled || !canonicalStateName}
            required={required && !isOtherCity}
            value={
              isOtherCity
                ? OTHER_CITY_VALUE
                : availableCities.includes(selectedCity)
                ? selectedCity
                : ""
            }
            onChange={handleCityDropdownChange}
            className={`w-full rounded-lg border bg-white px-3.5 py-2 text-sm transition focus:outline-none focus:ring-1 ${
              cityError
                ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500"
                : "border-slate-300 focus:border-sky-500 focus:ring-sky-500"
            } ${
              disabled || !canonicalStateName
                ? "bg-slate-50 text-slate-400 cursor-not-allowed"
                : "text-slate-900 cursor-pointer"
            }`}
          >
            <option value="" disabled>
              {!canonicalStateName ? "-- Select State first --" : "-- Select City --"}
            </option>
            {availableCities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            {canonicalStateName && (
              <option value={OTHER_CITY_VALUE}>
                Other / Not in list (Specify manually)
              </option>
            )}
          </select>

          {cityError && !isOtherCity && (
            <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              <span>{cityError}</span>
            </p>
          )}
        </div>
      </div>

      {/* MANUAL CITY INPUT FALLBACK (WHEN "OTHER" IS SELECTED) */}
      {isOtherCity && (
        <div className="rounded-lg border border-sky-100 bg-sky-50/40 p-3 animate-in fade-in-50 duration-150">
          <label
            htmlFor={`${idPrefix}-custom-city-input`}
            className="block text-xs font-semibold text-slate-700 mb-1"
          >
            Specify City Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <MapPin className="h-3.5 w-3.5" />
            </div>
            <input
              id={`${idPrefix}-custom-city-input`}
              type="text"
              required={required}
              disabled={disabled}
              value={customCity}
              onChange={handleCustomCityChange}
              placeholder="e.g. Bhiwadi, Najafgarh, Baramati..."
              className={`w-full rounded-lg border bg-white pl-9 pr-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 ${
                cityError
                  ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500"
                  : "border-slate-300 focus:border-sky-500 focus:ring-sky-500"
              }`}
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Enter the exact city or town name where your collection centre operates.
          </p>
          {cityError && (
            <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              <span>{cityError}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
