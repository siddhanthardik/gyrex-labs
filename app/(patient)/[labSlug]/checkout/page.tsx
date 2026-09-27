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
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";

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
  const { items, collectionType, subtotal, clearCart, labSlug: cartLabSlug, isHydrated } = useCart();
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
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [isOrderSubmitted, setIsOrderSubmitted] = useState(false);
  const [submittedSummary, setSubmittedSummary] = useState<{
    items: typeof items;
    subtotal: number;
  } | null>(null);

  const displayItems = submittedSummary ? submittedSummary.items : items;
  const displaySubtotal = submittedSummary ? submittedSummary.subtotal : subtotal;

  // Get labId from the lab data — we need to fetch it
  // We'll do this via a hidden input set by the layout, but for now use a server-data prop approach
  // For the checkout page to know the labId, it needs to call the API
  // We use a local fetch on mount or rely on the cart and route params

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
      // First, resolve labId from the slug
      const labRes = await fetch(`/api/labs/${labSlug}/info`);
      if (!labRes.ok) {
        throw new Error("Unable to verify laboratory. Please refresh and try again.");
      }
      const labData = await labRes.json();
      const resolvedLabId = labData.id;
      void labData.name; // resolved but used for order redirect only

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
      setSubmittedSummary({ items, subtotal });
      clearCart();
      router.push(`/${labSlug}/booking/${data.orderNumber}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setIsOrderSubmitted(false);
      setSubmittedSummary(null);
    } finally {
      if (!submissionSucceeded) {
        setLoading(false);
      }
    }
  };

  if (!isHydrated) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <div className="mx-auto h-8 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mx-auto mt-6 h-64 max-w-md animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      </div>
    );
  }

  if (items.length === 0 && !isOrderSubmitted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Cart is Empty</h2>
        <a
          href={`/${labSlug}/tests`}
          className="mt-4 inline-block text-sm font-semibold text-sky-600 hover:underline dark:text-sky-400"
        >
          Browse Tests →
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <h2 className="mb-6 text-xl font-bold text-zinc-900 dark:text-zinc-100">
        Complete Your Booking
      </h2>

      {/* Order Summary (collapsible) */}
      <div className="mb-5 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <button
          type="button"
          onClick={() => setShowOrderDetails((s) => !s)}
          className="flex w-full items-center justify-between px-5 py-4"
        >
          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Order Summary — {displayItems.length} {displayItems.length === 1 ? "item" : "items"} (₹{displaySubtotal})
          </span>
          {showOrderDetails ? (
            <ChevronUp className="h-4 w-4 text-zinc-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          )}
        </button>
        {showOrderDetails && (
          <div className="divide-y divide-zinc-100 border-t border-zinc-100 px-5 dark:divide-zinc-800 dark:border-zinc-800">
            {displayItems.map((item) => (
              <div key={item.id} className="flex justify-between py-3 text-sm">
                <span className="text-zinc-700 dark:text-zinc-300">{item.name}</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  ₹{item.price}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Patient Details */}
        <fieldset className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <legend className="flex items-center gap-2 px-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
            <User className="h-4 w-4 text-sky-600" /> Patient Details
          </legend>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Full Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                Patient Full Name *
              </label>
              <input
                type="text"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Enter patient's full name"
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-sky-600"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                <Phone className="h-3 w-3" /> Mobile Number *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-sky-600"
              />
            </div>

            {/* Email */}
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                <Mail className="h-3 w-3" /> Email (optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="patient@email.com"
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-sky-600"
              />
            </div>

            {/* Age */}
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                <Calendar className="h-3 w-3" /> Age (years)
              </label>
              <input
                type="number"
                min="1"
                max="130"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 35"
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-sky-600"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                Gender *
              </label>
              <select
                required
                value={gender}
                onChange={(e) => setGender(e.target.value as "MALE" | "FEMALE" | "OTHER")}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-sky-600"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
        </fieldset>

        {/* Collection Details */}
        <fieldset className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <legend className="flex items-center gap-2 px-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
            {collectionType === "HOME_COLLECTION" ? (
              <>
                <Home className="h-4 w-4 text-sky-600" /> Home Collection Details
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 text-sky-600" /> Lab Visit Details
              </>
            )}
          </legend>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Scheduled Date */}
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                <Calendar className="h-3 w-3" /> Collection Date *
              </label>
              <input
                type="date"
                required
                min={today}
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-sky-600"
              />
            </div>

            {/* Time Slot */}
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                <Clock className="h-3 w-3" /> Preferred Time Slot *
              </label>
              <select
                required
                value={scheduledSlot}
                onChange={(e) => setScheduledSlot(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-sky-600"
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>

            {/* Address (only for home collection) */}
            {collectionType === "HOME_COLLECTION" && (
              <>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    Address Line 1 *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="House / Flat / Building No."
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-sky-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="Street, Society, Area"
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-sky-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    Landmark
                  </label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="Near landmark"
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-sky-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="e.g. 400001"
                    maxLength={6}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-sky-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-sky-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    State
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="State"
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-sky-600"
                  />
                </div>
              </>
            )}
          </div>
        </fieldset>

        {/* Payment Method */}
        <fieldset className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <legend className="flex items-center gap-2 px-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
            <CreditCard className="h-4 w-4 text-sky-600" /> Payment Method
          </legend>

          <div className="mt-4 space-y-3">
            <label
              className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3.5 transition ${
                paymentMethod === "CASH_ON_COLLECTION"
                  ? "border-sky-600 bg-sky-50 dark:border-sky-500 dark:bg-sky-950/30"
                  : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700"
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="CASH_ON_COLLECTION"
                checked={paymentMethod === "CASH_ON_COLLECTION"}
                onChange={() => setPaymentMethod("CASH_ON_COLLECTION")}
                className="h-4 w-4 text-sky-600"
              />
              <Banknote className="h-4 w-4 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Cash on Collection
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Pay directly at the time of sample collection
                </p>
              </div>
            </label>

            <label
              className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3.5 transition ${
                paymentMethod === "RAZORPAY"
                  ? "border-sky-600 bg-sky-50 dark:border-sky-500 dark:bg-sky-950/30"
                  : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700"
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="RAZORPAY"
                checked={paymentMethod === "RAZORPAY"}
                onChange={() => setPaymentMethod("RAZORPAY")}
                className="h-4 w-4 text-sky-600"
              />
              <CreditCard className="h-4 w-4 text-sky-600" />
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Online Payment (UPI / Card / Net Banking)
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Pay securely via Razorpay
                </p>
              </div>
            </label>
          </div>

          {/* Payment merchant trust notice */}
          <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50/60 p-3.5 dark:border-sky-900/40 dark:bg-sky-950/20">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 flex-shrink-0 text-sky-600 dark:text-sky-400" />
              <p className="text-xs text-sky-800 dark:text-sky-200">
                <strong>
                  Your payment goes directly to the laboratory.
                </strong>{" "}
                Gyrex Labs is only a booking platform. Your diagnostic payment is made directly to
                the laboratory, never to Gyrex Labs.
              </p>
            </div>
          </div>
        </fieldset>

        {/* Error display */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800/50 dark:bg-red-950/30">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-6 py-4 text-sm font-bold text-white shadow-md hover:bg-sky-500 transition disabled:opacity-60"
        >
          {loading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
              <span>Confirming your booking…</span>
            </>
          ) : (
            <span>Confirm Booking</span>
          )}
        </button>

        <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
          By proceeding, you agree to share your details with the diagnostic laboratory for the
          purpose of this booking. Reports will be shared by the laboratory directly.
        </p>
      </form>
    </div>
  );
}
