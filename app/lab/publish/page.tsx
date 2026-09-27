"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LabPublishChecklistPage() {
  const router = useRouter();
  const [readiness, setReadiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchReadiness = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lab/publish");
      if (res.ok) {
        const d = await res.json();
        setReadiness(d);
      }
    } catch (err) {
      console.error("Failed to load readiness:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadiness();
  }, []);

  const handlePublish = async () => {
    setPublishing(true);
    setNotification(null);

    try {
      const res = await fetch("/api/lab/publish", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to publish digital store.");
      }

      setNotification({ type: "success", message: data.message });
      fetchReadiness();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Failed to publish." });
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 text-zinc-400">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
        <span className="ml-3 text-sm">Validating store readiness...</span>
      </div>
    );
  }

  const checklist = readiness?.checklist;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Store Publishing Readiness</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Ensure all essential diagnostic and payment requirements are satisfied before making your store publicly bookable.
        </p>
      </div>

      {notification && (
        <div
          className={`rounded-xl p-4 text-xs font-medium border ${
            notification.type === "error"
              ? "bg-rose-500/10 border-rose-500/25 text-rose-400"
              : "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Current Status Card */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 flex items-center justify-between backdrop-blur-sm">
        <div>
          <span className="text-xs text-zinc-400">Current Digital Store Status:</span>
          <h2 className="text-xl font-extrabold text-white mt-0.5">{readiness?.status}</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Verification: {readiness?.isVerified ? "Verified by Platform ✓" : "Pending Verification"}
          </p>
        </div>

        {readiness?.status === "ACTIVE" ? (
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20">
            Live & Bookable ✓
          </span>
        ) : readiness?.status === "SUSPENDED" ? (
          <span className="rounded-full bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-400 border border-rose-500/20">
            Store Suspended
          </span>
        ) : (
          <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400 border border-amber-500/20">
            Setup in Progress
          </span>
        )}
      </div>

      {/* Checklist Items */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
        <h3 className="text-sm font-bold text-white">Pre-Launch Quality & Security Checklist</h3>

        <div className="divide-y divide-zinc-800/80">
          {/* Item 1: Lab Details */}
          <div className="py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  checklist?.labDetailsComplete
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {checklist?.labDetailsComplete ? "✓" : "!"}
              </span>
              <div>
                <p className="text-xs font-semibold text-white">Laboratory Information Complete</p>
                <p className="text-[11px] text-zinc-400">Name, official email, phone, and complete physical address</p>
              </div>
            </div>
            {!checklist?.labDetailsComplete && (
              <Link href="/lab/settings" className="text-xs text-sky-400 hover:underline">
                Complete Now →
              </Link>
            )}
          </div>

          {/* Item 2: Catalogue Tests */}
          <div className="py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  checklist?.testsConfigured
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {checklist?.testsConfigured ? "✓" : "!"}
              </span>
              <div>
                <p className="text-xs font-semibold text-white">Diagnostic Tests Configured</p>
                <p className="text-[11px] text-zinc-400">
                  {checklist?.activeTestsCount} active tests configured with selling prices
                </p>
              </div>
            </div>
            {!checklist?.testsConfigured && (
              <Link href="/lab/catalogue/test-master" className="text-xs text-sky-400 hover:underline">
                Add Tests →
              </Link>
            )}
          </div>

          {/* Item 3: Packages (Optional/Recommended) */}
          <div className="py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  checklist?.packagesConfigured
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {checklist?.packagesConfigured ? "✓" : "—"}
              </span>
              <div>
                <p className="text-xs font-semibold text-white">Health Packages (Recommended)</p>
                <p className="text-[11px] text-zinc-400">
                  {checklist?.activePackagesCount} active bundled packages
                </p>
              </div>
            </div>
            {!checklist?.packagesConfigured && (
              <Link href="/lab/packages/new" className="text-xs text-zinc-400 hover:text-white">
                Create Package →
              </Link>
            )}
          </div>

          {/* Item 4: Payment Setting */}
          <div className="py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  checklist?.paymentConfigured
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {checklist?.paymentConfigured ? "✓" : "!"}
              </span>
              <div>
                <p className="text-xs font-semibold text-white">Patient Payment Method Configured</p>
                <p className="text-[11px] text-zinc-400">
                  Pay at collection enabled or Razorpay gateway connected
                </p>
              </div>
            </div>
            {!checklist?.paymentConfigured && (
              <Link href="/lab/payment-settings" className="text-xs text-sky-400 hover:underline">
                Configure →
              </Link>
            )}
          </div>

          {/* Item 5: Store Presentation */}
          <div className="py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  checklist?.storeSettingsConfigured
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {checklist?.storeSettingsConfigured ? "✓" : "!"}
              </span>
              <div>
                <p className="text-xs font-semibold text-white">Storefront Display Settings</p>
                <p className="text-[11px] text-zinc-400">Hero banners and home collection fees</p>
              </div>
            </div>
            <Link href="/lab/settings" className="text-xs text-zinc-400 hover:text-white">
              Edit Settings →
            </Link>
          </div>
        </div>

        {/* Action Gate */}
        <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
          <div>
            {readiness?.isReadyToPublish ? (
              <span className="text-xs font-semibold text-emerald-400">
                ✓ All mandatory requirements satisfied!
              </span>
            ) : (
              <span className="text-xs text-amber-400 font-medium">
                Complete all mandatory checklist items marked with (!) to publish.
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={!readiness?.isReadyToPublish || publishing || checklist?.isSuspended}
            onClick={handlePublish}
            className="rounded-lg bg-sky-500 px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-sky-500/20 hover:bg-sky-400 transition disabled:opacity-40"
          >
            {publishing ? "Publishing Store..." : "🚀 Publish Digital Store"}
          </button>
        </div>
      </div>
    </div>
  );
}
