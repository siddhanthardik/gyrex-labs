"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Truck, Calendar, User, FlaskConical } from "lucide-react";
import { EmptyState } from "@/components/lab/EmptyState";
import { StatusBadge } from "@/components/lab/StatusBadge";

export default function LabCollectionsPage() {
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [phlebName, setPhlebName] = useState("");
  const [phlebPhone, setPhlebPhone] = useState("");
  const [slot, setSlot] = useState("");
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lab/orders?collectionType=HOME_COLLECTION");
      if (res.ok) {
        const data = await res.json();
        // Extract orders with collection info
        const withColl = (data.orders || [])
          .filter((o: any) => o.collection !== null)
          .map((o: any) => ({
            orderId: o.id,
            orderNumber: o.orderNumber,
            patientName: o.patientName,
            patientPhone: o.patientPhone,
            tests: o.tests.join(", "),
            orderStatus: o.orderStatus,
            collection: o.collection,
          }));
        setCollections(withColl);
      }
    } catch (err) {
      console.error("Failed to load collections:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const handleMarkSampleCollected = async (orderId: string) => {
    try {
      const res = await fetch(`/api/lab/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "SAMPLE_COLLECTED",
          sampleCollectedAt: new Date(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update status.");
      }

      setNotification({ type: "success", message: "Sample marked as collected!" });
      fetchCollections();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Failed to update status." });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Home Sample Collections</h1>
        <p className="mt-1 text-sm text-slate-500">
          Monitor scheduled home sample collections, patient addresses, time slots, and phlebotomist assignments.
        </p>
      </div>

      {notification && (
        <div
          className={`rounded-xl p-4 text-xs font-medium border ${
            notification.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          {notification.message}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-16 text-slate-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
          <span className="ml-3 text-sm font-medium">Loading scheduled home collections...</span>
        </div>
      ) : collections.length === 0 ? (
        <EmptyState
          icon={<Truck className="h-8 w-8 text-slate-400" />}
          title="No Home Collections Scheduled"
          description="Home sample collection requests from patient orders will appear here automatically."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {collections.map((item) => {
            const isCollected = !!item.collection.sampleCollectedAt;

            return (
              <div
                key={item.orderId}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/lab/orders/${item.orderNumber}`}
                      className="font-bold text-sm text-sky-600 hover:underline"
                    >
                      {item.orderNumber}
                    </Link>
                    <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {item.orderStatus === "REPORT_READY"
                        ? "Report Ready"
                        : item.orderStatus.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c: string) => c.toUpperCase())}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mt-2">{item.patientName}</h3>

                  <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600 shrink-0">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="block text-[11px] font-medium text-slate-500">Scheduled Date & Slot</span>
                        <p className="text-xs font-bold text-slate-900">
                          {new Date(item.collection.scheduledDate).toLocaleDateString("en-IN", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}{" "}
                          • {item.collection.scheduledSlot}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600 shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="block text-[11px] font-medium text-slate-500">Collector / Phlebotomist</span>
                        <p className="text-xs font-bold text-slate-900">
                          {item.collection.phlebotomistName || "Assigned on dispatch"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600 shrink-0">
                        <FlaskConical className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-[11px] font-medium text-slate-500">Tests to Collect</span>
                        <p className="text-xs font-bold text-slate-900 truncate" title={item.tests}>
                          {item.tests}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end">
                  {isCollected ? (
                    <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                      Sample in Lab ✓
                    </span>
                  ) : item.orderStatus !== "COMPLETED" && item.orderStatus !== "CANCELLED" ? (
                    <button
                      type="button"
                      onClick={() => handleMarkSampleCollected(item.orderId)}
                      className="rounded-lg bg-sky-500 hover:bg-sky-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition"
                    >
                      ✓ Sample Collected
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
