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
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link href="/superadmin/orders" className="hover:text-slate-900 transition">
              ← Orders
            </Link>
            <span>/</span>
            <span className="font-mono text-slate-700 font-medium">{order.orderNumber}</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <span>Order #{order.orderNumber}</span>
            <SuperadminStatusBadge status={order.status} />
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Placed on {new Date(order.createdAt).toLocaleString()} • Fulfilling Lab:{" "}
            <Link href={`/superadmin/labs/${order.lab.id}`} className="font-semibold text-sky-600 hover:underline">
              {order.lab.name}
            </Link>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/superadmin/labs/${order.lab.id}`}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition shadow-2xs"
          >
            Inspect Lab Account →
          </Link>
        </div>
      </div>

      {/* Grid: 3 summary cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Patient Details */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">Patient Details</h2>
          <div className="text-xs space-y-1.5">
            <p className="text-base font-semibold text-slate-900">{order.patient.fullName}</p>
            <p className="text-slate-600">Phone: {order.patient.phone}</p>
            <p className="text-slate-600">Email: {order.patient.email || "None"}</p>
            <p className="text-slate-500">
              Demographics: {order.patient.gender} • {order.patient.ageYears ? `${order.patient.ageYears} yrs` : "Age not specified"}
            </p>
          </div>
        </div>

        {/* Collection & Fulfillment */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">Collection Logistics</h2>
          <div className="text-xs space-y-1.5">
            <p className="font-semibold text-slate-900 uppercase">{order.collectionType.replace(/_/g, " ")}</p>
            {order.collection ? (
              <>
                <p className="text-slate-700">
                  Scheduled: {new Date(order.collection.scheduledDate).toLocaleDateString()} ({order.collection.timeSlot})
                </p>
                <p className="text-slate-600">
                  Address: {order.collection.addressLine1}, {order.collection.city} - {order.collection.postalCode}
                </p>
                <p className="text-slate-500">
                  Phlebotomist: {order.collection.phlebotomistName || "Unassigned"} ({order.collection.phlebotomistPhone || "N/A"})
                </p>
              </>
            ) : (
              <p className="text-slate-500">Patient will visit laboratory center directly.</p>
            )}
          </div>
        </div>

        {/* Payment Summary */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">Diagnostic Payment</h2>
            <SuperadminStatusBadge status={order.paymentStatus} />
          </div>
          <div className="text-xs space-y-1">
            <p className="text-xl font-bold text-slate-900">₹{order.totalAmount.toLocaleString()}</p>
            {order.payment ? (
              <>
                <p className="text-slate-600">Method: {order.payment.method}</p>
                <p className="text-slate-500 font-mono text-[11px]">Ref: {order.payment.paymentNumber}</p>
                {order.payment.paidAt && (
                  <p className="text-emerald-600 text-[11px] font-medium">
                    Paid on {new Date(order.payment.paidAt).toLocaleString()}
                  </p>
                )}
              </>
            ) : (
              <p className="text-amber-600 font-medium">Pending payment directly to laboratory.</p>
            )}
          </div>
        </div>
      </div>

      {/* Ordered Items Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Ordered Diagnostic Investigations ({order.items.length})
        </h2>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Item Name & Code</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Unit Price</th>
                  <th className="px-4 py-2.5 text-right">Total Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {order.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-2.5">
                      <span className="font-semibold text-slate-900">{item.itemName}</span>
                      <span className="font-mono text-[10px] text-slate-400 ml-2">[{item.testCode}]</span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{item.itemType}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-700">₹{item.unitPrice}</td>
                    <td className="px-4 py-2.5 font-mono font-semibold text-slate-900 text-right">
                      ₹{item.totalPrice}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Reports Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Diagnostic Reports Delivered ({order.reports.length})
        </h2>

        {order.reports.length === 0 ? (
          <p className="text-xs text-slate-400 py-3">No reports released by laboratory yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {order.reports.map((rep) => (
              <div key={rep.id} className="flex items-center justify-between py-2 text-xs">
                <div>
                  <span className="font-mono font-semibold text-slate-900">{rep.reportNumber}</span>
                  <span className="text-slate-500 text-[11px] ml-2">({rep.fileName})</span>
                  <p className="text-[10px] text-slate-400">
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
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Order Audit Trail</h2>
          <div className="divide-y divide-slate-100">
            {order.auditLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between py-2 text-xs">
                <div>
                  <span className="font-semibold text-slate-800">{log.action}</span>
                  <span className="text-slate-400 text-[11px] ml-2">by {log.actorName}</span>
                </div>
                <span className="text-[11px] text-slate-400">{new Date(log.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
