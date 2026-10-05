"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Globe,
  CheckCircle2,
  AlertCircle,
  Building2,
  FlaskConical,
  Package,
  CreditCard,
  Store,
  ArrowRight,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

export default function LabPublishChecklistPage() {
  const router = useRouter();
  const [readiness, setReadiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

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
      <div className="flex flex-col items-center justify-center p-24 text-slate-500">
        <RefreshCw className="h-6 w-6 animate-spin text-sky-500" />
        <span className="mt-3 text-sm">Validating store readiness...</span>
      </div>
    );
  }

  const checklist = readiness?.checklist;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Store Publishing Readiness
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Ensure all essential diagnostic and payment requirements are satisfied before making your store publicly bookable.
        </p>
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

      {/* Current Status Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-medium text-slate-500">Current Digital Store Status:</span>
          <h2 className="text-xl font-bold text-slate-900 mt-0.5">{readiness?.status}</h2>
          <p className="text-xs text-slate-500 mt-1">
            Verification: {readiness?.isVerified ? "Verified by Platform ✓" : "Pending Verification"}
          </p>
        </div>

        <div>
          {readiness?.status === "ACTIVE" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Live & Bookable</span>
            </span>
          ) : readiness?.status === "SUSPENDED" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 border border-rose-200">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Store Suspended</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Setup in Progress</span>
            </span>
          )}
        </div>
      </div>

      {/* Checklist Items */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-xs">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-semibold text-slate-900">
            Pre-Launch Quality & Security Checklist
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Click each item to configure the specific setting section.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {/* Item 1: Lab Details -> /lab/settings?section=profile */}
          <div className="py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                  checklist?.labDetailsComplete
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-500 border border-slate-200"
                }`}
              >
                {checklist?.labDetailsComplete ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Building2 className="h-4 w-4 text-slate-400" />
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  Laboratory Profile Information
                </p>
                <p className="text-[11px] text-slate-500">
                  Name, official email, phone, and complete physical address
                </p>
              </div>
            </div>

            <Link
              href="/lab/settings?section=profile"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition shrink-0"
            >
              <span>{checklist?.labDetailsComplete ? "View Profile" : "Complete Profile"}</span>
              <ArrowRight className="h-3 w-3 text-slate-400" />
            </Link>
          </div>

          {/* Item 2: Catalogue Tests -> /lab/catalogue */}
          <div className="py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                  checklist?.testsConfigured
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-500 border border-slate-200"
                }`}
              >
                {checklist?.testsConfigured ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <FlaskConical className="h-4 w-4 text-slate-400" />
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  Diagnostic Tests Configured
                </p>
                <p className="text-[11px] text-slate-500">
                  {checklist?.activeTestsCount} active tests configured with selling prices
                </p>
              </div>
            </div>

            <Link
              href="/lab/catalogue"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition shrink-0"
            >
              <span>{checklist?.testsConfigured ? "Manage Tests" : "Add Tests"}</span>
              <ArrowRight className="h-3 w-3 text-slate-400" />
            </Link>
          </div>

          {/* Item 3: Packages -> /lab/packages */}
          <div className="py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                  checklist?.packagesConfigured
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-500 border border-slate-200"
                }`}
              >
                {checklist?.packagesConfigured ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Package className="h-4 w-4 text-slate-400" />
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  Health Packages (Recommended)
                </p>
                <p className="text-[11px] text-slate-500">
                  {checklist?.activePackagesCount} active bundled health packages
                </p>
              </div>
            </div>

            <Link
              href={checklist?.packagesConfigured ? "/lab/packages" : "/lab/packages/new"}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition shrink-0"
            >
              <span>{checklist?.packagesConfigured ? "Manage Packages" : "Create Package"}</span>
              <ArrowRight className="h-3 w-3 text-slate-400" />
            </Link>
          </div>

          {/* Item 4: Payment Setting -> /lab/payment-settings */}
          <div className="py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                  checklist?.paymentConfigured
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-500 border border-slate-200"
                }`}
              >
                {checklist?.paymentConfigured ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <CreditCard className="h-4 w-4 text-slate-400" />
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  Patient Payment Methods
                </p>
                <p className="text-[11px] text-slate-500">
                  Pay at collection enabled, direct lab UPI / VPA, or Razorpay online gateway
                </p>
              </div>
            </div>

            <Link
              href="/lab/payment-settings"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition shrink-0"
            >
              <span>{checklist?.paymentConfigured ? "Payment Settings" : "Configure Payments"}</span>
              <ArrowRight className="h-3 w-3 text-slate-400" />
            </Link>
          </div>

          {/* Item 5: Storefront Display Settings -> /lab/settings?section=storefront */}
          <div className="py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                  checklist?.storeSettingsConfigured
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-500 border border-slate-200"
                }`}
              >
                {checklist?.storeSettingsConfigured ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Store className="h-4 w-4 text-slate-400" />
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  Storefront Display Settings
                </p>
                <p className="text-[11px] text-slate-500">
                  Hero headlines, subheadlines, turnaround promise, and home sample collection fees
                </p>
              </div>
            </div>

            <Link
              href="/lab/settings?section=storefront"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition shrink-0"
            >
              <span>Configure Storefront</span>
              <ArrowRight className="h-3 w-3 text-slate-400" />
            </Link>
          </div>
        </div>

        {/* Action Gate */}
        <div className="mt-6 pt-5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            {readiness?.isReadyToPublish ? (
              <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>All mandatory requirements satisfied and verified!</span>
              </span>
            ) : (
              <span className="text-xs text-amber-700 font-medium flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Complete all mandatory checklist items to publish your store.</span>
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={!readiness?.isReadyToPublish || publishing || checklist?.isSuspended}
            onClick={handlePublish}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-500 px-6 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-sky-600 transition disabled:opacity-40 cursor-pointer"
          >
            {publishing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Publishing Store...</span>
              </>
            ) : (
              <>
                <Globe className="h-4 w-4" />
                <span>Publish Digital Store</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
