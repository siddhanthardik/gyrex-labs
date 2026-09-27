"use client";

import React, { useState, useEffect } from "react";

export default function LabSubscriptionPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [selectedCycle, setSelectedCycle] = useState("MONTHLY");
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchSubscription = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lab/subscription");
      if (res.ok) {
        const d = await res.json();
        setData(d);
        if (d.subscription) {
          setSelectedPlan(d.subscription.plan.code);
          setSelectedCycle(d.subscription.billingCycle);
        }
      }
    } catch (err) {
      console.error("Failed to load subscription:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  const handleChangePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setNotification(null);

    try {
      const res = await fetch("/api/lab/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planCode: selectedPlan,
          billingCycle: selectedCycle,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to change subscription plan.");
      }

      setNotification({ type: "success", message: "Subscription plan updated successfully." });
      setShowChangeModal(false);
      fetchSubscription();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Failed to change plan." });
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm("Are you sure you want to cancel your platform subscription at the end of the billing period?")) {
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch("/api/lab/subscription", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to cancel subscription.");
      setNotification({ type: "success", message: "Subscription marked for cancellation at period end." });
      fetchSubscription();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Failed to cancel." });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 text-zinc-400">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
        <span className="ml-3 text-sm">Loading subscription details...</span>
      </div>
    );
  }

  const sub = data?.subscription;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Gyrex Platform Subscription & Billing
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Manage what your laboratory pays to Gyrex Labs for software, infrastructure, and patient commerce tools.
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

      {/* Overview Card */}
      {sub && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8 space-y-6 backdrop-blur-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                  {sub.status}
                </span>
                <span className="text-xs text-zinc-400">Billing Cycle: {sub.billingCycle}</span>
              </div>
              <h2 className="mt-2 text-3xl font-extrabold text-white">
                {sub.plan.name} Plan
              </h2>
              <p className="text-xs text-zinc-400 mt-1">{sub.plan.description}</p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-3xl font-extrabold text-white">
                ₹{sub.effectivePrice.toLocaleString("en-IN")}
              </span>
              <span className="text-xs text-zinc-400">
                {sub.billingCycle === "MONTHLY" ? " / month" : " / year"}
              </span>
              <p className="mt-1 text-xs text-zinc-400">
                Next billing date:{" "}
                <strong className="text-zinc-200">
                  {new Date(sub.currentPeriodEnd).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </strong>
              </p>
            </div>
          </div>

          {/* Features in Plan */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-xs">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <span className="text-zinc-400">Monthly Orders:</span>
              <p className="mt-1 font-bold text-white">
                {sub.plan.maxOrdersPerMonth || "Unlimited"}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <span className="text-zinc-400">Staff Accounts:</span>
              <p className="mt-1 font-bold text-white">Up to {sub.plan.maxStaffAccounts}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <span className="text-zinc-400">Custom Branding:</span>
              <p className="mt-1 font-bold text-emerald-400">Enabled ✓</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <span className="text-zinc-400">Prescription AI:</span>
              <p className="mt-1 font-bold text-emerald-400">Enabled ✓</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setShowChangeModal(true)}
              className="rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-sky-500/20 hover:bg-sky-400 transition"
            >
              Change Subscription Plan
            </button>

            {!sub.cancelAtPeriodEnd ? (
              <button
                type="button"
                onClick={handleCancelSubscription}
                className="text-xs text-zinc-400 hover:text-rose-400 transition"
              >
                Cancel Subscription at Period End
              </button>
            ) : (
              <span className="text-xs text-amber-400">
                Cancellation scheduled at end of current period
              </span>
            )}
          </div>
        </div>
      )}

      {/* Invoices History */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
        <h3 className="text-base font-bold text-white">Gyrex Platform Invoices & Billing History</h3>
        <p className="text-xs text-zinc-400">
          Official tax invoices for your Gyrex platform subscription.
        </p>

        {sub?.invoices?.length === 0 ? (
          <div className="p-6 text-center text-xs text-zinc-400">No invoices issued yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  <th className="py-2.5 px-3">Invoice Number</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-xs">
                {sub?.invoices?.map((inv: any) => (
                  <tr key={inv.id}>
                    <td className="py-3 px-3 font-mono font-medium text-sky-400">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-3 text-zinc-300">
                      {new Date(inv.dueDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 font-bold text-white">₹{inv.amountDue}</td>
                    <td className="py-3 px-3">
                      <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-700"
                      >
                        Download PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Plan Change Modal */}
      {showChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white">Select Platform Plan</h3>
              <button
                type="button"
                onClick={() => setShowChangeModal(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleChangePlan} className="space-y-4">
              <div className="flex gap-2 p-1 rounded-xl bg-zinc-950 border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setSelectedCycle("MONTHLY")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                    selectedCycle === "MONTHLY"
                      ? "bg-sky-500 text-white"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Monthly Billing
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCycle("YEARLY")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                    selectedCycle === "YEARLY"
                      ? "bg-sky-500 text-white"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Yearly Billing (Save 15%)
                </button>
              </div>

              <div className="space-y-3">
                {data.availablePlans.map((plan: any) => {
                  const isSelected = selectedPlan === plan.code;
                  const price =
                    selectedCycle === "MONTHLY" ? plan.priceMonthly : plan.priceYearly;

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.code)}
                      className={`flex items-center justify-between rounded-xl border p-4 cursor-pointer transition ${
                        isSelected
                          ? "border-sky-500/50 bg-sky-500/10"
                          : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                      }`}
                    >
                      <div>
                        <h4 className="text-sm font-bold text-white">{plan.name}</h4>
                        <p className="text-xs text-zinc-400">{plan.description}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-bold text-white">₹{price}</span>
                        <span className="text-[10px] text-zinc-400">
                          {selectedCycle === "MONTHLY" ? "/mo" : "/yr"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowChangeModal(false)}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="rounded-lg bg-sky-500 px-5 py-2 text-xs font-semibold text-white hover:bg-sky-400 transition disabled:opacity-50"
                >
                  {updating ? "Updating Plan..." : "Confirm Plan Change"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
