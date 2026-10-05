"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CreditCard,
  Plus,
  Edit,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Save,
  Check,
  Shield,
  Zap,
  ArrowLeft,
  Calendar,
} from "lucide-react";
import { SuperadminStatusBadge } from "@/components/superadmin/SuperadminStatusBadge";

interface SubscriptionPlanItem {
  id: string;
  name: string;
  code: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  maxOrdersPerMonth: number | null;
  maxStaffAccounts: number;
  customBrandingEnabled: boolean;
  geminiPrescriptionAiEnabled: boolean;
  isActive: boolean;
  displayOrder: number;
  subscriberCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export default function SuperadminSubscriptionPlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlanItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    priceMonthly: 4999,
    priceYearly: 49990,
    trialDays: 14,
    maxOrdersPerMonth: "" as number | "" | null,
    maxStaffAccounts: 5,
    customBrandingEnabled: true,
    geminiPrescriptionAiEnabled: true,
    isActive: true,
    displayOrder: 0,
  });

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/subscriptions/plans");
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
      }
    } catch (err) {
      console.error("Failed to load subscription plans:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormData({
      name: "",
      code: "PLAN_",
      description: "",
      priceMonthly: 4999,
      priceYearly: 49990,
      trialDays: 14,
      maxOrdersPerMonth: 500,
      maxStaffAccounts: 5,
      customBrandingEnabled: true,
      geminiPrescriptionAiEnabled: true,
      isActive: true,
      displayOrder: plans.length,
    });
    setNotification(null);
    setShowModal(true);
  };

  const openEditModal = (p: SubscriptionPlanItem) => {
    setEditingPlan(p);
    setFormData({
      name: p.name,
      code: p.code,
      description: p.description || "",
      priceMonthly: p.priceMonthly,
      priceYearly: p.priceYearly,
      trialDays: 14,
      maxOrdersPerMonth: p.maxOrdersPerMonth,
      maxStaffAccounts: p.maxStaffAccounts,
      customBrandingEnabled: p.customBrandingEnabled,
      geminiPrescriptionAiEnabled: p.geminiPrescriptionAiEnabled,
      isActive: p.isActive,
      displayOrder: p.displayOrder,
    });
    setNotification(null);
    setShowModal(true);
  };

  const handleToggleActive = async (plan: SubscriptionPlanItem) => {
    const nextActive = !plan.isActive;
    setPlans((prev) =>
      prev.map((p) => (p.id === plan.id ? { ...p, isActive: nextActive } : p))
    );

    try {
      const res = await fetch("/api/superadmin/subscriptions/plans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          isActive: nextActive,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to toggle plan status.");
      }

      setNotification({
        type: "success",
        message: `Plan '${plan.name}' is now ${nextActive ? "Active" : "Inactive"}.`,
      });
    } catch (err: any) {
      setPlans((prev) =>
        prev.map((p) => (p.id === plan.id ? { ...p, isActive: plan.isActive } : p))
      );
      setNotification({
        type: "error",
        message: err.message || "Failed to update status.",
      });
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      setNotification({ type: "error", message: "Plan Name and Code are required." });
      return;
    }
    if (formData.priceMonthly < 0 || formData.priceYearly < 0) {
      setNotification({ type: "error", message: "Prices must be non-negative." });
      return;
    }

    setSubmitting(true);
    setNotification(null);

    const payload = {
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      description: formData.description.trim() || undefined,
      priceMonthly: Number(formData.priceMonthly),
      priceYearly: Number(formData.priceYearly),
      trialDays: Number(formData.trialDays) || 14,
      maxOrdersPerMonth:
        formData.maxOrdersPerMonth === "" || formData.maxOrdersPerMonth === null
          ? null
          : Number(formData.maxOrdersPerMonth),
      maxStaffAccounts: Number(formData.maxStaffAccounts) || 5,
      customBrandingEnabled: formData.customBrandingEnabled,
      geminiPrescriptionAiEnabled: formData.geminiPrescriptionAiEnabled,
      isActive: formData.isActive,
      displayOrder: Number(formData.displayOrder) || 0,
    };

    try {
      const endpoint = "/api/superadmin/subscriptions/plans";
      const method = editingPlan ? "PATCH" : "POST";
      const body = editingPlan ? { planId: editingPlan.id, ...payload } : payload;

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save plan.");
      }

      setNotification({
        type: "success",
        message: `Subscription plan '${formData.name}' ${
          editingPlan ? "updated" : "created"
        } successfully.`,
      });
      setShowModal(false);
      fetchPlans();
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to save subscription plan.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link
            href="/superadmin/subscriptions"
            className="hover:text-slate-900 transition flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Subscriptions</span>
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">SaaS Plans</span>
        </div>
        <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              SaaS Subscription Plans
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Commercial plan configurations defining feature limits, order thresholds, and pricing intervals for laboratories.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-600 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create SaaS Plan</span>
          </button>
        </div>
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

      {/* Plans Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 text-slate-500">
            <RefreshCw className="h-6 w-6 animate-spin text-sky-500" />
            <span className="mt-3 text-sm">Loading SaaS plans...</span>
          </div>
        ) : plans.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No subscription plans configured. Click &quot;Create SaaS Plan&quot; to configure your first plan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-600">
                  <th className="py-3 px-4">Plan Name</th>
                  <th className="py-3 px-4">Plan Code</th>
                  <th className="py-3 px-4">Monthly (₹)</th>
                  <th className="py-3 px-4">Annual (₹)</th>
                  <th className="py-3 px-4">Trial</th>
                  <th className="py-3 px-4">Limits & Features</th>
                  <th className="py-3 px-4">Subscribers</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {plans.map((p) => (
                  <tr key={p.id} className="transition hover:bg-slate-50/60">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div>
                        <span>{p.name}</span>
                        {p.description && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{p.description}</p>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                        {p.code}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      ₹{p.priceMonthly.toLocaleString("en-IN")}
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      ₹{p.priceYearly.toLocaleString("en-IN")}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      14 days
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      <div className="space-y-0.5">
                        <p>{p.maxOrdersPerMonth ? `${p.maxOrdersPerMonth} orders/mo` : "Unlimited orders"}</p>
                        <p className="text-slate-400">{p.maxStaffAccounts} staff seats</p>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {p.subscriberCount}
                    </td>

                    <td className="py-3.5 px-4">
                      <SuperadminStatusBadge status={p.isActive ? "ACTIVE" : "INACTIVE"} />
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                        >
                          <Edit className="h-3 w-3 text-slate-500" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(p)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-medium border transition cursor-pointer ${
                            p.isActive
                              ? "border-rose-200 bg-rose-50/50 text-rose-700 hover:bg-rose-100"
                              : "border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                        >
                          {p.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Plan Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 space-y-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingPlan ? `Edit SaaS Plan (${editingPlan.name})` : "Create New SaaS Plan"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure commercial terms, platform limits, and billing intervals.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Plan Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Growth"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700">Plan Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="PLAN_GROWTH"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 font-mono focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700">Description</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Ideal for growing diagnostic laboratories..."
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Monthly Price (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.priceMonthly}
                    onChange={(e) => setFormData({ ...formData, priceMonthly: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Annual Price (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.priceYearly}
                    onChange={(e) => setFormData({ ...formData, priceYearly: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Free Trial Days
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.trialDays}
                    onChange={(e) => setFormData({ ...formData, trialDays: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Monthly Order Limit (blank = unlimited)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maxOrdersPerMonth ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxOrdersPerMonth: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    placeholder="Unlimited"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Staff Accounts Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxStaffAccounts}
                    onChange={(e) =>
                      setFormData({ ...formData, maxStaffAccounts: Number(e.target.value) })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2 space-y-2 pt-2 border-t border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.customBrandingEnabled}
                      onChange={(e) =>
                        setFormData({ ...formData, customBrandingEnabled: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
                    />
                    <span className="text-xs font-medium text-slate-700">
                      Enable Custom Store Branding
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.geminiPrescriptionAiEnabled}
                      onChange={(e) =>
                        setFormData({ ...formData, geminiPrescriptionAiEnabled: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
                    />
                    <span className="text-xs font-medium text-slate-700">
                      Enable Prescription Vision AI
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
                    />
                    <span className="text-xs font-medium text-slate-700">
                      Active (Visible to Lab Owners for Subscription)
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-sky-500 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-600 transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingPlan ? "Save Changes" : "Create Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
