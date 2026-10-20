"use client";

import React, { useState, useEffect } from "react";
import {
  MapPin,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Layers,
  Search,
  Building2,
  Info,
} from "lucide-react";

interface ServiceArea {
  id: string;
  pincode: string;
  localityName: string | null;
  isActive: boolean;
  branch?: {
    id: string;
    name: string;
    code: string;
  } | null;
  createdAt: string;
}

interface BranchOption {
  id: string;
  name: string;
  code: string;
}

export interface ParsedPincodeEntry {
  pincode: string;
  localityName?: string | null;
}

export function parseBulkPincodes(input: string): {
  entries: ParsedPincodeEntry[];
  invalidTokens: string[];
} {
  const lines = input.split(/\r?\n/);
  const entries: ParsedPincodeEntry[] = [];
  const invalidTokens: string[] = [];
  const PIN_REGEX = /^[1-9][0-9]{5}$/;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Check delimiter format like "560038 - Indiranagar", "560038: Indiranagar", "560038\tIndiranagar"
    const delimiterMatch = line.match(/^(\d{1,10})\s*[-:–—|;\t]\s*(.*)$/);
    if (delimiterMatch) {
      const pinCandidate = delimiterMatch[1].trim();
      const localityCandidate = delimiterMatch[2].trim();

      if (PIN_REGEX.test(pinCandidate)) {
        if (PIN_REGEX.test(localityCandidate)) {
          entries.push({ pincode: pinCandidate, localityName: null });
          entries.push({ pincode: localityCandidate, localityName: null });
        } else {
          entries.push({
            pincode: pinCandidate,
            localityName: localityCandidate.length > 0 ? localityCandidate.slice(0, 100) : null,
          });
        }
      } else {
        invalidTokens.push(pinCandidate);
      }
      continue;
    }

    // Check comma delimiter format like "560001, MG Road"
    const commaMatch = line.match(/^(\d{1,10})\s*,\s*(.*)$/);
    if (commaMatch) {
      const firstToken = commaMatch[1].trim();
      const rest = commaMatch[2].trim();

      if (!/^\d{6}/.test(rest) && !rest.includes(",")) {
        if (PIN_REGEX.test(firstToken)) {
          entries.push({
            pincode: firstToken,
            localityName: rest.length > 0 ? rest.slice(0, 100) : null,
          });
        } else {
          invalidTokens.push(firstToken);
        }
        continue;
      }
    }

    // Otherwise, split line by commas, spaces, tabs, or semicolons
    const tokens = line.split(/[,\s;]+/).filter(Boolean);
    for (const token of tokens) {
      const cleanToken = token.trim();
      if (!cleanToken) continue;
      if (PIN_REGEX.test(cleanToken)) {
        entries.push({ pincode: cleanToken, localityName: null });
      } else {
        invalidTokens.push(cleanToken);
      }
    }
  }

  return { entries, invalidTokens };
}

export function ServiceAreasSettings() {
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Single PIN addition
  const [singlePin, setSinglePin] = useState("");
  const [locality, setLocality] = useState("");
  const [assignedBranchId, setAssignedBranchId] = useState("");

  // Bulk PIN addition
  const [bulkInput, setBulkInput] = useState("");
  const [bulkMode, setBulkMode] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [areasRes, branchesRes] = await Promise.all([
        fetch("/api/lab/service-areas"),
        fetch("/api/lab/branches"),
      ]);

      if (areasRes.ok) {
        const areasData = await areasRes.json();
        setServiceAreas(areasData.serviceAreas || []);
      }

      if (branchesRes.ok) {
        const branchData = await branchesRes.json();
        setBranches(branchData.branches || []);
      }
    } catch {
      setNotification({
        type: "error",
        message: "Failed to load serviceable areas.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setNotification(null);
    const cleaned = singlePin.trim();

    if (!/^[1-9][0-9]{5}$/.test(cleaned)) {
      setNotification({
        type: "error",
        message: "PIN code must be a valid 6-digit Indian postal code (cannot start with 0).",
      });
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/lab/service-areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pincode: cleaned,
          localityName: locality.trim() || undefined,
          branchId: assignedBranchId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add PIN code.");
      }
      setSinglePin("");
      setLocality("");
      setNotification({
        type: "success",
        message: `Service area PIN code ${cleaned}${locality.trim() ? ` (${locality.trim()})` : ""} added successfully.`,
      });
      await loadData();
    } catch (err: unknown) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to add PIN code.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setNotification(null);

    const { entries, invalidTokens } = parseBulkPincodes(bulkInput);

    if (entries.length === 0 && invalidTokens.length === 0) {
      setNotification({
        type: "error",
        message: "Please enter at least one valid 6-digit Indian PIN code.",
      });
      return;
    }

    if (entries.length === 0 && invalidTokens.length > 0) {
      setNotification({
        type: "error",
        message: `Invalid 6-digit PIN codes detected: ${invalidTokens.slice(0, 5).join(", ")}${invalidTokens.length > 5 ? "..." : ""}`,
      });
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/lab/service-areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pincodes: entries,
          branchId: assignedBranchId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save bulk PIN codes.");
      }
      setBulkInput("");

      const parts: string[] = [];
      if (data.addedCount > 0) {
        parts.push(`Added ${data.addedCount} new serviceable PIN code${data.addedCount > 1 ? "s" : ""}`);
      }
      if (data.skippedCount > 0) {
        parts.push(`${data.skippedCount} skipped (already existing)`);
      }
      const allInvalid = [
        ...invalidTokens,
        ...(Array.isArray(data.invalidPincodes) ? data.invalidPincodes : []),
      ];
      const uniqueInvalid = Array.from(new Set(allInvalid));
      if (uniqueInvalid.length > 0) {
        parts.push(`${uniqueInvalid.length} invalid (${uniqueInvalid.slice(0, 3).join(", ")}${uniqueInvalid.length > 3 ? "…" : ""})`);
      }

      const isSuccess = data.addedCount > 0;
      setNotification({
        type: isSuccess ? "success" : "error",
        message: parts.join(", ") || "No PIN codes were updated.",
      });
      await loadData();
    } catch (err: unknown) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save bulk PIN codes.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string, pincode: string) => {
    if (!confirm(`Are you sure you want to remove PIN code ${pincode} from your serviceable areas?`)) {
      return;
    }
    setActionLoading(true);
    setNotification(null);
    try {
      const res = await fetch(`/api/lab/service-areas/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete service area.");
      }
      setNotification({
        type: "success",
        message: `PIN code ${pincode} removed from coverage.`,
      });
      await loadData();
    } catch (err: unknown) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to delete service area.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredAreas = serviceAreas.filter((area) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      area.pincode.includes(q) ||
      (area.localityName && area.localityName.toLowerCase().includes(q)) ||
      (area.branch && area.branch.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-sky-600" />
              <h2 className="text-base font-semibold text-slate-900">
                Home Collection Service Areas
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Configure Indian 6-digit postal PIN codes where your phlebotomists can provide home sample collection.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700 border border-sky-200">
              {serviceAreas.length} {serviceAreas.length === 1 ? "PIN Code" : "PIN Codes"} Active
            </span>
          </div>
        </div>

        {/* Informative Guidance Banner */}
        <div className="rounded-xl border border-sky-100 bg-sky-50/70 p-4 text-xs text-sky-900 flex items-start gap-3">
          <Info className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Explicit Serviceability Rules</p>
            <p className="text-sky-800 text-[11px] leading-relaxed">
              When at least one PIN code is defined, patients entering any PIN code outside this list will be prevented from booking Home Sample Collection and instructed to select Lab Visit. If no PIN codes are defined, home collection is unconstrained.
            </p>
          </div>
        </div>

        {notification && (
          <div
            className={`rounded-xl p-4 text-xs font-medium border flex items-center gap-2.5 ${
              notification.type === "error"
                ? "bg-rose-50 border-rose-200 text-rose-700"
                : "bg-emerald-50 border-emerald-200 text-emerald-700"
            }`}
          >
            {notification.type === "error" ? (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Mode Toggle: Single vs Bulk */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => setBulkMode(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              !bulkMode
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Single PIN Entry
          </button>
          <button
            type="button"
            onClick={() => setBulkMode(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              bulkMode
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Bulk PIN Paste
          </button>
        </div>

        {/* Single Form */}
        {!bulkMode ? (
          <form
            onSubmit={handleAddSingle}
            className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/50"
          >
            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                PIN Code *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={singlePin}
                onChange={(e) => setSinglePin(e.target.value.replace(/\D/g, ""))}
                placeholder="e.g. 560038"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Locality / Area Name (Optional)
              </label>
              <input
                type="text"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                placeholder="e.g. Indiranagar, HAL 2nd Stage"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
            {branches.length > 0 && (
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assign to Branch (Optional)
                </label>
                <select
                  value={assignedBranchId}
                  onChange={(e) => setAssignedBranchId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="">Main Laboratory (Default)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className={`sm:col-span-${branches.length > 0 ? "2" : "5"} flex items-end`}>
              <button
                type="submit"
                disabled={actionLoading || !singlePin.trim()}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-700 disabled:opacity-50 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add PIN</span>
              </button>
            </div>
          </form>
        ) : (
          /* Bulk Form */
          <form
            onSubmit={handleAddBulk}
            className="space-y-3 p-4 rounded-xl border border-slate-200 bg-slate-50/50"
          >
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Paste Multiple Indian PIN Codes *
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                Enter one per line as &quot;PIN - Locality&quot; (e.g. 560038 - Indiranagar), or paste multiple PINs separated by commas, spaces, or newlines.
              </p>
              <textarea
                rows={4}
                required
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                placeholder={"560038 - Indiranagar\n560001, MG Road\n560095: Koramangala\nor: 560001, 560038, 560095"}
                className="w-full rounded-lg border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
            {branches.length > 0 && (
              <div className="max-w-xs">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assign all to Branch (Optional)
                </label>
                <select
                  value={assignedBranchId}
                  onChange={(e) => setAssignedBranchId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="">Main Laboratory (Default)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              type="submit"
              disabled={actionLoading || !bulkInput.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-700 disabled:opacity-50 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Import PIN Codes</span>
            </button>
          </form>
        )}

        {/* Existing Service Areas List */}
        <div className="pt-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Coverage List ({filteredAreas.length})
            </h3>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by PIN or locality…"
                className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-xs text-slate-500">
              Loading service areas…
            </div>
          ) : filteredAreas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
              <Layers className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-700">No serviceable PIN codes found</p>
              <p className="text-[11px] text-slate-500 mt-1">
                {searchQuery
                  ? "No PIN codes match your search query."
                  : "Add your first serviceable PIN code above to enable home collection boundary restrictions."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {filteredAreas.map((area) => (
                <div
                  key={area.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 hover:border-slate-300 transition shadow-2xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {area.pincode}
                      </span>
                      {area.localityName && (
                        <span className="text-[11px] text-slate-600 truncate">
                          • {area.localityName}
                        </span>
                      )}
                    </div>
                    {area.branch && (
                      <div className="flex items-center gap-1 text-[10px] text-sky-600 font-medium mt-0.5">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{area.branch.name}</span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(area.id, area.pincode)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                    title={`Delete PIN ${area.pincode}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
