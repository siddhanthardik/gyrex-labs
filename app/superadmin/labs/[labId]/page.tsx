"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SuperadminStatusBadge } from "@/components/superadmin/SuperadminStatusBadge";
import { ConfirmationModal } from "@/components/superadmin/ConfirmationModal";
import { LabStatus } from "@prisma/client";
import { Ban, RefreshCw, ExternalLink } from "lucide-react";

interface LabDetailData {
  lab: {
    id: string;
    name: string;
    slug: string;
    legalName: string | null;
    code: string;
    email: string;
    phone: string;
    emergencyPhone: string | null;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    gstin: string | null;
    pan: string | null;
    licenseNumber: string | null;
    nablAccreditationNumber: string | null;
    status: LabStatus;
    isVerified: boolean;
    verifiedAt: string | null;
    createdAt: string;
  };
  storeSettings: {
    heroHeadline: string;
    homeCollectionAvailable: boolean;
    homeCollectionFee: number;
    deliveryPromiseNotice: string | null;
  } | null;
  paymentSettings: {
    isConfigured: boolean;
    cashOnCollectionEnabled: boolean;
    hasRazorpayKey: boolean;
    upiDirectQrUrl: string | null;
    lastVerifiedAt: string | null;
  } | null;
  subscription: {
    id: string;
    planName: string;
    priceMonthly: number;
    status: string;
    billingCycle: string;
    currentPeriodEnd: string;
  } | null;
  staff: Array<{
    id: string;
    userId: string;
    fullName: string;
    email: string;
    role: string;
    isActive: boolean;
  }>;
  counts: {
    tests: number;
    packages: number;
    orders: number;
    patients: number;
    reports: number;
  };
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    patientName: string;
    totalAmount: number;
    status: string;
    createdAt: string;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    entityType: string;
    actorName: string;
    createdAt: string;
    metadata: Record<string, unknown> | null;
  }>;
}

export default function SuperadminLabDetailPage({
  params,
}: {
  params: Promise<{ labId: string }>;
}) {
  const { labId } = use(params);
  const router = useRouter();

  const [data, setData] = useState<LabDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyApprove, setVerifyApprove] = useState(true);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendAction, setSuspendAction] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchLab = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/superadmin/labs/${labId}`);
      if (!res.ok) {
        throw new Error("Laboratory not found or access denied.");
      }
      const json = await res.json();
      setData(json);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "Failed to load laboratory details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLab();
  }, [labId]);

  const handleVerify = async (reason: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/superadmin/labs/${labId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approve: verifyApprove, reason }),
      });
      if (!res.ok) throw new Error("Failed to process verification.");
      setShowVerifyModal(false);
      fetchLab();
      router.refresh();
    } catch (err: unknown) {
      const e = err as Error;
      alert(e.message || "Verification action failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuspend = async (reason: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/superadmin/labs/${labId}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspend: suspendAction, reason }),
      });
      if (!res.ok) throw new Error("Failed to update suspension status.");
      setShowSuspendModal(false);
      fetchLab();
      router.refresh();
    } catch (err: unknown) {
      const e = err as Error;
      alert(e.message || "Suspension action failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-zinc-500">
        Loading laboratory profile & compliance records...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-rose-800 bg-rose-950/40 p-6 text-center text-rose-300">
        {error || "Laboratory not found."}
      </div>
    );
  }

  const { lab, storeSettings, paymentSettings, subscription, staff, counts, recentOrders, auditLogs } = data;

  return (
    <div className="space-y-8">
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Link href="/superadmin/labs" className="hover:text-white transition">
              ← Laboratories
            </Link>
            <span>/</span>
            <span className="font-mono text-zinc-300">{lab.code}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <span>{lab.name}</span>
            <SuperadminStatusBadge status={lab.status} />
          </h1>
          <p className="text-xs text-zinc-400 font-mono">
            ID: {lab.id} • Slug: {lab.slug} • Joined {new Date(lab.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Platform Governance Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {!lab.isVerified && (
            <button
              type="button"
              onClick={() => {
                setVerifyApprove(true);
                setShowVerifyModal(true);
              }}
              className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition shadow-sm"
            >
              ✓ Approve Verification
            </button>
          )}

          {!lab.isVerified && lab.status === "PENDING_VERIFICATION" && (
            <button
              type="button"
              onClick={() => {
                setVerifyApprove(false);
                setShowVerifyModal(true);
              }}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-rose-400 hover:bg-zinc-800 transition"
            >
              ✕ Reject Verification
            </button>
          )}

          {lab.status === "ACTIVE" ? (
            <button
              type="button"
              onClick={() => {
                setSuspendAction(true);
                setShowSuspendModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-800 bg-rose-950 px-3.5 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-900 transition"
            >
              <Ban className="w-3.5 h-3.5" />
              Suspend Storefront
            </button>
          ) : lab.status === "SUSPENDED" ? (
            <button
              type="button"
              onClick={() => {
                setSuspendAction(false);
                setShowSuspendModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-sky-600 transition shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reactivate Storefront
            </button>
          ) : null}

          <a
            href={`/${lab.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:text-white transition"
          >
            <span>View Live Store</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Grid: 4 Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-[10px] uppercase font-bold text-zinc-400">Active Tests</p>
          <p className="text-xl font-bold text-white mt-1">{counts.tests}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-[10px] uppercase font-bold text-zinc-400">Packages</p>
          <p className="text-xl font-bold text-white mt-1">{counts.packages}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-[10px] uppercase font-bold text-zinc-400">Total Orders</p>
          <p className="text-xl font-bold text-white mt-1">{counts.orders}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-[10px] uppercase font-bold text-zinc-400">Patients Served</p>
          <p className="text-xl font-bold text-white mt-1">{counts.patients}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-[10px] uppercase font-bold text-zinc-400">Reports Delivered</p>
          <p className="text-xl font-bold text-white mt-1">{counts.reports}</p>
        </div>
      </div>

      {/* Profile Sections Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Contact & Registration Information */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Registration & Contact Details
          </h2>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-zinc-500">Legal Entity:</span>
              <p className="font-semibold text-white">{lab.legalName || "Same as display name"}</p>
            </div>
            <div>
              <span className="text-zinc-500">Phone:</span>
              <p className="font-semibold text-white">{lab.phone}</p>
            </div>
            <div>
              <span className="text-zinc-500">Email:</span>
              <p className="font-semibold text-white">{lab.email}</p>
            </div>
            <div>
              <span className="text-zinc-500">Emergency Phone:</span>
              <p className="font-semibold text-white">{lab.emergencyPhone || "None"}</p>
            </div>
            <div className="col-span-2">
              <span className="text-zinc-500">Physical Address:</span>
              <p className="font-semibold text-white">
                {lab.addressLine1} {lab.addressLine2 ? `, ${lab.addressLine2}` : ""}, {lab.city}, {lab.state} - {lab.postalCode}
              </p>
            </div>
            <div>
              <span className="text-zinc-500">GSTIN:</span>
              <p className="font-mono text-zinc-300">{lab.gstin || "Not provided"}</p>
            </div>
            <div>
              <span className="text-zinc-500">NABL Accreditation:</span>
              <p className="font-mono text-zinc-300">{lab.nablAccreditationNumber || "Not accredited"}</p>
            </div>
          </div>
        </div>

        {/* Commercial & Payment Separation */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Financial & Payment Configurations
          </h2>

          <div className="space-y-3 text-xs">
            {/* Flow A: Patient -> Lab */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-200">Patient Diagnostic Payments (Patient → Lab)</span>
                <span className={`text-[10px] font-bold ${paymentSettings?.isConfigured ? "text-emerald-400" : "text-amber-400"}`}>
                  {paymentSettings?.isConfigured ? "CONFIGURED" : "INCOMPLETE"}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">
                Patients pay laboratory directly. Cash on collection: {paymentSettings?.cashOnCollectionEnabled ? "Enabled" : "Disabled"}. Direct Razorpay: {paymentSettings?.hasRazorpayKey ? "Custom Key ID set" : "None"}.
              </p>
            </div>

            {/* Flow B: Lab -> Gyrex */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-200">Gyrex Platform SaaS (Lab → Gyrex)</span>
                <span className="text-[10px] font-bold text-indigo-400">
                  {subscription ? `${subscription.planName} (₹${subscription.priceMonthly}/mo)` : "NO PLAN"}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">
                Status: {subscription?.status || "UNSUBSCRIBED"}. Billing: {subscription?.billingCycle || "MONTHLY"}. Period ends: {subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "N/A"}.
              </p>
            </div>

            {/* Storefront Setup */}
            {storeSettings && (
              <div className="text-[11px] text-zinc-400 pt-1">
                Home Collection: {storeSettings.homeCollectionAvailable ? `Available (₹${storeSettings.homeCollectionFee} fee)` : "Lab visit only"}.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Staff & Recent Orders */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Staff Members */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Laboratory Staff ({staff.length})
          </h2>

          {staff.length === 0 ? (
            <p className="text-xs text-zinc-500 py-4">No staff members linked.</p>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {staff.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 text-xs">
                  <div>
                    <span className="font-semibold text-white">{s.fullName}</span>
                    <p className="text-[10px] text-zinc-500">{s.email}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-[10px] text-indigo-400">{s.role}</span>
                    <p className="text-[10px] text-zinc-500">{s.isActive ? "Active" : "Inactive"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Recent Orders
            </h2>
            <Link href={`/superadmin/orders?labId=${lab.id}`} className="text-xs text-indigo-400 hover:underline">
              View all orders →
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="text-xs text-zinc-500 py-4">No orders placed for this lab yet.</p>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {recentOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between py-2 text-xs">
                  <div>
                    <Link href={`/superadmin/orders/${o.id}`} className="font-mono font-bold text-indigo-300 hover:underline">
                      {o.orderNumber}
                    </Link>
                    <p className="text-[10px] text-zinc-500">{o.patientName}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-white">₹{o.totalAmount}</span>
                    <SuperadminStatusBadge status={o.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Audit History */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
          Compliance & Administrative Audit Log
        </h2>

        {auditLogs.length === 0 ? (
          <p className="text-xs text-zinc-500 py-4">No administrative audit records logged for this tenant.</p>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {auditLogs.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 text-xs">
                <div>
                  <span className="font-semibold text-zinc-200">{a.action}</span>
                  <span className="text-zinc-500 text-[11px] ml-2">by {a.actorName}</span>
                </div>
                <span className="text-[11px] text-zinc-500">{new Date(a.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Verification Modal */}
      <ConfirmationModal
        isOpen={showVerifyModal}
        title={verifyApprove ? "Approve Laboratory Verification" : "Reject Laboratory Verification"}
        description={
          verifyApprove
            ? `Are you sure you want to approve '${lab.name}'? This will mark the laboratory verified and activate their digital storefront.`
            : `Are you sure you want to reject verification for '${lab.name}'? Their storefront will remain blocked.`
        }
        confirmButtonText={verifyApprove ? "Confirm Approval" : "Confirm Rejection"}
        confirmVariant={verifyApprove ? "primary" : "danger"}
        onConfirm={handleVerify}
        onClose={() => setShowVerifyModal(false)}
        isLoading={isProcessing}
      />

      {/* Suspension Modal */}
      <ConfirmationModal
        isOpen={showSuspendModal}
        title={suspendAction ? "Suspend Laboratory Storefront" : "Reactivate Laboratory Storefront"}
        description={
          suspendAction
            ? `Suspending '${lab.name}' will immediately block patient bookings, disable checkout, and downgrade the laboratory portal to read-only mode.`
            : `Reactivating '${lab.name}' will restore their public storefront and allow new patient bookings.`
        }
        confirmKeyword={suspendAction ? "SUSPEND" : undefined}
        confirmButtonText={suspendAction ? "Confirm Suspension" : "Reactivate Laboratory"}
        confirmVariant={suspendAction ? "danger" : "primary"}
        onConfirm={handleSuspend}
        onClose={() => setShowSuspendModal(false)}
        isLoading={isProcessing}
      />
    </div>
  );
}
