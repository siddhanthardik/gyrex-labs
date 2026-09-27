"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
      <div className="flex items-center justify-center p-20 text-zinc-400">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
        <span className="ml-3 text-sm">Loading order details...</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="rounded-xl border border-zinc-800 p-8 text-center">
        <p className="text-sm font-semibold text-white">Order not found.</p>
        <Link href="/lab/orders" className="mt-3 inline-block text-xs text-sky-400 hover:underline">
          ← Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Top Breadcrumb & Status */}
      <div>
        <Link href="/lab/orders" className="text-xs font-semibold text-zinc-400 hover:text-white transition">
          ← Back to Orders
        </Link>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-2xl font-bold tracking-tight text-white">
              {order.orderNumber}
            </h1>
            <StatusBadge status={order.orderStatus} type="order" />
            <StatusBadge status={order.paymentStatus} type="payment" />
          </div>

          <span className="text-xs text-zinc-400">
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
          className={`rounded-xl p-4 text-xs font-medium border ${
            notification.type === "error"
              ? "bg-rose-500/10 border-rose-500/25 text-rose-400"
              : "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* State Transition Controls */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Operational Actions (State Machine Enforcement)
            </h3>
            <p className="mt-0.5 text-xs text-zinc-400">
              Only compliant state transitions permitted for order status: {order.orderStatus}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {order.allowedNextStatuses.length === 0 ? (
              <span className="text-xs font-medium text-zinc-400">
                Terminal state reached. No further transitions permitted.
              </span>
            ) : (
              order.allowedNextStatuses.map((nextStatus: OrderStatus) => (
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
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                    nextStatus === OrderStatus.CANCELLED
                      ? "border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                      : "bg-sky-500 text-white hover:bg-sky-400 shadow-sm"
                  }`}
                >
                  Advance to {nextStatus.replace(/_/g, " ")} →
                </button>
              ))
            )}
          </div>
        </div>

        {/* Cancellation modal/drawer */}
        {targetStatus === OrderStatus.CANCELLED && (
          <div className="mt-4 pt-4 border-t border-zinc-800 space-y-3">
            <label className="block text-xs font-semibold text-rose-400">
              Reason for Cancellation (Audit Mandated) *
            </label>
            <input
              type="text"
              required
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="e.g. Patient requested cancellation, sample compromised..."
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleStatusChange(OrderStatus.CANCELLED)}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Confirm Cancellation
              </button>
              <button
                type="button"
                onClick={() => setTargetStatus(null)}
                className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Order Items & Payment Details */}
        <div className="space-y-6 lg:col-span-2">
          {/* Diagnostic Tests Booked */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm">
            <h3 className="text-sm font-bold text-white">Tests & Packages Booked</h3>

            <div className="mt-4 divide-y divide-zinc-800/80">
              {order.items.map((item: any) => (
                <div key={item.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-white">{item.itemName}</p>
                    <p className="text-[11px] text-zinc-400">
                      {item.itemType} {item.itemCode && `• ${item.itemCode}`} • Qty: {item.quantity}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-white">
                    ₹{item.totalPrice.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>

            {/* Total Calculation */}
            <div className="mt-4 pt-4 border-t border-zinc-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal</span>
                <span>₹{order.subtotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Home Collection Fee</span>
                <span>₹{order.collectionFee.toLocaleString("en-IN")}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount</span>
                  <span>-₹{order.discountAmount.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-zinc-800/60">
                <span>Total Patient Payable</span>
                <span>₹{order.totalAmount.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          {/* Home Collection Details */}
          {order.collection && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Sample Collection Schedule</h3>
                <span className="text-xs font-semibold text-purple-400">
                  {order.collectionType === "HOME_COLLECTION" ? "🏠 Home Collection" : "🏥 Lab Visit"}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                  <span className="text-zinc-400">Scheduled Date & Slot:</span>
                  <p className="mt-1 font-semibold text-white">
                    {new Date(order.collection.scheduledDate).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-zinc-300">{order.collection.scheduledSlot}</p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                  <span className="text-zinc-400">Assigned Phlebotomist:</span>
                  <p className="mt-1 font-semibold text-white">
                    {order.collection.phlebotomistName || "Unassigned"}
                  </p>
                  {order.collection.phlebotomistPhone && (
                    <p className="text-zinc-400">{order.collection.phlebotomistPhone}</p>
                  )}
                </div>

                {order.collection.addressLine1 && (
                  <div className="sm:col-span-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                    <span className="text-zinc-400">Collection Address:</span>
                    <p className="mt-1 text-white">
                      {order.collection.addressLine1}
                      {order.collection.addressLine2 && `, ${order.collection.addressLine2}`}
                      {order.collection.landmark && ` (Landmark: ${order.collection.landmark})`}
                    </p>
                    <p className="text-zinc-400">
                      {order.collection.city}, {order.collection.state} - {order.collection.postalCode}
                    </p>
                    {order.collection.specialInstructions && (
                      <p className="mt-2 text-amber-300">
                        Instructions: {order.collection.specialInstructions}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Diagnostic Reports Attached */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Clinical Diagnostic Reports</h3>
                <p className="text-xs text-zinc-400">Patient can view verified reports once released.</p>
              </div>
            </div>

            {order.reports.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center">
                <p className="text-xs text-zinc-400">No report uploaded yet.</p>
                <form onSubmit={handleUploadReport} className="mt-3 flex items-center justify-center gap-2">
                  <input
                    type="text"
                    value={reportFileName}
                    onChange={(e) => setReportFileName(e.target.value)}
                    placeholder="Report_FileName.pdf"
                    className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white"
                  />
                  <button
                    type="submit"
                    disabled={uploadingReport}
                    className="rounded-lg bg-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-500 transition"
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
                    className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-sky-400">{r.reportNumber}</span>
                      <p className="text-zinc-300">{r.originalFileName}</p>
                      <span className="text-[10px] text-zinc-400">
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
          {/* Patient Card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm space-y-4">
            <h3 className="text-sm font-bold text-white">Patient Information</h3>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-zinc-400">Full Name:</span>
                <p className="font-semibold text-white text-sm">{order.patient.fullName}</p>
              </div>
              <div>
                <span className="text-zinc-400">Mobile Phone:</span>
                <p className="font-mono font-medium text-zinc-200">{order.patient.phone}</p>
              </div>
              {order.patient.email && (
                <div>
                  <span className="text-zinc-400">Email:</span>
                  <p className="text-zinc-200">{order.patient.email}</p>
                </div>
              )}
              <div className="flex gap-4 pt-1">
                <div>
                  <span className="text-zinc-400">Age:</span>
                  <p className="text-zinc-200">{order.patient.ageYears ? `${order.patient.ageYears} yrs` : "N/A"}</p>
                </div>
                <div>
                  <span className="text-zinc-400">Gender:</span>
                  <p className="text-zinc-200">{order.patient.gender}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Operational Timeline */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm space-y-4">
            <h3 className="text-sm font-bold text-white">Order Timeline</h3>

            <div className="space-y-4 border-l border-zinc-800 pl-4 ml-2 text-xs">
              {order.timeline.map((step: any, idx: number) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-[21px] top-0.5 h-2.5 w-2.5 rounded-full bg-sky-500 ring-4 ring-zinc-950" />
                  <p className="font-semibold text-white">{step.title}</p>
                  <p className="text-[11px] text-zinc-400">{step.description}</p>
                  <span className="text-[10px] text-zinc-400">
                    {new Date(step.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
