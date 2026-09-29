"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  Shield,
  User,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

export default function LabSignupPage() {
  const [formData, setFormData] = useState({
    ownerName: "",
    labName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    termsAccepted: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success & Resend State
  const [isSuccess, setIsSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [debugUrl, setDebugUrl] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  // Cooldown countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validations
    if (!formData.ownerName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!formData.labName.trim()) {
      setError("Please enter your laboratory or clinic name.");
      return;
    }
    if (!formData.email.trim() || !formData.email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!formData.phone.trim() || formData.phone.replace(/\D/g, "").length < 10) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!formData.termsAccepted) {
      setError("You must agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerName: formData.ownerName.trim(),
          labName: formData.labName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          password: formData.password,
          termsAccepted: formData.termsAccepted,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create laboratory account.");
      }

      setRegisteredEmail(formData.email.trim());
      setIsSuccess(true);
      setResendCooldown(60);
      if (data.debugVerificationUrl) {
        setDebugUrl(data.debugVerificationUrl);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setResendMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registeredEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to resend verification email.");
      }

      setResendMessage("A fresh verification email has been sent.");
      setResendCooldown(60);
      if (data.debugVerificationUrl) {
        setDebugUrl(data.debugVerificationUrl);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resend email.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
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
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {isSuccess ? "Check your email" : "Register your Laboratory"}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {isSuccess
            ? "We sent a secure verification link to activate your workspace."
            : "Set up your verified digital diagnostic storefront in minutes."}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/60 rounded-2xl border border-slate-200 sm:px-10">
          {/* SUCCESS SCREEN */}
          {isSuccess ? (
            <div className="text-center py-4 space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Mail className="h-8 w-8" />
              </div>

              <div className="space-y-2">
                <p className="text-base text-slate-700">
                  We have sent an activation link to:
                </p>
                <p className="font-semibold text-slate-900 text-lg">
                  {registeredEmail}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 text-left text-sm text-slate-600 space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Click the link in the email to verify ownership.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>The link remains valid for 24 hours.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Once verified, you will proceed directly to your laboratory profile setup.</span>
                </div>
              </div>

              {resendMessage && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700 font-medium">
                  {resendMessage}
                </div>
              )}

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Dev mode helper */}
              {debugUrl && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 text-left">
                  <span className="font-bold">Development Mode:</span> If transactional emails are not configured, you can verify directly via this link:{" "}
                  <a
                    href={debugUrl}
                    className="font-semibold underline text-amber-900 hover:text-amber-950 break-all"
                  >
                    Click to Verify Instantly
                  </a>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || resending}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <RefreshCw className={`h-4 w-4 ${resending ? "animate-spin" : ""}`} />
                  {resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : resending
                    ? "Resending..."
                    : "Resend Email"}
                </button>

                <Link
                  href="/login"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            /* SIGNUP FORM */
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              {/* Owner Full Name */}
              <div>
                <label
                  htmlFor="ownerName"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Your Full Name
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
                    onChange={handleChange}
                    placeholder="e.g. Dr. Rajesh Sharma"
                    className="block w-full rounded-lg border border-slate-200 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Lab Name */}
              <div>
                <label
                  htmlFor="labName"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Laboratory / Diagnostic Centre Name
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <input
                    id="labName"
                    name="labName"
                    type="text"
                    required
                    value={formData.labName}
                    onChange={handleChange}
                    placeholder="e.g. Apex Diagnostics & Pathology"
                    className="block w-full rounded-lg border border-slate-200 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Email & Phone Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Email Address
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
                      onChange={handleChange}
                      placeholder="owner@lab.com"
                      className="block w-full rounded-lg border border-slate-200 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Mobile Phone
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
                      onChange={handleChange}
                      placeholder="9876543210"
                      className="block w-full rounded-lg border border-slate-200 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>
              </div>

              {/* Password & Confirm Password Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Min. 8 characters"
                      className="block w-full rounded-lg border border-slate-200 pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Re-enter password"
                      className="block w-full rounded-lg border border-slate-200 pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-start gap-2.5 pt-1">
                <input
                  id="termsAccepted"
                  name="termsAccepted"
                  type="checkbox"
                  checked={formData.termsAccepted}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="termsAccepted" className="text-xs text-slate-600 leading-relaxed">
                  I agree to the{" "}
                  <span className="text-slate-900 font-medium">Terms of Service</span>,{" "}
                  <span className="text-slate-900 font-medium">Privacy Policy</span>, and agree that our laboratory will maintain compliance with clinical diagnostic regulations.
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60 disabled:cursor-not-allowed transition-all mt-4"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Creating Laboratory Account...
                  </>
                ) : (
                  <>
                    Create Laboratory Account
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {/* Footer Links */}
              <div className="pt-4 text-center border-t border-slate-100">
                <p className="text-sm text-slate-600">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-medium text-blue-600 hover:text-blue-700 underline"
                  >
                    Sign In
                  </Link>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
