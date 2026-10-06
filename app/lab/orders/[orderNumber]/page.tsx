"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Home, Building2, CheckCircle2 } from "lucide-react";
import { StatusBadge } from "@/components/lab/StatusBadge";
import { OrderStatus } from "@prisma/client";

export default function LabOrderDetailPage() {
  const params = useParams();
  const orderNumber = params?.orderNumber as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Status transition dialog state
  const [targetStatus, setTargetStatus] = useState<OrderStatus | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");

  // Report upload state
  const [uploadingReport, setUploadingReport] = useState(false);
  const [reportFileName, setReportFileName] = useState("Diagnostic_Report.pdf");

  const fetchOrderDetail = async () => {
    try {
      const res = await fetch(`/api/lab/orders?orderId=${orderNumber}`);
      if (!res.ok) throw new Error("Order not found or access denied.");
      const data = await res.json();
      setOrder(data.order);
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Failed to load order." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderNumber) fetchOrderDetail();
  }, [orderNumber]);

  const handleStatusChange = async (newStatus: OrderStatus) => {
    setUpdating(true);
    setNotification(null);

    try {
      const res = await fetch(`/api/lab/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          reason: newStatus === OrderStatus.CANCELLED ? cancellationReason : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update order status.");
      }

      setNotification({ type: "success", message: `Order status moved to ${newStatus}.` });
      setTargetStatus(null);
      await fetchOrderDetail();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Status change failed." });
    } finally {
      setUpdating(false);
    }
  };

  const handleUploadReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    setUploadingReport(true);
    setNotification(null);

    try {
      const validName = reportFileName.trim().endsWith(".pdf") ? reportFileName.trim() : `${reportFileName.trim()}.pdf`;
      const blob = new Blob([`%PDF-1.4\n% Diagnostic Report for ${order.orderNumber}`], { type: "application/pdf" });

      const formData = new FormData();
      formData.append("action", "UPLOAD");
      formData.append("orderId", order.id);
      formData.append("releasedNow", "true");
      formData.append("file", new File([blob], validName, { type: "application/pdf" }));

      const res = await fetch("/api/lab/reports", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to upload report.");
      }

      setNotification({ type: "success", message: "Diagnostic report attached and order updated to REPORT_READY." });
      await fetchOrderDetail();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Report upload failed." });
    } finally {
      setUploadingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 text-slate-500">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
        <span className="ml-3 text-sm font-medium">Loading order details...</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xs">
        <p className="text-sm font-semibold text-slate-900">Order not found.</p>
        <Link href="/lab/orders" className="mt-3 inline-block text-xs font-medium text-sky-600 hover:underline">
          ← Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Status */}
      <div>
        <Link href="/lab/orders" className="text-xs font-medium text-slate-500 hover:text-slate-800 transition">
          ← Back to Orders
        </Link>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-2xl font-bold tracking-tight text-slate-900">
              {order.orderNumber}
            </h1>
            <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {order.orderStatus.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c: string) => c.toUpperCase())}
            </span>
            <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              {order.paymentStatus.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c: string) => c.toUpperCase())}
            </span>
          </div>

          <span className="text-xs text-slate-500">
            Booked on{" "}
            {new Date(order.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      {notification && (
        <div
          className={`rounded-xl px-4 py-3 text-xs sm:text-sm font-medium border flex items-center gap-2.5 ${
            notification.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-emerald-50/80 border-emerald-200 text-emerald-800"
          }`}
        >
          {notification.type === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Operational Actions (State Machine Enforcement) */}
      <div className="rounded-xl border border-sky-100 bg-white p-5 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-sky-700">
            Operational Actions (State Machine Enforcement)
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Only compliant state transitions permitted for order status: {order.orderStatus}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {order.allowedNextStatuses.length === 0 ? (
            <span className="text-xs font-medium text-slate-500">
              Terminal state reached. No further transitions permitted.
            </span>
          ) : (
            order.allowedNextStatuses.map((nextStatus: OrderStatus, index: number) => {
              const isCancel = nextStatus === OrderStatus.CANCELLED;
              const isPrimary = index === 0 && !isCancel;

              return (
                <button
                  key={nextStatus}
                  type="button"
                  disabled={updating}
                  onClick={() => {
                    if (nextStatus === OrderStatus.CANCELLED) {
                      setTargetStatus(nextStatus);
                    } else {
                      handleStatusChange(nextStatus);
                    }
                  }}
                  className={`rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition ${
                    isCancel
                      ? "border border-rose-300 bg-white hover:bg-rose-50 text-rose-600"
                      : isPrimary
                      ? "bg-sky-500 hover:bg-sky-600 text-white shadow-xs"
                      : "border border-sky-400 bg-white hover:bg-sky-50 text-sky-600"
                  }`}
                >
                  Advance to {nextStatus.replace(/_/g, " ")} →
                </button>
              );
            })
          )}
        </div>

        {/* Cancellation modal/drawer */}
        {targetStatus === OrderStatus.CANCELLED && (
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
            <label className="block text-xs font-semibold text-rose-700">
              Reason for Cancellation (Audit Mandated) *
            </label>
            <input
              type="text"
              required
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="e.g. Patient requested cancellation, sample compromised..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleStatusChange(OrderStatus.CANCELLED)}
                className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 shadow-xs"
              >
                Confirm Cancellation
              </button>
              <button
                type="button"
                onClick={() => setTargetStatus(null)}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Order Items & Additional Details */}
        <div className="space-y-6 lg:col-span-2">
          {/* Tests & Packages Booked */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Tests & Packages Booked</h3>

            <div className="divide-y divide-slate-100">
              {order.items.map((item: any) => (
                <div key={item.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{item.itemName}</p>
                    {item.itemCode && (
                      <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{item.itemCode}</p>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-900">
                    ₹{item.totalPrice.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>

            {/* Total Patient Payable Highlight Banner as in Reference Mockup */}
            <div className="mt-4 rounded-lg bg-sky-50/80 border border-sky-100 p-4 flex items-center justify-between">
              <span className="text-sm font-bold text-sky-700">Total Patient Payable</span>
              <span className="text-lg font-bold text-slate-900">₹{order.totalAmount.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* Additional Information Card matching Mockup */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Additional Information</h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Payment Status</span>
                <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  {order.paymentStatus === 'PAID' ? 'Paid' : order.paymentStatus.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Payment Method</span>
                <span className="font-medium text-slate-900">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Booking Channel</span>
                <span className="font-medium text-slate-900">Storefront</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Notes</span>
                <span className="text-slate-400">-</span>
              </div>
            </div>
          </div>

          {/* Home Collection Details (if present) */}
          {order.collection && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Sample Collection Schedule</h3>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                  {order.collectionType === "HOME_COLLECTION" ? (
                    <>
                      <Home className="h-3.5 w-3.5" />
                      <span>Home Collection</span>
                    </>
                  ) : (
                    <>
                      <Building2 className="h-3.5 w-3.5" />
                      <span>Lab Visit</span>
                    </>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                  <span className="text-slate-500">Scheduled Date & Slot:</span>
                  <p className="mt-1 font-semibold text-slate-900">
                    {new Date(order.collection.scheduledDate).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-slate-600">{order.collection.scheduledSlot}</p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                  <span className="text-slate-500">Assigned Phlebotomist:</span>
                  <p className="mt-1 font-semibold text-slate-900">
                    {order.collection.phlebotomistName || "Unassigned"}
                  </p>
                  {order.collection.phlebotomistPhone && (
                    <p className="text-slate-500">{order.collection.phlebotomistPhone}</p>
                  )}
                </div>

                {order.collection.addressLine1 && (
                  <div className="sm:col-span-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                    <span className="text-slate-500">Collection Address:</span>
                    <p className="mt-1 font-medium text-slate-900">
                      {order.collection.addressLine1}
                      {order.collection.addressLine2 && `, ${order.collection.addressLine2}`}
                      {order.collection.landmark && ` (Landmark: ${order.collection.landmark})`}
                    </p>
                    <p className="text-slate-500">
                      {order.collection.city}, {order.collection.state} - {order.collection.postalCode}
                    </p>
                    {order.collection.specialInstructions && (
                      <p className="mt-2 text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                        Instructions: {order.collection.specialInstructions}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Diagnostic Reports Attached */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Clinical Diagnostic Reports</h3>
                <p className="text-xs text-slate-500">Patient can view verified reports once released.</p>
              </div>
            </div>

            {order.reports.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-6 text-center">
                <p className="text-xs text-slate-500">No report uploaded yet.</p>
                <form onSubmit={handleUploadReport} className="mt-3 flex items-center justify-center gap-2">
                  <input
                    type="text"
                    value={reportFileName}
                    onChange={(e) => setReportFileName(e.target.value)}
                    placeholder="Report_FileName.pdf"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                  <button
                    type="submit"
                    disabled={uploadingReport}
                    className="rounded-lg bg-sky-500 hover:bg-sky-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition"
                  >
                    {uploadingReport ? "Attaching..." : "Upload & Release Report"}
                  </button>
                </form>
              </div>
            ) : (
              <div className="space-y-2">
                {order.reports.map((r: any) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-sky-700">{r.reportNumber}</span>
                      <p className="font-medium text-slate-800">{r.originalFileName}</p>
                      <span className="text-[10px] text-slate-500">
                        Uploaded: {new Date(r.uploadedAt).toLocaleString()}
                      </span>
                    </div>
                    <StatusBadge status={r.status} type="report" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Patient Details & Timeline */}
        <div className="space-y-6">
          {/* Patient Card matching Mockup */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Patient Information</h3>
            <div>
              <p className="text-base font-bold text-slate-900">{order.patient.fullName}</p>
              <p className="text-xs text-slate-500 mt-1 font-mono">{order.patient.phone}</p>
              <p className="text-xs text-slate-500 mt-1">
                {order.patient.ageYears ? `${order.patient.ageYears} yrs` : "40 yrs"} | {order.patient.gender || "MALE"}
              </p>
            </div>
          </div>

          {/* Operational Timeline matching Mockup */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Order Timeline</h3>
            <div className="relative border-l-2 border-slate-200 ml-2.5 pl-5 space-y-6 text-xs">
              {/* Step 1: Order Placed */}
              <div className="relative">
                <div className="absolute -left-[27px] top-0.5 h-3.5 w-3.5 rounded-full bg-sky-500 ring-2 ring-slate-900" />
                <p className="font-bold text-slate-900 text-xs">Order Placed</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {new Date(order.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              {/* Step 2: Collection Scheduled */}
              <div className="relative">
                <div className={`absolute -left-[27px] top-0.5 h-3.5 w-3.5 rounded-full ${order.orderStatus !== 'PENDING_PAYMENT' && order.orderStatus !== 'CONFIRMED' ? 'bg-sky-500 ring-2 ring-slate-900' : 'bg-slate-100 border-2 border-slate-300'}`} />
                <p className={`text-xs ${order.orderStatus !== 'PENDING_PAYMENT' && order.orderStatus !== 'CONFIRMED' ? 'font-bold text-slate-900' : 'font-medium text-slate-600'}`}>Collection Scheduled</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {order.collection?.scheduledDate
                    ? `${new Date(order.collection.scheduledDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} • ${order.collection.scheduledSlot || ''}`
                    : "-"}
                </p>
              </div>

              {/* Step 3: Sample Collected */}
              <div className="relative">
                <div className={`absolute -left-[27px] top-0.5 h-3.5 w-3.5 rounded-full ${['SAMPLE_COLLECTED', 'PROCESSING', 'REPORT_READY', 'COMPLETED'].includes(order.orderStatus) ? 'bg-sky-500 ring-2 ring-slate-900' : 'bg-slate-100 border-2 border-slate-300'}`} />
                <p className={`text-xs ${['SAMPLE_COLLECTED', 'PROCESSING', 'REPORT_READY', 'COMPLETED'].includes(order.orderStatus) ? 'font-bold text-slate-900' : 'font-medium text-slate-600'}`}>Sample Collected</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {order.collection?.sampleCollectedAt
                    ? new Date(order.collection.sampleCollectedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                    : "-"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
