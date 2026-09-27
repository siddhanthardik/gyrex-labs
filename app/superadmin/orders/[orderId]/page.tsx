import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlatformOrderDetail } from "@/services/superadmin/orders-service";
import { SuperadminStatusBadge } from "@/components/superadmin/SuperadminStatusBadge";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orderId: string }>;
}

export default async function SuperadminOrderDetailPage({ params }: PageProps) {
  const { orderId } = await params;
  const order = await getPlatformOrderDetail(orderId);

  if (!order) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Link href="/superadmin/orders" className="hover:text-white transition">
              ← Orders
            </Link>
            <span>/</span>
            <span className="font-mono text-zinc-300">{order.orderNumber}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <span>Order {order.orderNumber}</span>
            <SuperadminStatusBadge status={order.status} />
          </h1>
          <p className="text-xs text-zinc-400">
            Placed on {new Date(order.createdAt).toLocaleString()} • Fulfilling Lab:{" "}
            <Link href={`/superadmin/labs/${order.lab.id}`} className="font-semibold text-indigo-400 hover:underline">
              {order.lab.name}
            </Link>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/superadmin/labs/${order.lab.id}`}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition"
          >
            Inspect Lab Account →
          </Link>
        </div>
      </div>

      {/* Grid: 3 summary cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Patient Details */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Patient Details</h2>
          <div className="text-xs space-y-1.5">
            <p className="text-base font-semibold text-white">{order.patient.fullName}</p>
            <p className="text-zinc-400">Phone: {order.patient.phone}</p>
            <p className="text-zinc-400">Email: {order.patient.email || "None"}</p>
            <p className="text-zinc-400">
              Demographics: {order.patient.gender} • {order.patient.ageYears ? `${order.patient.ageYears} yrs` : "Age not specified"}
            </p>
          </div>
        </div>

        {/* Collection & Fulfillment */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Collection Logistics</h2>
          <div className="text-xs space-y-1.5">
            <p className="font-semibold text-white uppercase">{order.collectionType.replace(/_/g, " ")}</p>
            {order.collection ? (
              <>
                <p className="text-zinc-300">
                  Scheduled: {new Date(order.collection.scheduledDate).toLocaleDateString()} ({order.collection.timeSlot})
                </p>
                <p className="text-zinc-400">
                  Address: {order.collection.addressLine1}, {order.collection.city} - {order.collection.postalCode}
                </p>
                <p className="text-zinc-400">
                  Phlebotomist: {order.collection.phlebotomistName || "Unassigned"} ({order.collection.phlebotomistPhone || "N/A"})
                </p>
              </>
            ) : (
              <p className="text-zinc-500">Patient will visit laboratory center directly.</p>
            )}
          </div>
        </div>

        {/* Payment Summary */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Diagnostic Payment</h2>
            <SuperadminStatusBadge status={order.paymentStatus} />
          </div>
          <div className="text-xs space-y-1">
            <p className="text-xl font-bold text-white">₹{order.totalAmount.toLocaleString()}</p>
            {order.payment ? (
              <>
                <p className="text-zinc-400">Method: {order.payment.method}</p>
                <p className="text-zinc-400 font-mono text-[11px]">Ref: {order.payment.paymentNumber}</p>
                {order.payment.paidAt && (
                  <p className="text-emerald-400 text-[11px]">
                    Paid on {new Date(order.payment.paidAt).toLocaleString()}
                  </p>
                )}
              </>
            ) : (
              <p className="text-amber-400">Pending payment directly to laboratory.</p>
            )}
          </div>
        </div>
      </div>

      {/* Ordered Items Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
          Ordered Diagnostic Investigations ({order.items.length})
        </h2>

        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-900 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="px-4 py-2.5">Item Name & Code</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">Unit Price</th>
                <th className="px-4 py-2.5 text-right">Total Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2.5">
                    <span className="font-semibold text-white">{item.itemName}</span>
                    <span className="font-mono text-[10px] text-zinc-500 ml-2">[{item.testCode}]</span>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-400">{item.itemType}</td>
                  <td className="px-4 py-2.5 font-mono">₹{item.unitPrice}</td>
                  <td className="px-4 py-2.5 font-mono font-semibold text-white text-right">
                    ₹{item.totalPrice}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reports Section */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
          Diagnostic Reports Delivered ({order.reports.length})
        </h2>

        {order.reports.length === 0 ? (
          <p className="text-xs text-zinc-500 py-3">No reports released by laboratory yet.</p>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {order.reports.map((rep) => (
              <div key={rep.id} className="flex items-center justify-between py-2 text-xs">
                <div>
                  <span className="font-mono font-semibold text-white">{rep.reportNumber}</span>
                  <span className="text-zinc-500 text-[11px] ml-2">({rep.fileName})</span>
                  <p className="text-[10px] text-zinc-500">
                    Uploaded {new Date(rep.uploadedAt).toLocaleString()}
                  </p>
                </div>
                <SuperadminStatusBadge status={rep.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audit History */}
      {order.auditLogs.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Order Audit Trail</h2>
          <div className="divide-y divide-zinc-800/60">
            {order.auditLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between py-2 text-xs">
                <div>
                  <span className="font-semibold text-zinc-200">{log.action}</span>
                  <span className="text-zinc-500 text-[11px] ml-2">by {log.actorName}</span>
                </div>
                <span className="text-[11px] text-zinc-500">{new Date(log.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
