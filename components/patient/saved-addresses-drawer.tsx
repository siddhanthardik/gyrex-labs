"use client";

import React, { useState } from "react";
import { Home, Briefcase, MapPin, Trash2, Edit2, Check, X, Plus, AlertCircle, Loader2 } from "lucide-react";

export interface SavedAddress {
  id: string;
  label: string;
  addressLine1: string;
  addressLine2?: string | null;
  landmark?: string | null;
  locality?: string | null;
  city: string;
  state: string;
  postalCode: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
}

export interface SavedAddressesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  addresses: SavedAddress[];
  selectedAddressId?: string;
  onSelectAddress: (address: SavedAddress) => void;
  onAddressUpdated: () => void;
  patientToken?: string | null;
}

export function SavedAddressesDrawer({
  isOpen,
  onClose,
  addresses,
  selectedAddressId,
  onSelectAddress,
  onAddressUpdated,
  patientToken,
}: SavedAddressesDrawerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("Home");
  const [editLine1, setEditLine1] = useState("");
  const [editLine2, setEditLine2] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editPin, setEditPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartEdit = (addr: SavedAddress) => {
    setEditingId(addr.id);
    setEditLabel(addr.label || "Home");
    setEditLine1(addr.addressLine1);
    setEditLine2(addr.addressLine2 || "");
    setEditCity(addr.city);
    setEditPin(addr.postalCode);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setError(null);
  };

  const handleSaveEdit = async (addressId: string) => {
    if (!editLine1.trim() || !editPin.trim()) {
      setError("Address line 1 and PIN code are required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (patientToken) {
        headers["Authorization"] = `Bearer ${patientToken}`;
      }

      const res = await fetch(`/api/patient/addresses/${addressId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          label: editLabel,
          addressLine1: editLine1.trim(),
          addressLine2: editLine2.trim() || null,
          city: editCity.trim(),
          postalCode: editPin.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update address.");
      }

      setEditingId(null);
      onAddressUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update address.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (addressId: string) => {
    if (!confirm("Are you sure you want to delete this saved address?")) return;

    setLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = {};
      if (patientToken) {
        headers["Authorization"] = `Bearer ${patientToken}`;
      }

      const res = await fetch(`/api/patient/addresses/${addressId}`, {
        method: "DELETE",
        headers,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete address.");
      }

      onAddressUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete address.");
    } finally {
      setLoading(false);
    }
  };

  const getLabelIcon = (label: string) => {
    const l = (label || "").toLowerCase();
    if (l === "work" || l === "office") return <Briefcase className="h-4 w-4 text-purple-600" />;
    return <Home className="h-4 w-4 text-sky-600" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div>
            <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">
              Saved Delivery Addresses
            </h3>
            <p className="text-xs text-zinc-500">Select or manage your addresses for sample collection</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Address List */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1">
          {addresses.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              No saved addresses found. You can enter an address below to save it for future bookings.
            </div>
          ) : (
            addresses.map((addr) => {
              const isSelected = selectedAddressId === addr.id;
              const isEditing = editingId === addr.id;

              if (isEditing) {
                return (
                  <div
                    key={addr.id}
                    className="rounded-2xl border border-sky-400 bg-sky-50/40 p-3.5 space-y-2 dark:bg-zinc-800/80"
                  >
                    <div className="flex items-center justify-between">
                      <select
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="rounded-xl border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold dark:border-zinc-700 dark:bg-zinc-800"
                      >
                        <option value="Home">Home</option>
                        <option value="Work">Work</option>
                        <option value="Other">Other</option>
                      </select>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(addr.id)}
                          disabled={loading}
                          className="flex items-center gap-1 rounded-xl bg-sky-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-sky-500"
                        >
                          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="rounded-xl border border-zinc-300 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={editLine1}
                      onChange={(e) => setEditLine1(e.target.value)}
                      placeholder="House / Flat / Building"
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                    />
                    <input
                      type="text"
                      value={editLine2}
                      onChange={(e) => setEditLine2(e.target.value)}
                      placeholder="Street / Colony"
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        placeholder="City"
                        className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                      />
                      <input
                        type="text"
                        maxLength={6}
                        value={editPin}
                        onChange={(e) => setEditPin(e.target.value)}
                        placeholder="6-digit PIN"
                        className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-mono dark:border-zinc-700 dark:bg-zinc-800"
                      />
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={addr.id}
                  className={`relative rounded-2xl border p-3.5 transition ${
                    isSelected
                      ? "border-sky-500 bg-sky-50/60 shadow-sm dark:bg-sky-950/30"
                      : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-800/40"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => {
                        onSelectAddress(addr);
                        onClose();
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        {getLabelIcon(addr.label)}
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          {addr.label || "Address"}
                        </span>
                        {addr.isDefault && (
                          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            DEFAULT
                          </span>
                        )}
                        {isSelected && (
                          <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                        {addr.addressLine1}
                        {addr.addressLine2 ? `, ${addr.addressLine2}` : ""}
                        {addr.landmark ? ` (Near ${addr.landmark})` : ""}
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                        {addr.city}, {addr.state} —{" "}
                        <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                          {addr.postalCode}
                        </span>
                      </p>
                    </div>

                    <div className="ml-2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(addr)}
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-700"
                        title="Edit address"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(addr.id)}
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                        title="Delete address"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-zinc-900 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
