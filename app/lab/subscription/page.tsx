"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CreditCard,
  CheckCircle2,
  Calendar,
  Zap,
  Download,
  AlertCircle,
  RefreshCw,
  X,
  ShieldCheck,
  Check,
  Users,
  Package,
} from "lucide-react";

export default function LabSubscriptionPage() {
  const [data, setData] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [selectedCycle, setSelectedCycle] = useState("MONTHLY");
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchSubscription = async () => {
    setLoading(true);
    try {
      const [subRes, plansRes] = await Promise.all([
        fetch("/api/lab/subscription"),
        fetch("/api/lab/subscription/plans"),
      ]);

      if (subRes.ok) {
        const d = await subRes.json();
        setData(d);
        if (d.subscription) {
          setSelectedPlan(d.subscription.plan.code);
          setSelectedCycle(d.subscription.billingCycle);
        }
      }

      if (plansRes.ok) {
        const pd = await plansRes.json();
        setPlans(pd.plans || []);
      }
    } catch (err) {
      console.error("Failed to load subscription details:", err);
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

      setNotification({
        type: "success",
        message: "Subscription plan updated successfully.",
      });
      setShowChangeModal(false);
      fetchSubscription();
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to change subscription plan.",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (
      !confirm(
        "Are you sure you want to cancel your platform subscription at the end of the current billing period?"
      )
    ) {
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch("/api/lab/subscription", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to schedule subscription cancellation.");
      setNotification({
        type: "success",
        message: "Subscription scheduled for cancellation at the end of the billing period.",
      });
      fetchSubscription();
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to cancel subscription.",
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 text-slate-500">
        <RefreshCw className="h-6 w-6 animate-spin text-sky-500" />
        <span className="mt-3 text-sm">Loading subscription details...</span>
      </div>
    );
  }

  const sub = data?.subscription;
  const availablePlans = plans.length > 0 ? plans : data?.availablePlans || [];

  // Format plan title without duplicate "Plan Plan"
  const rawPlanName = sub?.plan?.name || "Standard";
  const displayPlanName = rawPlanName.toLowerCase().endsWith("plan")
    ? rawPlanName
    : `${rawPlanName} Plan`;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Gyrex Platform Subscription & Billing
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage what your laboratory pays to Gyrex Labs for software, infrastructure hosting, and patient commerce tools.
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

      {/* Empty State */}
      {!sub && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center space-y-3 shadow-xs">
          <CreditCard className="h-10 w-10 text-slate-400 mx-auto" />
          <h2 className="text-base font-semibold text-slate-900">No Active Platform Subscription</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Choose a commercial platform plan to enable public patient storefront hosting and diagnostic bookings for your laboratory.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowChangeModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-600 transition"
            >
              <span>Choose a Plan</span>
            </button>
          </div>
        </div>
      )}

      {/* Active Subscription Overview Card */}
      {sub && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                  {sub.status}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Billing Cycle: {sub.billingCycle}
                </span>
              </div>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">{displayPlanName}</h2>
              {sub.plan.description && (
                <p className="text-xs text-slate-500 mt-0.5">{sub.plan.description}</p>
              )}
            </div>

            <div className="text-left sm:text-right">
              <span className="text-3xl font-extrabold text-slate-900">
                ₹{sub.effectivePrice.toLocaleString("en-IN")}
              </span>
              <span className="text-xs text-slate-500">
                {sub.billingCycle === "MONTHLY" ? " / month" : " / year"}
              </span>
              <p className="mt-1 text-xs text-slate-500 flex items-center sm:justify-end gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  Next billing date:{" "}
                  <strong className="text-slate-800">
                    {new Date(sub.currentPeriodEnd).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </strong>
                </span>
              </p>
            </div>
          </div>

          {/* Features & Entitlements Grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-xs">
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
              <span className="text-slate-500 font-medium">Monthly Orders:</span>
              <p className="mt-1 font-bold text-slate-900">
                {sub.plan.maxOrdersPerMonth ? `${sub.plan.maxOrdersPerMonth} orders` : "Unlimited"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
              <span className="text-slate-500 font-medium">Staff Accounts:</span>
              <p className="mt-1 font-bold text-slate-900">
                Up to {sub.plan.maxStaffAccounts} seats
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
              <span className="text-slate-500 font-medium">Custom Branding:</span>
              <p className="mt-1 font-bold text-emerald-700 flex items-center gap-1">
                <Check className="h-3.5 w-3.5" />
                <span>Enabled</span>
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
              <span className="text-slate-500 font-medium">Prescription Vision AI:</span>
              <p className="mt-1 font-bold text-emerald-700 flex items-center gap-1">
                <Check className="h-3.5 w-3.5" />
                <span>Enabled</span>
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowChangeModal(true)}
              className="rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-600 transition cursor-pointer"
            >
              Change Subscription Plan
            </button>

            {!sub.cancelAtPeriodEnd ? (
              <button
                type="button"
                onClick={handleCancelSubscription}
                className="text-xs text-slate-500 hover:text-rose-600 transition cursor-pointer"
              >
                Cancel Subscription at Period End
              </button>
            ) : (
              <span className="text-xs text-amber-700 font-medium">
                Cancellation scheduled at the end of the current billing period
              </span>
            )}
          </div>
        </div>
      )}

      {/* Invoices History Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Gyrex Platform Invoices & Billing History
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Official tax invoices for your Gyrex platform subscription.
          </p>
        </div>

        {!sub?.invoices || sub.invoices.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No invoices issued yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-600">
                  <th className="py-2.5 px-3">Invoice Number</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {sub.invoices.map((inv: any) => (
                  <tr key={inv.id} className="transition hover:bg-slate-50/60">
                    <td className="py-3 px-3 font-mono font-medium text-sky-700">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {new Date(inv.dueDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">₹{inv.amountDue}</td>
                    <td className="py-3 px-3">
                      <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50"
                      >
                        <Download className="h-3 w-3 text-slate-500" />
                        <span>PDF</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dynamic Plan Change Modal */}
      {showChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 space-y-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Select Platform Plan</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Plans loaded dynamically from Gyrex platform configuration.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowChangeModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleChangePlan} className="space-y-4">
              {/* Billing Cycle Toggle */}
              <div className="flex gap-2 p-1 rounded-lg bg-slate-100 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedCycle("MONTHLY")}
                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition ${
                    selectedCycle === "MONTHLY"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Monthly Billing
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCycle("YEARLY")}
                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition ${
                    selectedCycle === "YEARLY"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Yearly Billing (Save ~15%)
                </button>
              </div>

              {/* Dynamic Plans List */}
              <div className="space-y-3">
                {availablePlans.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">
                    No active plans available for selection.
                  </p>
                ) : (
                  availablePlans.map((plan: any) => {
                    const isSelected = selectedPlan === plan.code;
                    const price =
                      selectedCycle === "MONTHLY" ? plan.priceMonthly : plan.priceYearly;
                    const cleanName = plan.name.toLowerCase().endsWith("plan")
                      ? plan.name
                      : `${plan.name} Plan`;

                    return (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.code)}
                        className={`flex items-center justify-between rounded-xl border p-4 cursor-pointer transition ${
                          isSelected
                            ? "border-sky-500 bg-sky-50/40 ring-1 ring-sky-500"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <h4 className="text-sm font-bold text-slate-900">{cleanName}</h4>
                          {plan.description && (
                            <p className="text-xs text-slate-500">{plan.description}</p>
                          )}
                          <div className="flex items-center gap-3 text-[11px] text-slate-600 pt-1">
                            <span>
                              {plan.maxOrdersPerMonth
                                ? `${plan.maxOrdersPerMonth} orders/mo`
                                : "Unlimited orders"}
                            </span>
                            <span>•</span>
                            <span>{plan.maxStaffAccounts} staff seats</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0 pl-4">
                          <span className="text-base font-bold text-slate-900">₹{price}</span>
                          <span className="text-[11px] text-slate-500 block">
                            {selectedCycle === "MONTHLY" ? "/mo" : "/yr"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowChangeModal(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating || !selectedPlan}
                  className="rounded-lg bg-sky-500 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-600 transition disabled:opacity-50"
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
