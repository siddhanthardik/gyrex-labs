"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useCart } from "@/components/patient/cart-context";
import {
  User,
  Phone,
  Mail,
  Calendar,
  Home,
  MapPin,
  CreditCard,
  Banknote,
  AlertCircle,
  Shield,
  Clock,
  Check,
  ChevronRight,
  FlaskConical,
  Package2,
  Lock,
  Navigation,
  Building2,
  CheckCircle2,
  MapPinOff,
  Loader2,
  Bookmark,
} from "lucide-react";
import Link from "next/link";
import { AddressSearchInput } from "@/components/patient/address-search-input";
import { SavedAddressesDrawer, SavedAddress } from "@/components/patient/saved-addresses-drawer";
import { AddressSuggestion } from "@/services/integrations/geocoding/address-provider";

const TIME_SLOTS = [
  "06:00 AM - 07:00 AM",
  "07:00 AM - 08:00 AM",
  "08:00 AM - 09:00 AM",
  "09:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "05:00 PM - 06:00 PM",
  "06:00 PM - 07:00 PM",
];

export default function CheckoutPage() {
  const routeParams = useParams<{ labSlug: string }>();
  const router = useRouter();
  const { items, collectionType, setCollectionType, subtotal, clearCart, labSlug: cartLabSlug, isHydrated } = useCart();
  const labSlug = routeParams?.labSlug || cartLabSlug;

  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER">("MALE");

  // Address fields
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [landmark, setLandmark] = useState("");
  const [locality, setLocality] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Authenticated patient session & saved addresses
  const [patientToken, setPatientToken] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState(false);
  const [providerStatus, setProviderStatus] = useState<{
    provider: "google" | "mappls" | "none";
    isConfigured: boolean;
    status: "ACTIVE" | "PROVIDER_CREDENTIALS_PENDING";
    message: string;
  } | null>(null);

  // Branch & serviceability state
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [calculatedCollectionFee, setCalculatedCollectionFee] = useState<number>(0);
  const [isServiceable, setIsServiceable] = useState<boolean | null>(null);
  const [serviceabilityMessage, setServiceabilityMessage] = useState<string | null>(null);
  const [checkingServiceability, setCheckingServiceability] = useState(false);
  const [eligibleBranches, setEligibleBranches] = useState<
    Array<{
      id: string;
      name: string;
      code: string;
      locality: string | null;
      operatingHours: string | null;
      fee: number;
      freeThreshold: number | null;
      maxDailyCapacity?: number | null;
    }>
  >([]);
  const [assignmentMode, setAssignmentMode] = useState<"AUTOMATIC" | "PATIENT_CHOICE">("AUTOMATIC");

  // Booking details & submission
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledSlot, setScheduledSlot] = useState(TIME_SLOTS[1]);
  const [paymentMethod, setPaymentMethod] = useState<"CASH_ON_COLLECTION" | "RAZORPAY">(
    "CASH_ON_COLLECTION"
  );
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOrderSubmitted, setIsOrderSubmitted] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const finalPayable = subtotal + (collectionType === "HOME_COLLECTION" ? calculatedCollectionFee : 0);

  // Initialize client idempotency key
  useEffect(() => {
    setIdempotencyKey(`ord_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
  }, []);

  // Load address provider status
  useEffect(() => {
    fetch("/api/patient/address-lookup")
      .then((res) => res.json())
      .then((data) => {
        if (data.status) setProviderStatus(data.status);
      })
      .catch(() => {});
  }, []);

  // Authenticate patient and fetch saved addresses when valid phone is entered
  const loadSavedAddresses = (tokenToUse?: string) => {
    const activeToken = tokenToUse || patientToken;
    const digits = phone.replace(/\D/g, "");
    if (digits.length >= 10) {
      const headers: Record<string, string> = {};
      if (activeToken) {
        headers["Authorization"] = `Bearer ${activeToken}`;
      }

      fetch(`/api/patient/addresses?phone=${digits}`, { headers })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.addresses)) {
            setSavedAddresses(data.addresses);
          }
        })
        .catch(() => {});
    } else {
      setSavedAddresses([]);
    }
  };

  useEffect(() => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length >= 10) {
      // Authenticate patient session
      fetch("/api/patient/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: digits, fullName: patientName }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.token) {
            setPatientToken(data.token);
            loadSavedAddresses(data.token);
          }
        })
        .catch(() => {});
    } else {
      setSavedAddresses([]);
    }
  }, [phone]);

  // Debounced serviceability check for PIN code with dynamic branch re-evaluation
  useEffect(() => {
    if (collectionType !== "HOME_COLLECTION") {
      setIsServiceable(true);
      setServiceabilityMessage(null);
      setCalculatedCollectionFee(0);
      return;
    }

    const cleanPin = postalCode.trim();
    if (!/^[1-9][0-9]{5}$/.test(cleanPin)) {
      setIsServiceable(null);
      setServiceabilityMessage(null);
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setCheckingServiceability(true);
      try {
        const res = await fetch(
          `/api/labs/${labSlug}/serviceability?pincode=${cleanPin}&subtotal=${subtotal}`
        );
        if (!active) return;
        if (res.ok) {
          const data = await res.json();
          setIsServiceable(Boolean(data.isServiceable));
          setServiceabilityMessage(data.message || null);
          setCalculatedCollectionFee(Number(data.homeCollectionFee || 0));

          const branches = data.eligibleBranches || [];
          setEligibleBranches(branches);

          if (data.assignmentMode) {
            setAssignmentMode(data.assignmentMode);
          }

          // Dynamic branch selection: If existing selection is not valid for the new PIN, re-assign
          if (branches.length > 0) {
            const isCurrentStillEligible = branches.some((b: any) => b.id === selectedBranchId);
            if (!isCurrentStillEligible) {
              setSelectedBranchId(branches[0].id);
            }
          } else {
            setSelectedBranchId(null);
          }
        } else {
          setIsServiceable(null);
        }
      } catch {
        if (active) setIsServiceable(null);
      } finally {
        if (active) setCheckingServiceability(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [postalCode, collectionType, labSlug, subtotal]);

  // Handle address suggestion selected from autocomplete
  const handleSelectSuggestion = (item: AddressSuggestion) => {
    if (item.postalCode) setPostalCode(item.postalCode);
    if (item.locality) setLocality(item.locality);
    if (item.city) setCity(item.city);
    if (item.state) setState(item.state);
    if (item.addressLine1) setAddressLine1(item.addressLine1);
    if (item.latitude) setLatitude(item.latitude);
    if (item.longitude) setLongitude(item.longitude);
  };

  // Handle saved address selection
  const handleSelectSavedAddress = (addr: SavedAddress) => {
    setAddressLine1(addr.addressLine1 || "");
    setAddressLine2(addr.addressLine2 || "");
    setLandmark(addr.landmark || "");
    setLocality(addr.locality || "");
    setCity(addr.city || "");
    setState(addr.state || "");
    setPostalCode(addr.postalCode || "");
    if (addr.latitude) setLatitude(addr.latitude);
    if (addr.longitude) setLongitude(addr.longitude);
  };

  // Consented browser geolocation lookup
  const handleUseCurrentLocation = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser. Please enter your address manually.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setLocating(false);

        // Reverse geocode if provider is active
        try {
          const res = await fetch(
            `/api/patient/address-lookup?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.suggestion) {
              handleSelectSuggestion(data.suggestion);
            }
          }
        } catch {
          // Gracefully retain lat/lng coordinates and allow manual PIN entry
        }
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          setLocationError("Location access was denied. Please enter your address details manually.");
        } else {
          setLocationError("Unable to acquire location coordinates. Please enter manually.");
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!patientName.trim() || !phone.trim()) {
      setError("Patient name and phone number are required.");
      return;
    }
    if (phone.replace(/\D/g, "").length < 10) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }
    if (!scheduledDate) {
      setError("Please select a collection date.");
      return;
    }
    if (collectionType === "HOME_COLLECTION") {
      if (!addressLine1.trim()) {
        setError("Please enter your collection address for home collection.");
        return;
      }
      if (!postalCode.trim() || !/^[1-9][0-9]{5}$/.test(postalCode.trim())) {
        setError("Please enter a valid 6-digit Indian postal PIN code.");
        return;
      }
      if (isServiceable === false) {
        setError(
          serviceabilityMessage ||
            `Home sample collection is not available in PIN code ${postalCode}. Please choose Visit Laboratory or enter a serviceable PIN code.`
        );
        return;
      }
    }
    if (items.length === 0) {
      setError("Your cart is empty. Please add tests before checking out.");
      return;
    }

    setLoading(true);
    let submissionSucceeded = false;

    try {
      const labRes = await fetch(`/api/labs/${labSlug}/info`);
      if (!labRes.ok) {
        throw new Error("Unable to verify laboratory. Please refresh and try again.");
      }
      const labData = await labRes.json();
      const resolvedLabId = labData.id;

      const payload = {
        labId: resolvedLabId,
        idempotencyKey,
        patient: {
          fullName: patientName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          ageYears: age ? parseInt(age, 10) : undefined,
          gender,
        },
        collection: {
          type: collectionType,
          scheduledDate,
          scheduledSlot,
          addressLine1: addressLine1.trim() || undefined,
          addressLine2: [addressLine2.trim(), locality.trim()].filter(Boolean).join(", ") || undefined,
          landmark: landmark.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          postalCode: postalCode.trim() || undefined,
          branchId: selectedBranchId || undefined,
          latitude: latitude || undefined,
          longitude: longitude || undefined,
        },
        items: items.map((item) => ({
          itemType: item.itemType,
          id: item.id,
        })),
        paymentMethod,
      };

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (idempotencyKey) {
        headers["Idempotency-Key"] = idempotencyKey;
      }
      if (patientToken) {
        headers["Authorization"] = `Bearer ${patientToken}`;
      }

      const res = await fetch("/api/patient/orders", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to place your order. Please try again.");
      }

      if (data.patientToken) {
        setPatientToken(data.patientToken);
      }

      submissionSucceeded = true;
      setIsOrderSubmitted(true);
      clearCart();
      const redirectUrl =
        paymentMethod === "RAZORPAY"
          ? `/${labSlug}/booking/${data.orderNumber}?payNow=true&phone=${encodeURIComponent(phone.trim())}`
          : `/${labSlug}/booking/${data.orderNumber}`;
      router.push(redirectUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setIsOrderSubmitted(false);
    } finally {
      if (!submissionSucceeded) {
        setLoading(false);
      }
    }
  };

  if (!isHydrated) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <div className="mx-auto h-8 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mx-auto mt-6 h-64 max-w-md animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
      </div>
    );
  }

  if (items.length === 0 && !isOrderSubmitted) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Cart is Empty</h2>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Please add tests or health packages before proceeding with checkout.
          </p>
          <Link
            href={`/${labSlug}/tests`}
            className="mt-5 inline-flex items-center gap-1.5 rounded-2xl bg-sky-700 px-6 py-3 text-xs font-bold text-white shadow-sm hover:bg-sky-600 transition"
          >
            Browse Diagnostic Tests
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-4 sm:px-6 space-y-4">
      {/* Checkout Stepper Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-sky-800 to-sky-700 p-5 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-extrabold text-white">Complete Booking</h1>
            <p className="text-xs text-sky-100 mt-0.5">Direct Diagnostic Reservation with Laboratory</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold bg-white/10 px-3 py-1.5 rounded-2xl backdrop-blur-xs">
            <Lock className="h-3.5 w-3.5" />
            <span>Secure Checkout</span>
          </div>
        </div>
      </div>

      {/* Cart Summary Header */}
      <div className="rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
              <FlaskConical className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
              {items.length} {items.length === 1 ? "Item" : "Items"} in Cart
            </span>
          </div>
          <Link
            href={`/${labSlug}/cart`}
            className="text-xs font-bold text-sky-700 hover:text-sky-600 dark:text-sky-400"
          >
            Edit Cart
          </Link>
        </div>

        {/* Selected Items */}
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
          {items.map((it) => (
            <div key={`${it.itemType}-${it.id}`} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2">
                {it.itemType === "TEST" ? (
                  <FlaskConical className="h-3.5 w-3.5 text-sky-600" />
                ) : (
                  <Package2 className="h-3.5 w-3.5 text-purple-600" />
                )}
                <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 line-clamp-1 max-w-[280px]">
                  {it.name}
                </span>
              </div>
              <span className="text-xs font-bold text-zinc-900 dark:text-white">₹{it.price}</span>
            </div>
          ))}
        </div>

        {/* Financial Breakdown */}
        <div className="mt-3 rounded-2xl bg-zinc-50 p-3.5 text-xs dark:bg-zinc-850 space-y-1.5">
          <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
            <span>Tests Subtotal</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">₹{subtotal}</span>
          </div>
          {collectionType === "HOME_COLLECTION" && (
            <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
              <span>Home Sample Collection</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {calculatedCollectionFee === 0 ? (
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">FREE</span>
                ) : (
                  `₹${calculatedCollectionFee}`
                )}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t border-zinc-200 pt-2 text-sm font-extrabold text-zinc-900 dark:border-zinc-700 dark:text-white">
            <span>Total Payable</span>
            <span className="text-sky-700 dark:text-sky-400">₹{finalPayable}</span>
          </div>
        </div>
      </div>

      {/* Main Booking Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1: Patient Information */}
        <div className="rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white">
                1. Patient Information
              </h2>
              <p className="text-[11px] text-zinc-500">Official details for clinical reporting</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Full Name (as per Govt ID) *
              </label>
              <input
                type="text"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-sky-600"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="flex items-center gap-1 text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  <Phone className="h-3 w-3 text-zinc-400" /> Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="10-digit mobile"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-sky-600"
                />
              </div>

              <div>
                <label className="flex items-center gap-1 text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  <Mail className="h-3 w-3 text-zinc-400" /> Email (Optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="For email report copy"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-sky-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Age (Years)
                </label>
                <input
                  type="number"
                  min="1"
                  max="130"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 32"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-sky-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Gender *
                </label>
                <select
                  required
                  value={gender}
                  onChange={(e) => setGender(e.target.value as "MALE" | "FEMALE" | "OTHER")}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-sky-600"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Schedule & Address */}
        <div className="rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
              {collectionType === "HOME_COLLECTION" ? (
                <Home className="h-4 w-4" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white">
                2. Schedule &amp; {collectionType === "HOME_COLLECTION" ? "Address" : "Slot"}
              </h2>
              <p className="text-[11px] text-zinc-500">
                {collectionType === "HOME_COLLECTION" ? "Home sample pickup" : "Lab visit timing"}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="flex items-center gap-1 text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  <Calendar className="h-3 w-3 text-zinc-400" /> Collection Date *
                </label>
                <input
                  type="date"
                  required
                  min={today}
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-sky-600"
                />
              </div>

              <div>
                <label className="flex items-center gap-1 text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  <Clock className="h-3 w-3 text-zinc-400" /> Time Slot *
                </label>
                <select
                  required
                  value={scheduledSlot}
                  onChange={(e) => setScheduledSlot(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-sky-600"
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Address fields if Home Collection */}
            {collectionType === "HOME_COLLECTION" && (
              <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Sample Pickup Address
                  </span>
                  <div className="flex items-center gap-2">
                    {savedAddresses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsSavedDrawerOpen(true)}
                        className="inline-flex items-center gap-1 rounded-xl border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] font-semibold text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/60 dark:text-purple-300 transition"
                      >
                        <Bookmark className="h-3 w-3" />
                        <span>Manage Saved ({savedAddresses.length})</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={locating}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300 transition"
                    >
                      {locating ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Navigation className="h-3 w-3" />
                      )}
                      <span>{locating ? "Detecting GPS…" : "Use GPS"}</span>
                    </button>
                  </div>
                </div>

                {/* Zomato/Blinkit Style Address Search Input */}
                <AddressSearchInput
                  onSelectSuggestion={handleSelectSuggestion}
                  providerStatus={providerStatus}
                />

                {/* Saved addresses selector pills for quick selection */}
                {savedAddresses.length > 0 && (
                  <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-2.5 dark:border-sky-900/40 dark:bg-sky-950/20">
                    <span className="text-[11px] font-bold text-sky-900 dark:text-sky-200 block mb-1.5">
                      Select Saved Address:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {savedAddresses.map((addr) => (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() => handleSelectSavedAddress(addr)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-white px-2.5 py-1.5 text-xs text-zinc-800 shadow-xs hover:border-sky-400 hover:bg-sky-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition"
                        >
                          <Home className="h-3 w-3 text-sky-600" />
                          <span className="font-semibold">{addr.label || "Saved"}:</span>
                          <span className="truncate max-w-[180px]">{addr.addressLine1}, PIN {addr.postalCode}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {locationError && (
                  <div className="flex items-center gap-1.5 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                    <span>{locationError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    House / Flat / Building No. *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="e.g. Flat 402, Green Meadows"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-sky-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Street / Road / Sector
                  </label>
                  <input
                    type="text"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="e.g. 5th Main Road"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-sky-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Locality / Area
                    </label>
                    <input
                      type="text"
                      value={locality}
                      onChange={(e) => setLocality(e.target.value)}
                      placeholder="e.g. Indiranagar Stage 2"
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-sky-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Bengaluru"
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-sky-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Landmark (Optional)
                    </label>
                    <input
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="Near Apollo Clinic"
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-sky-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      6-Digit PIN Code *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="e.g. 560038"
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm font-mono text-zinc-900 placeholder:text-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-sky-600"
                    />
                  </div>
                </div>

                {/* Serviceability Status Banner */}
                {postalCode.length === 6 && (
                  <div className="pt-0.5">
                    {checkingServiceability ? (
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-600" />
                        <span>Verifying serviceability for PIN {postalCode}…</span>
                      </div>
                    ) : isServiceable === true ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span className="font-semibold">Home collection is available</span>
                        </div>
                        <span className="text-[11px] font-bold">
                          {calculatedCollectionFee === 0 ? "FREE PICKUP" : `Pickup: ₹${calculatedCollectionFee}`}
                        </span>
                      </div>
                    ) : isServiceable === false ? (
                      <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300 space-y-1.5">
                        <div className="flex items-start gap-2">
                          <MapPinOff className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                          <div>
                            <p className="font-bold">Outside Home Collection Coverage</p>
                            <p className="text-[11px] mt-0.5 text-rose-700 dark:text-rose-300">
                              {serviceabilityMessage || `Home sample collection is not offered in PIN ${postalCode}.`}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCollectionType("LAB_VISIT")}
                          className="text-[11px] font-bold text-sky-700 dark:text-sky-400 hover:underline inline-block pt-1"
                        >
                          Switch to Laboratory Visit instead →
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Mode 1: AUTOMATIC Assignment Notice */}
                {isServiceable && assignmentMode === "AUTOMATIC" && eligibleBranches.length > 0 && (
                  <div className="rounded-xl bg-sky-50/70 border border-sky-100 p-2.5 text-xs text-sky-900 dark:bg-sky-950/40 dark:border-sky-900/50 dark:text-sky-200 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-sky-600" />
                      <span>
                        Assigned: <strong>{eligibleBranches[0].name}</strong>
                      </span>
                    </div>
                    <span className="text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full font-bold dark:bg-sky-900 dark:text-sky-200">
                      Auto-Assigned
                    </span>
                  </div>
                )}

                {/* Mode 2: PATIENT_CHOICE Branch Selection */}
                {isServiceable && assignmentMode === "PATIENT_CHOICE" && eligibleBranches.length > 1 && (
                  <div className="pt-2 space-y-2">
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      Choose Nearest / Preferred Processing Center *
                    </label>
                    <div className="space-y-2">
                      {eligibleBranches.map((branch) => (
                        <label
                          key={branch.id}
                          className={`flex cursor-pointer items-center justify-between p-3 rounded-xl border transition ${
                            selectedBranchId === branch.id
                              ? "border-sky-600 bg-sky-50/70 dark:border-sky-500 dark:bg-sky-950/40"
                              : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="radio"
                              name="selectedBranch"
                              value={branch.id}
                              checked={selectedBranchId === branch.id}
                              onChange={() => setSelectedBranchId(branch.id)}
                              className="text-sky-600"
                            />
                            <div>
                              <p className="text-xs font-bold text-zinc-900 dark:text-white">
                                {branch.name}
                              </p>
                              {branch.locality && (
                                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                  {branch.locality}
                                  {branch.operatingHours ? ` • ${branch.operatingHours}` : ""}
                                </p>
                              )}
                            </div>
                          </div>
                          {branch.fee !== null && (
                            <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                              Fee: ₹{branch.fee}
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Payment Method */}
        <div className="rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white">
                3. Payment Method
              </h2>
              <p className="text-[11px] text-zinc-500">Choose how you wish to pay</p>
            </div>
          </div>

          <div className="space-y-2.5">
            <label
              className={`flex cursor-pointer items-center justify-between p-4 rounded-2xl border-2 transition ${
                paymentMethod === "CASH_ON_COLLECTION"
                  ? "border-sky-600 bg-sky-50/70 dark:border-sky-500 dark:bg-sky-950/40"
                  : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-850"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="CASH_ON_COLLECTION"
                  checked={paymentMethod === "CASH_ON_COLLECTION"}
                  onChange={() => setPaymentMethod("CASH_ON_COLLECTION")}
                  className="h-4 w-4 text-sky-600"
                />
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <Banknote className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-900 dark:text-white">
                    Pay on Sample Collection
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Pay via Cash, UPI QR, or Card at collection
                  </p>
                </div>
              </div>
              {paymentMethod === "CASH_ON_COLLECTION" && (
                <Check className="h-4 w-4 text-sky-600" />
              )}
            </label>

            <label
              className={`flex cursor-pointer items-center justify-between p-4 rounded-2xl border-2 transition ${
                paymentMethod === "RAZORPAY"
                  ? "border-sky-600 bg-sky-50/70 dark:border-sky-500 dark:bg-sky-950/40"
                  : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-850"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="RAZORPAY"
                  checked={paymentMethod === "RAZORPAY"}
                  onChange={() => setPaymentMethod("RAZORPAY")}
                  className="h-4 w-4 text-sky-600"
                />
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-900 dark:text-white">
                    Online Payment (UPI, Cards, NetBanking)
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Instant &amp; secure Razorpay checkout
                  </p>
                </div>
              </div>
              {paymentMethod === "RAZORPAY" && (
                <Check className="h-4 w-4 text-sky-600" />
              )}
            </label>
          </div>

          {/* Direct Lab Payment Notice */}
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-sky-50/70 p-3 text-[11px] text-sky-900 border border-sky-100 dark:bg-sky-950/30 dark:text-sky-200 dark:border-sky-900/50">
            <Shield className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                Pay laboratory directly.
              </p>
              <p className="text-sky-700 dark:text-sky-300 text-[10px] mt-0.5">
                Diagnostic payment is for the laboratory. Powered by Gyrex Labs.
              </p>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-700 py-4 text-sm font-bold text-white shadow-md hover:bg-sky-600 active:scale-[0.99] transition disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Confirming Booking with Lab…</span>
              </>
            ) : paymentMethod === "RAZORPAY" ? (
              <span>Proceed to Pay (₹{finalPayable})</span>
            ) : (
              <span>Confirm &amp; Place Booking (₹{finalPayable})</span>
            )}
          </button>
          <p className="mt-2 text-center text-[11px] text-zinc-400">
            By booking, you agree to share order details with the laboratory for diagnostic processing.
          </p>
        </div>
      </form>

      {/* Saved Addresses Drawer / Modal */}
      <SavedAddressesDrawer
        isOpen={isSavedDrawerOpen}
        onClose={() => setIsSavedDrawerOpen(false)}
        addresses={savedAddresses}
        onSelectAddress={(addr) => {
          handleSelectSavedAddress(addr);
          setIsSavedDrawerOpen(false);
        }}
        onAddressUpdated={() => loadSavedAddresses()}
        patientToken={patientToken}
      />
    </div>
  );
}
