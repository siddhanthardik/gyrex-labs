"use client";

import { useState } from "react";
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
} from "lucide-react";
import Link from "next/link";

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
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledSlot, setScheduledSlot] = useState(TIME_SLOTS[1]);
  const [paymentMethod, setPaymentMethod] = useState<"CASH_ON_COLLECTION" | "RAZORPAY">(
    "CASH_ON_COLLECTION"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOrderSubmitted, setIsOrderSubmitted] = useState(false);

  const today = new Date().toISOString().split("T")[0];

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
    if (collectionType === "HOME_COLLECTION" && !addressLine1.trim()) {
      setError("Please enter your collection address for home collection.");
      return;
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
          addressLine2: addressLine2.trim() || undefined,
          landmark: landmark.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          postalCode: postalCode.trim() || undefined,
        },
        items: items.map((item) => ({
          itemType: item.itemType,
          id: item.id,
        })),
        paymentMethod,
      };

      const res = await fetch("/api/patient/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to place your order. Please try again.");
      }

      submissionSucceeded = true;
      setIsOrderSubmitted(true);
      clearCart();
      router.push(`/${labSlug}/booking/${data.orderNumber}`);
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
            <p className="text-xs text-sky-100 mt-0.5">
              Review order &amp; confirm sample pickup
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-white">
            <Lock className="h-5 w-5" />
          </div>
        </div>

        {/* 3 Step indicators */}
        <div className="mt-4 flex items-center justify-between text-[11px] font-semibold text-sky-100 pt-3 border-t border-white/15">
          <span className="flex items-center gap-1 text-white">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-extrabold text-sky-800">
              1
            </span>
            Patient
          </span>
          <ChevronRight className="h-3 w-3 text-sky-300" />
          <span className="flex items-center gap-1 text-white">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-extrabold text-sky-800">
              2
            </span>
            Schedule
          </span>
          <ChevronRight className="h-3 w-3 text-sky-300" />
          <span className="flex items-center gap-1 text-white">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-extrabold text-sky-800">
              3
            </span>
            Payment
          </span>
        </div>
      </div>

      {/* Order Item Summary Pill Card */}
      <div className="rounded-3xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Selected Tests ({items.length})
          </span>
          <Link
            href={`/${labSlug}/cart`}
            className="text-xs font-bold text-sky-600 hover:underline dark:text-sky-400"
          >
            Edit Cart
          </Link>
        </div>

        <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl bg-zinc-50 px-3 py-2 text-xs dark:bg-zinc-800/60"
            >
              <div className="flex items-center gap-2 truncate">
                {item.itemType === "PACKAGE" ? (
                  <Package2 className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                ) : (
                  <FlaskConical className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                )}
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                  {item.name}
                </span>
              </div>
              <span className="font-bold text-zinc-900 dark:text-white shrink-0">
                ₹{item.price}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2 text-xs dark:border-zinc-800">
          <span className="font-semibold text-zinc-600 dark:text-zinc-400">Subtotal Amount:</span>
          <span className="text-sm font-extrabold text-zinc-900 dark:text-white">₹{subtotal}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1: Patient Details */}
        <div className="rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white">
                1. Patient Details
              </h2>
              <p className="text-[11px] text-zinc-500">Name for diagnostic report</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
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
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  maxLength={10}
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
                    Street / Area / Sector
                  </label>
                  <input
                    type="text"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="e.g. 5th Main Road, Indiranagar"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-sky-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Landmark
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
                      Pincode
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="e.g. 560038"
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-sky-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City"
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-sky-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="State"
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-sky-600"
                    />
                  </div>
                </div>
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
          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-zinc-50 p-3 text-[11px] text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300 border border-zinc-100 dark:border-zinc-800">
            <Shield className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
            <span>
              <strong>Direct Laboratory Settlement:</strong> Your payment goes directly to the diagnostic lab. Gyrex Labs does not hold patient diagnostic fees.
            </span>
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
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-700 py-4 text-sm font-bold text-white shadow-md hover:bg-sky-600 active:scale-[0.99] transition disabled:opacity-60"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Confirming Booking with Lab…</span>
              </>
            ) : (
              <span>Confirm &amp; Place Booking (₹{subtotal})</span>
            )}
          </button>
          <p className="mt-2 text-center text-[11px] text-zinc-400">
            By booking, you agree to share order details with the laboratory for diagnostic processing.
          </p>
        </div>
      </form>
    </div>
  );
}
