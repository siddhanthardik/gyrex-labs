"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Store,
} from "lucide-react";

interface ProfileFormData {
  labName: string;
  ownerName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  slug: string;
  description: string;
  logoUrl: string | null;
}

export default function LabOnboardingProfilePage() {
  const router = useRouter();

  // Initial loading state
  const [initialLoading, setInitialLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState<ProfileFormData>({
    labName: "",
    ownerName: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    slug: "",
    description: "",
    logoUrl: null,
  });

  // Logo upload state
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Slug availability state
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [suggestedSlug, setSuggestedSlug] = useState<string | null>(null);
  const originalSlugRef = useRef<string>("");

  // Submission state
  const [savingAction, setSavingAction] = useState<"continue" | "exit" | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Fetch current lab profile
  useEffect(() => {
    let isMounted = true;
    async function loadProfile() {
      try {
        const res = await fetch("/api/lab/profile");
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/login?callbackUrl=/lab/onboarding/profile");
            return;
          }
          throw new Error("Failed to load laboratory profile.");
        }

        const json = await res.json();
        if (json.data && isMounted) {
          const d = json.data;
          originalSlugRef.current = d.slug || "";
          setFormData({
            labName: d.name || "",
            ownerName: d.ownerName || "",
            email: d.email || "",
            phone: d.phone || "",
            addressLine1: d.addressLine1 || "",
            addressLine2: d.addressLine2 || "",
            city: d.city || "",
            state: d.state || "",
            postalCode: d.postalCode || "",
            slug: d.slug || "",
            description: d.description || "",
            logoUrl: d.logoUrl || null,
          });
          setSlugAvailable(true);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setErrorBanner(
            err instanceof Error ? err.message : "Could not load laboratory profile."
          );
        }
      } finally {
        if (isMounted) {
          setInitialLoading(false);
        }
      }
    }

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [router]);

  // Debounced slug check
  const checkSlugAvailability = useCallback(
    async (slugToCheck: string) => {
      if (!slugToCheck || slugToCheck.length < 3) {
        setSlugAvailable(null);
        setSlugError(null);
        setSuggestedSlug(null);
        return;
      }

      setSlugChecking(true);
      setSlugError(null);
      setSuggestedSlug(null);

      try {
        const res = await fetch(
          `/api/lab/profile/check-slug?slug=${encodeURIComponent(slugToCheck)}`
        );
        const data = await res.json();

        if (data.available) {
          setSlugAvailable(true);
          setSlugError(null);
          setSuggestedSlug(null);
        } else {
          setSlugAvailable(false);
          setSlugError(data.error || "This store URL is already taken.");
          if (data.suggestedSlug) {
            setSuggestedSlug(data.suggestedSlug);
          }
        }
      } catch {
        // Soft fail
      } finally {
        setSlugChecking(false);
      }
    },
    []
  );

  // Trigger slug check when slug changes
  useEffect(() => {
    if (!formData.slug || formData.slug === originalSlugRef.current) {
      setSlugAvailable(true);
      setSlugError(null);
      setSuggestedSlug(null);
      return;
    }

    const timer = setTimeout(() => {
      checkSlugAvailability(formData.slug);
    }, 450);

    return () => clearTimeout(timer);
  }, [formData.slug, checkSlugAvailability]);

  // Handle Input Changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name === "slug") {
      // Auto-format slug: lowercase, replace spaces with hyphens, remove invalid chars
      const sanitized = value
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-");

      setFormData((prev) => ({ ...prev, slug: sanitized }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Clear field-specific error
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
    if (errorBanner) setErrorBanner(null);
  };

  // Auto-generate slug from Lab Name if slug is empty or matches previous auto-slug
  const handleLabNameBlur = () => {
    if (!formData.slug && formData.labName.trim()) {
      const generated = formData.labName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      if (generated) {
        setFormData((prev) => ({ ...prev, slug: generated }));
      }
    }
  };

  // Logo file selection
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoError(null);

    // Client-side quick checks
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setLogoError("Please upload a PNG, JPG, or WebP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLogoError("Logo file must be smaller than 5 MB.");
      return;
    }

    setLogoUploading(true);

    try {
      const body = new FormData();
      body.append("file", file);

      const res = await fetch("/api/lab/profile/logo", {
        method: "POST",
        body,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload logo.");
      }

      setFormData((prev) => ({ ...prev, logoUrl: data.logoUrl }));
    } catch (err: unknown) {
      setLogoError(err instanceof Error ? err.message : "Error uploading logo.");
    } finally {
      setLogoUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Logo removal
  const handleRemoveLogo = async () => {
    if (!formData.logoUrl) return;

    setLogoUploading(true);
    setLogoError(null);

    try {
      const res = await fetch("/api/lab/profile/logo", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove logo.");
      }
      setFormData((prev) => ({ ...prev, logoUrl: null }));
    } catch (err: unknown) {
      setLogoError(err instanceof Error ? err.message : "Error removing logo.");
    } finally {
      setLogoUploading(false);
    }
  };

  // Client Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.labName.trim() || formData.labName.trim().length < 2) {
      errors.labName = "Laboratory name must be at least 2 characters long.";
    }

    if (!formData.ownerName.trim() || formData.ownerName.trim().length < 2) {
      errors.ownerName = "Owner name must be at least 2 characters long.";
    }

    if (!formData.email.trim() || !formData.email.includes("@")) {
      errors.email = "Please provide a valid business email.";
    }

    const phoneDigits = formData.phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      errors.phone = "Please enter a valid 10-digit phone number.";
    }

    if (!formData.addressLine1.trim() || formData.addressLine1.trim().length < 3) {
      errors.addressLine1 = "Address line 1 is required.";
    }

    if (!formData.city.trim() || formData.city.trim().length < 2) {
      errors.city = "City is required.";
    }

    if (!formData.state.trim() || formData.state.trim().length < 2) {
      errors.state = "State is required.";
    }

    const pinTrimmed = formData.postalCode.trim();
    if (!/^[1-9][0-9]{5}$/.test(pinTrimmed)) {
      errors.postalCode = "Enter a valid 6-digit PIN code (e.g. 110001).";
    }

    if (!formData.slug.trim() || formData.slug.trim().length < 3) {
      errors.slug = "Store URL must be at least 3 characters long.";
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(formData.slug.trim())) {
      errors.slug = "Store URL can only contain lowercase letters, numbers, and hyphens.";
    } else if (slugAvailable === false) {
      errors.slug = "This store URL is already taken. Please pick another.";
    }

    if (formData.description && formData.description.length > 300) {
      errors.description = "Short description cannot exceed 300 characters.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Handler (Save & Continue OR Save & Exit)
  const handleSave = async (action: "continue" | "exit") => {
    setErrorBanner(null);

    if (!validateForm()) {
      setErrorBanner("Please review the highlighted fields before proceeding.");
      return;
    }

    setSavingAction(action);

    try {
      const res = await fetch("/api/lab/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labName: formData.labName.trim(),
          ownerName: formData.ownerName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          addressLine1: formData.addressLine1.trim(),
          addressLine2: formData.addressLine2?.trim() || "",
          city: formData.city.trim(),
          state: formData.state.trim(),
          postalCode: formData.postalCode.trim(),
          slug: formData.slug.trim(),
          description: formData.description.trim(),
          logoUrl: formData.logoUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && data.suggestedSlug) {
          setSuggestedSlug(data.suggestedSlug);
          setSlugAvailable(false);
          setFieldErrors((prev) => ({ ...prev, slug: data.error }));
        }
        throw new Error(data.error || "Failed to save laboratory profile.");
      }

      // Success routing
      if (action === "continue") {
        router.push("/lab/onboarding/catalogue");
      } else {
        router.push("/lab/dashboard");
      }
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof Error ? err.message : "An unexpected error occurred while saving."
      );
    } finally {
      setSavingAction(null);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-sm text-slate-600 font-medium">
            Loading laboratory profile...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 text-slate-900">
      {/* ── 1. Header & Progress Stepper ─────────────────────────────── */}
      <div className="mx-auto max-w-6xl text-center mb-10">
        <Link href="/" className="inline-block">
          <Image
            src="/branding/gyrex-labs.svg"
            alt="Gyrex Labs"
            width={160}
            height={48}
            priority
            className="h-9 w-auto mx-auto"
          />
        </Link>
        <h1 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Set up your laboratory
        </h1>
        <p className="mt-2 text-sm text-slate-600 max-w-xl mx-auto">
          Let&apos;s create your digital laboratory profile. You can update these details anytime.
        </p>

        {/* 5-Step Progress Stepper (Only Step 1 Active, Steps 2-5 Locked) */}
        <div className="mt-8 flex items-center justify-center">
          <div className="flex w-full max-w-2xl items-center justify-between">
            {/* Step 1: Active */}
            <div className="flex flex-col items-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-sm shadow-sm ring-4 ring-blue-100">
                1
              </div>
              <span className="mt-2 text-xs font-bold text-blue-700">1. Profile</span>
            </div>
            <div className="h-0.5 flex-1 bg-slate-200 mx-2" />

            {/* Step 2: Locked */}
            <div className="flex flex-col items-center opacity-40">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-slate-300 bg-white font-medium text-sm text-slate-500">
                2
              </div>
              <span className="mt-2 text-xs text-slate-500">2. Catalogue</span>
            </div>
            <div className="h-0.5 flex-1 bg-slate-200 mx-2" />

            {/* Step 3: Locked */}
            <div className="flex flex-col items-center opacity-40">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-slate-300 bg-white font-medium text-sm text-slate-500">
                3
              </div>
              <span className="mt-2 text-xs text-slate-500">3. Packages</span>
            </div>
            <div className="h-0.5 flex-1 bg-slate-200 mx-2" />

            {/* Step 4: Locked */}
            <div className="flex flex-col items-center opacity-40">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-slate-300 bg-white font-medium text-sm text-slate-500">
                4
              </div>
              <span className="mt-2 text-xs text-slate-500">4. Payments</span>
            </div>
            <div className="h-0.5 flex-1 bg-slate-200 mx-2" />

            {/* Step 5: Locked */}
            <div className="flex flex-col items-center opacity-40">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-slate-300 bg-white font-medium text-sm text-slate-500">
                5
              </div>
              <span className="mt-2 text-xs text-slate-500">5. Launch</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Two-Column Workspace Layout ───────────────────────────── */}
      <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Profile Form (lg:col-span-7) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-8">
          {errorBanner && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-2.5"
            >
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <span>{errorBanner}</span>
            </div>
          )}

          {/* Section 1: Laboratory Identity */}
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                Laboratory Identity
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                The primary legal and trading details of your diagnostic centre.
              </p>
            </div>

            <div>
              <label
                htmlFor="labName"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Laboratory Name <span className="text-red-500">*</span>
              </label>
              <input
                id="labName"
                name="labName"
                type="text"
                required
                value={formData.labName}
                onChange={handleInputChange}
                onBlur={handleLabNameBlur}
                placeholder="e.g. Sharma Diagnostics & Path Lab"
                className={`block w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 ${
                  fieldErrors.labName
                    ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                    : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                }`}
              />
              {fieldErrors.labName && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.labName}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="ownerName"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Owner / Medical Director <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    id="ownerName"
                    name="ownerName"
                    type="text"
                    required
                    value={formData.ownerName}
                    onChange={handleInputChange}
                    placeholder="e.g. Dr. Rajesh Sharma"
                    className={`block w-full rounded-lg border pl-9 pr-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 ${
                      fieldErrors.ownerName
                        ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                        : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                    }`}
                  />
                </div>
                {fieldErrors.ownerName && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.ownerName}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Business Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="contact@sharmadiagnostics.in"
                    className={`block w-full rounded-lg border pl-9 pr-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 ${
                      fieldErrors.email
                        ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                        : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                    }`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Official Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Phone className="h-4 w-4" />
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="9876543210"
                  className={`block w-full rounded-lg border pl-9 pr-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 ${
                    fieldErrors.phone
                      ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                      : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                  }`}
                />
              </div>
              {fieldErrors.phone && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>
              )}
            </div>
          </div>

          {/* Section 2: Laboratory Logo */}
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Store className="h-4 w-4 text-blue-600" />
                Laboratory Logo
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Displayed on your digital storefront header, test reports, and receipts.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5">
              {/* Logo Preview Container */}
              <div className="h-24 w-24 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 relative shadow-sm">
                {formData.logoUrl ? (
                  <img
                    src={formData.logoUrl}
                    alt="Uploaded Logo"
                    className="h-full w-full object-contain p-1.5"
                  />
                ) : (
                  <div className="text-center p-2 text-slate-400">
                    <Building2 className="h-8 w-8 mx-auto stroke-[1.5]" />
                    <span className="text-[10px] block mt-1">No Logo</span>
                  </div>
                )}
                {logoUploading && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                    <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-2 text-center sm:text-left">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleLogoFileChange}
                  className="hidden"
                />

                <div className="flex flex-wrap items-center gap-2.5 justify-center sm:justify-start">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={logoUploading}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-sm disabled:opacity-60"
                  >
                    <Upload className="h-3.5 w-3.5 text-blue-600" />
                    {formData.logoUrl ? "Replace Logo" : "Upload Logo"}
                  </button>

                  {formData.logoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      disabled={logoUploading}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 bg-white text-xs font-semibold text-red-600 hover:bg-red-50 transition shadow-sm disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-500">
                  Recommended: Square or horizontal PNG, JPG, or WebP. Max 5 MB.
                </p>

                {logoError && (
                  <p className="text-xs text-red-600 font-medium">{logoError}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Physical Address */}
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                Physical Address
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Helps local patients locate your collection centre and establishes geographical trust.
              </p>
            </div>

            <div>
              <label
                htmlFor="addressLine1"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Address Line 1 <span className="text-red-500">*</span>
              </label>
              <input
                id="addressLine1"
                name="addressLine1"
                type="text"
                required
                value={formData.addressLine1}
                onChange={handleInputChange}
                placeholder="e.g. Shop 4, Ground Floor, Central Market"
                className={`block w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 ${
                  fieldErrors.addressLine1
                    ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                    : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                }`}
              />
              {fieldErrors.addressLine1 && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.addressLine1}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="addressLine2"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Address Line 2 <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                id="addressLine2"
                name="addressLine2"
                type="text"
                value={formData.addressLine2}
                onChange={handleInputChange}
                placeholder="e.g. Opposite Metro Pillar 142, Sector 14"
                className="block w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="city"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  required
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="e.g. New Delhi"
                  className={`block w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 ${
                    fieldErrors.city
                      ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                      : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                  }`}
                />
                {fieldErrors.city && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.city}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="state"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  State <span className="text-red-500">*</span>
                </label>
                <input
                  id="state"
                  name="state"
                  type="text"
                  required
                  value={formData.state}
                  onChange={handleInputChange}
                  placeholder="e.g. Delhi"
                  className={`block w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 ${
                    fieldErrors.state
                      ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                      : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                  }`}
                />
                {fieldErrors.state && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.state}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="postalCode"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  PIN Code <span className="text-red-500">*</span>
                </label>
                <input
                  id="postalCode"
                  name="postalCode"
                  type="text"
                  maxLength={6}
                  required
                  value={formData.postalCode}
                  onChange={handleInputChange}
                  placeholder="110001"
                  className={`block w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 ${
                    fieldErrors.postalCode
                      ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                      : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                  }`}
                />
                {fieldErrors.postalCode && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.postalCode}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Public Store Information */}
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-600" />
                Public Store Information
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Your unique web address and summary text shown to patients online.
              </p>
            </div>

            <div>
              <label
                htmlFor="slug"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Store URL / Slug <span className="text-red-500">*</span>
              </label>

              <div className="flex rounded-lg border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-500">
                <span className="inline-flex items-center px-3.5 bg-slate-50 text-slate-500 text-sm border-r border-slate-200 select-none">
                  labs.gyrex.in/
                </span>
                <input
                  id="slug"
                  name="slug"
                  type="text"
                  required
                  value={formData.slug}
                  onChange={handleInputChange}
                  placeholder="sharma-diagnostics"
                  className="block w-full px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                />
                <div className="flex items-center pr-3">
                  {slugChecking && (
                    <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />
                  )}
                  {!slugChecking && slugAvailable === true && formData.slug && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  )}
                  {!slugChecking && slugAvailable === false && (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
              </div>

              {slugError && (
                <div className="mt-1.5 text-xs text-red-600 space-y-1">
                  <p>{slugError}</p>
                  {suggestedSlug && (
                    <p className="text-slate-600">
                      Suggested alternative:{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, slug: suggestedSlug }));
                        }}
                        className="font-semibold text-blue-600 underline hover:text-blue-700"
                      >
                        {suggestedSlug}
                      </button>
                    </p>
                  )}
                </div>
              )}

              {fieldErrors.slug && !slugError && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.slug}</p>
              )}

              <p className="mt-1.5 text-xs text-slate-500">
                Lowercase letters, numbers, and hyphens only. No spaces.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-slate-700"
                >
                  Short Description
                </label>
                <span className="text-xs text-slate-400">
                  {formData.description.length}/300
                </span>
              </div>
              <textarea
                id="description"
                name="description"
                rows={3}
                maxLength={300}
                value={formData.description}
                onChange={handleInputChange}
                placeholder="e.g. NABL Accredited diagnostic testing with certified path lab reports and prompt morning home collection."
                className="block w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 leading-relaxed"
              />
              {fieldErrors.description && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.description}</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3.5">
            <button
              type="button"
              onClick={() => handleSave("exit")}
              disabled={savingAction !== null}
              className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-60"
            >
              {savingAction === "exit" ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Saving & Exiting...
                </>
              ) : (
                "Save & Exit"
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSave("continue")}
              disabled={savingAction !== null}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-60"
            >
              {savingAction === "continue" ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Saving Profile...
                </>
              ) : (
                <>
                  Save & Continue
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Store Preview Panel (lg:col-span-5) */}
        <div className="lg:col-span-5 sticky top-8 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Store className="h-4 w-4 text-blue-600" />
                Your digital store
              </h3>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200/60">
                Live Preview
              </span>
            </div>

            {/* Simulated Mobile / Storefront Header Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
              <div className="flex items-start gap-3.5">
                {/* Logo / Avatar Preview */}
                <div className="h-14 w-14 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                  {formData.logoUrl ? (
                    <img
                      src={formData.logoUrl}
                      alt="Store Logo"
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <span className="text-xl font-bold text-blue-700">
                      {formData.labName?.trim() ? formData.labName.charAt(0).toUpperCase() : "G"}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-slate-900 text-sm truncate">
                      {formData.labName?.trim() || "Your Laboratory Name"}
                    </h4>
                    <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                  </div>

                  <p className="text-xs text-slate-500 mt-0.5 truncate flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                    {[formData.city, formData.state, formData.postalCode]
                      .filter(Boolean)
                      .join(", ") || "City, State"}
                  </p>
                </div>
              </div>

              {/* Description Snippet */}
              <p className="text-xs text-slate-600 leading-relaxed bg-white rounded-lg p-2.5 border border-slate-200/80">
                {formData.description?.trim() ||
                  "NABL Accredited accuracy with complimentary home sample collection across West Delhi."}
              </p>

              {/* Public URL badge */}
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                <span className="text-slate-500">Store URL:</span>
                <span className="font-mono font-medium text-blue-700 truncate max-w-[200px]">
                  labs.gyrex.in/{formData.slug || "your-slug"}
                </span>
              </div>
            </div>

            {/* Helpful Setup Guidelines */}
            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 text-xs text-slate-600 space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Search Friendly:</strong> Your laboratory will be discoverable at your chosen web address.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Patient Confidence:</strong> Verified address and credentials reassure patients during booking.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
