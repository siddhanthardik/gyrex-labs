"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
        <h1 className="text-2xl font-bold tracking-tight text-white">Home Sample Collections</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Monitor scheduled home sample collections, patient addresses, time slots, and phlebotomist assignments.
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

      {loading ? (
        <div className="flex items-center justify-center p-16 text-zinc-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
          <span className="ml-3 text-sm">Loading scheduled home collections...</span>
        </div>
      ) : collections.length === 0 ? (
        <EmptyState
          icon="🚚"
          title="No Home Collections Scheduled"
          description="Home sample collection requests from patient orders will appear here automatically."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {collections.map((item) => {
            const isCollected = !!item.collection.sampleCollectedAt;

            return (
              <div
                key={item.orderId}
                className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 backdrop-blur-sm space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/lab/orders/${item.orderNumber}`}
                      className="font-mono text-xs font-bold text-sky-400 hover:underline"
                    >
                      {item.orderNumber}
                    </Link>
                    <StatusBadge status={item.orderStatus} type="order" />
                  </div>

                  <div className="mt-3">
                    <h3 className="font-semibold text-white">{item.patientName}</h3>
                    <p className="text-xs text-zinc-400">{item.patientPhone}</p>
                  </div>

                  <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3 space-y-1.5 text-xs">
                    <div>
                      <span className="text-zinc-400">Scheduled Date & Slot:</span>
                      <p className="font-semibold text-white">
                        {new Date(item.collection.scheduledDate).toLocaleDateString("en-IN", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        • {item.collection.scheduledSlot}
                      </p>
                    </div>

                    <div>
                      <span className="text-zinc-400">Collector / Phlebotomist:</span>
                      <p className="font-medium text-zinc-200">
                        {item.collection.phlebotomistName || "Assigned on dispatch"}
                      </p>
                    </div>

                    <div>
                      <span className="text-zinc-400">Tests to Collect:</span>
                      <p className="text-zinc-300 truncate" title={item.tests}>
                        {item.tests}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800 flex items-center justify-between gap-2">
                  <Link
                    href={`/lab/orders/${item.orderNumber}`}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    View Order Details
                  </Link>

                  {!isCollected && item.orderStatus !== "COMPLETED" && item.orderStatus !== "CANCELLED" && (
                    <button
                      type="button"
                      onClick={() => handleMarkSampleCollected(item.orderId)}
                      className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500 transition"
                    >
                      ✓ Sample Collected
                    </button>
                  )}

                  {isCollected && (
                    <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
                      Sample In Lab ✓
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
