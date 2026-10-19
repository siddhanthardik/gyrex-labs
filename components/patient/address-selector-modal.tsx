"use client";

import React, { useState, useEffect } from "react";
import {
  MapPin,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Home,
  Building2,
  MapPinOff,
} from "lucide-react";
import { isValidIndianPincode } from "@/services/lab/service-area-service";

export interface AddressData {
  addressLine1: string; // Flat/House/Building
  addressLine2: string; // Street/Colony
  landmark: string;
  locality: string;
  city: string;
  state: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
  branchId?: string;
}

export interface AddressSelectorModalProps {
  labSlug: string;
  labName: string;
  initialAddress: AddressData;
  onAddressConfirmed: (address: AddressData, feeInfo?: { fee: number; freeThreshold: number | null }) => void;
  onCancel?: () => void;
}

export function AddressSelectorModal({
  labSlug,
  labName,
  initialAddress,
  onAddressConfirmed,
}: AddressSelectorModalProps) {
  const [addressLine1, setAddressLine1] = useState(initialAddress.addressLine1 || "");
  const [addressLine2, setAddressLine2] = useState(initialAddress.addressLine2 || "");
  const [landmark, setLandmark] = useState(initialAddress.landmark || "");
  const [locality, setLocality] = useState(initialAddress.locality || "");
  const [city, setCity] = useState(initialAddress.city || "");
  const [state, setState] = useState(initialAddress.state || "");
  const [postalCode, setPostalCode] = useState(initialAddress.postalCode || "");
  const [latitude, setLatitude] = useState<number | undefined>(initialAddress.latitude);
  const [longitude, setLongitude] = useState<number | undefined>(initialAddress.longitude);
  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>(initialAddress.branchId);

  // Geolocation & serviceability check state
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [checkingServiceability, setCheckingServiceability] = useState(false);
  const [serviceability, setServiceability] = useState<{
    checked: boolean;
    serviceable: boolean;
    message?: string;
    fee?: number;
    freeThreshold?: number | null;
    isEnterprise?: boolean;
    assignmentMode?: "AUTOMATIC" | "PATIENT_CHOICE";
    eligibleBranches?: Array<{
      id: string;
      name: string;
      code: string;
      locality: string | null;
      operatingHours: string | null;
      fee: number;
      freeThreshold: number | null;
    }>;
  }>({ checked: false, serviceable: false });

  // Debounced serviceability check when PIN code changes
  useEffect(() => {
    const cleanPin = postalCode.trim();
    if (!isValidIndianPincode(cleanPin)) {
      setServiceability({ checked: false, serviceable: false });
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingServiceability(true);
      try {
        const res = await fetch(`/api/labs/${labSlug}/serviceability?pincode=${cleanPin}`);
        const data = await res.json();
        if (data.serviceable) {
          setServiceability({
            checked: true,
            serviceable: true,
            fee: data.defaultFee,
            freeThreshold: data.defaultFreeThreshold,
            isEnterprise: data.isEnterprise,
            assignmentMode: data.assignmentMode,
            eligibleBranches: data.eligibleBranches || [],
          });
          if (data.eligibleBranches && data.eligibleBranches.length > 0 && !selectedBranchId) {
            setSelectedBranchId(data.eligibleBranches[0].id);
          }
        } else {
          setServiceability({
            checked: true,
            serviceable: false,
            message: data.message || "This area is currently outside home collection coverage.",
          });
        }
      } catch {
        setServiceability({
          checked: true,
          serviceable: true, // fallback to avoid hard blocking network failures
        });
      } finally {
        setCheckingServiceability(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [postalCode, labSlug, selectedBranchId]);

  // Browser Geolocation flow (Requires explicit patient consent)
  const handleUseCurrentLocation = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser. Please enter address manually.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          setLocationError("Location permission denied. Please enter your address and PIN code manually.");
        } else {
          setLocationError("Unable to retrieve your current location. Please enter your address manually.");
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressLine1.trim()) {
      alert("Please enter House/Flat/Building details.");
      return;
    }
    if (!isValidIndianPincode(postalCode.trim())) {
      alert("Please enter a valid 6-digit Indian PIN code.");
      return;
    }

    const address: AddressData = {
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim(),
      landmark: landmark.trim(),
      locality: locality.trim(),
      city: city.trim(),
      state: state.trim(),
      postalCode: postalCode.trim(),
      latitude,
      longitude,
      branchId: selectedBranchId,
    };

    onAddressConfirmed(address, {
      fee: serviceability.fee ?? 100,
      freeThreshold: serviceability.freeThreshold ?? null,
    });
  };

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
            <Home className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
              Home Sample Collection Address
            </h3>
            <p className="text-xs text-zinc-500">
              Enter your exact address for doorstep phlebotomist visit
            </p>
          </div>
        </div>

        {/* GPS Location Button */}
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={locating}
          className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300 transition"
        >
          {locating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Navigation className="h-3.5 w-3.5" />
          )}
          {locating ? "Detecting..." : "Use Current Location"}
        </button>
      </div>

      {locationError && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>{locationError}</span>
        </div>
      )}

      <form onSubmit={handleConfirm} className="mt-4 space-y-3">
        {/* House / Flat No & Street */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Flat / House / Floor / Building *
            </label>
            <input
              type="text"
              required
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="e.g. Flat 402, Tower B, Green Meadows"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Street / Road / Colony
            </label>
            <input
              type="text"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              placeholder="e.g. 5th Main Road, Sector 14"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>
        </div>

        {/* Landmark & Locality */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Landmark (Optional)
            </label>
            <input
              type="text"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="e.g. Opposite City Park, Near Metro Gate 2"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Area / Locality
            </label>
            <input
              type="text"
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              placeholder="e.g. Janakpuri West"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>
        </div>

        {/* PIN Code, City, State */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              6-Digit Pincode *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                maxLength={6}
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ""))}
                placeholder="e.g. 110058"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs font-bold text-zinc-900 placeholder:font-normal placeholder:text-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
              {checkingServiceability && (
                <div className="absolute right-3 top-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              City *
            </label>
            <input
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              State *
            </label>
            <input
              type="text"
              required
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="State"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>
        </div>

        {/* Serviceability Feedback Card */}
        {serviceability.checked && (
          <div className="pt-2">
            {serviceability.serviceable ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Home sample collection is available in PIN {postalCode}!</span>
                </div>
                <div className="mt-1 pl-6 text-[11px] text-emerald-700 dark:text-emerald-300">
                  Standard collection fee: ₹{serviceability.fee}
                  {serviceability.freeThreshold
                    ? ` (FREE on orders above ₹${serviceability.freeThreshold})`
                    : ""}
                </div>

                {/* Patient Choice Mode: Branch Selection Radio Cards */}
                {serviceability.assignmentMode === "PATIENT_CHOICE" &&
                  serviceability.eligibleBranches &&
                  serviceability.eligibleBranches.length > 1 && (
                    <div className="mt-3 pt-3 border-t border-emerald-200/80 dark:border-emerald-900/60">
                      <span className="block font-bold text-[11px] text-emerald-900 dark:text-emerald-200 mb-2">
                        Select Diagnostic Centre / Branch:
                      </span>
                      <div className="space-y-2">
                        {serviceability.eligibleBranches.map((branch) => (
                          <label
                            key={branch.id}
                            className={`flex items-center justify-between rounded-xl border p-2.5 cursor-pointer transition ${
                              selectedBranchId === branch.id
                                ? "border-emerald-500 bg-white shadow-sm dark:bg-zinc-900"
                                : "border-emerald-200/60 hover:bg-emerald-100/40 dark:border-emerald-900/40"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="branchSelector"
                                value={branch.id}
                                checked={selectedBranchId === branch.id}
                                onChange={() => setSelectedBranchId(branch.id)}
                                className="text-emerald-600 focus:ring-emerald-500"
                              />
                              <div>
                                <div className="font-bold text-zinc-900 dark:text-white">
                                  {branch.name}
                                </div>
                                <div className="text-[10px] text-zinc-500">
                                  {branch.locality || branch.code} • {branch.operatingHours || "07:00 AM - 08:00 PM"}
                                </div>
                              </div>
                            </div>
                            <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200">
                              ₹{branch.fee}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            ) : (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-3 text-xs text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                <div className="flex items-start gap-2">
                  <MapPinOff className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <div>
                    <span className="font-bold">Outside Home Collection Coverage</span>
                    <p className="mt-0.5 text-[11px] text-rose-700 dark:text-rose-300">
                      {serviceability.message ||
                        `${labName} does not currently provide home sample collection in PIN ${postalCode}.`}
                    </p>
                    <p className="mt-1 font-semibold text-sky-700 dark:text-sky-400">
                      Tip: You can change your booking type to "Laboratory Visit" on checkout.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={serviceability.checked && !serviceability.serviceable}
            className="w-full rounded-xl bg-sky-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {serviceability.checked && !serviceability.serviceable
              ? "Area Not Serviceable"
              : "Confirm Address & Proceed"}
          </button>
        </div>
      </form>
    </div>
  );
}
