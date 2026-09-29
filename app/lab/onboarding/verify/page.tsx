"use client";

import React, { useEffect, useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Mail,
} from "lucide-react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [debugUrl, setDebugUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No verification token was provided in the link.");
      setErrorCode("MISSING_TOKEN");
      return;
    }

    let isMounted = true;

    async function executeVerification() {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (!isMounted) return;

        if (!res.ok) {
          setStatus("error");
          setErrorMessage(data.error || "Failed to verify email address.");
          setErrorCode(data.code || "VERIFICATION_FAILED");
          return;
        }

        setStatus("success");
        // Automatically redirect after a short pleasant confirmation
        setTimeout(() => {
          router.push(data.redirectUrl || "/lab/onboarding/profile");
          router.refresh();
        }, 1500);
      } catch (err: unknown) {
        if (!isMounted) return;
        setStatus("error");
        setErrorMessage(
          err instanceof Error ? err.message : "A network error occurred while verifying."
        );
      }
    }

    executeVerification();

    return () => {
      isMounted = false;
    };
  }, [token, router]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;

    setResending(true);
    setResendSuccess(null);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to resend verification email.");
      }

      setResendSuccess("A new verification email has been dispatched. Please check your inbox.");
      if (data.debugVerificationUrl) {
        setDebugUrl(data.debugVerificationUrl);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to resend email.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/60 rounded-2xl border border-slate-200 sm:px-10 text-center">
      {/* 1. LOADING STATE */}
      {status === "loading" && (
        <div className="py-8 space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <RefreshCw className="h-7 w-7 animate-spin" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Verifying your email...</h3>
          <p className="text-sm text-slate-600 max-w-sm mx-auto">
            Please wait while we validate your activation token and set up your laboratory session.
          </p>
        </div>
      )}

      {/* 2. SUCCESS STATE */}
      {status === "success" && (
        <div className="py-8 space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">Email Verified!</h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Your laboratory account has been successfully verified. You are now signed in.
          </p>
          <div className="pt-4">
            <Link
              href="/lab/onboarding/profile"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
            >
              Continue to Setup
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* 3. ERROR / EXPIRED STATE */}
      {status === "error" && (
        <div className="py-6 space-y-5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
            {errorCode === "EXPIRED" ? (
              <AlertCircle className="h-8 w-8" />
            ) : (
              <XCircle className="h-8 w-8" />
            )}
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900">
              {errorCode === "EXPIRED"
                ? "Verification Link Expired"
                : errorCode === "ALREADY_USED"
                ? "Link Already Used"
                : "Verification Failed"}
            </h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              {errorMessage || "We could not verify your email with the provided token."}
            </p>
          </div>

          {resendSuccess && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">
              {resendSuccess}
            </div>
          )}

          {debugUrl && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 text-left">
              <span className="font-bold">Development Helper:</span>{" "}
              <a href={debugUrl} className="underline font-semibold break-all text-amber-950">
                Click to verify new token
              </a>
            </div>
          )}

          {errorCode === "ALREADY_USED" ? (
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition"
              >
                Sign In to Your Account
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                Request a new verification link
              </p>
              <form onSubmit={handleResend} className="flex gap-2 max-w-sm mx-auto">
                <input
                  type="email"
                  required
                  placeholder="Enter your registered email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="block w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="submit"
                  disabled={resending || !resendEmail.trim()}
                  className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${resending ? "animate-spin" : ""}`} />
                  Resend
                </button>
              </form>
            </div>
          )}

          <div className="pt-3">
            <Link
              href="/lab/onboarding/signup"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Back to Registration
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LabVerifyPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
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
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <Suspense
          fallback={
            <div className="bg-white py-12 px-6 shadow-xl rounded-2xl border border-slate-200 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-slate-600">Loading verification...</p>
            </div>
          }
        >
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
