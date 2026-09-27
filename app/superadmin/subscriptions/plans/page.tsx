import React from "react";
import Link from "next/link";
import { getSubscriptionPlans } from "@/services/superadmin/subscriptions-service";
import { SuperadminStatusBadge } from "@/components/superadmin/SuperadminStatusBadge";

export const dynamic = "force-dynamic";

export default async function SuperadminSubscriptionPlansPage() {
  const plans = await getSubscriptionPlans();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Link href="/superadmin/subscriptions" className="hover:text-white transition">
            ← Subscriptions
          </Link>
          <span>/</span>
          <span className="text-zinc-200">SaaS Plans</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">Gyrex SaaS Subscription Plans</h1>
        <p className="mt-1 text-xs text-zinc-400">
          Commercial tier configurations defining feature limits, order thresholds, and billing intervals.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {plans.map((p) => (
          <div key={p.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">{p.name}</h2>
                <SuperadminStatusBadge status={p.isActive ? "ACTIVE" : "INACTIVE"} />
              </div>
              <p className="font-mono text-[11px] text-indigo-400 mt-0.5">{p.code}</p>
              <p className="text-xs text-zinc-400 mt-2">{p.description || "Commercial SaaS tier"}</p>

              <div className="mt-5 border-y border-zinc-800 py-3">
                <span className="text-2xl font-bold text-white">₹{p.priceMonthly.toLocaleString()}</span>
                <span className="text-xs text-zinc-400"> / month</span>
                <p className="text-[11px] text-zinc-500">₹{p.priceYearly.toLocaleString()} billed annually</p>
              </div>

              <div className="mt-4 space-y-2 text-xs text-zinc-300">
                <div className="flex items-center justify-between">
                  <span>Order Limit:</span>
                  <span className="font-semibold text-white">
                    {p.maxOrdersPerMonth ? `${p.maxOrdersPerMonth} orders/mo` : "Unlimited"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Staff Seats:</span>
                  <span className="font-semibold text-white">{p.maxStaffAccounts} seats</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Prescription Vision AI:</span>
                  <span className={p.geminiPrescriptionAiEnabled ? "text-emerald-400 font-semibold" : "text-zinc-500"}>
                    {p.geminiPrescriptionAiEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Custom Store Branding:</span>
                  <span className={p.customBrandingEnabled ? "text-emerald-400 font-semibold" : "text-zinc-500"}>
                    {p.customBrandingEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between text-xs">
              <span className="text-zinc-500">{p.subscriberCount} active subscribers</span>
              <span className="font-mono text-zinc-400">Order: {p.displayOrder}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
