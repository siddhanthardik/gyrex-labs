import React from "react";
import Link from "next/link";
import { getAllLabs } from "@/services/superadmin/labs-service";
import { SuperadminEmptyState } from "@/components/superadmin/SuperadminEmptyState";
import { SuperadminStatusBadge } from "@/components/superadmin/SuperadminStatusBadge";
import { LabStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function SuperadminSuspendedLabsPage() {
  const { labs, total } = await getAllLabs({
    status: LabStatus.SUSPENDED,
    pageSize: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Link href="/superadmin/labs" className="hover:text-white transition">
            ← Laboratories
          </Link>
          <span>/</span>
          <span className="text-zinc-200">Suspended Laboratories</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
          Suspended Laboratories ({total})
        </h1>
        <p className="mt-1 text-xs text-zinc-400">
          Laboratories with suspended storefront operations due to compliance, non-payment, or administrative action.
        </p>
      </div>

      {labs.length === 0 ? (
        <SuperadminEmptyState
          title="No Suspended Laboratories"
          description="All active diagnostic partner storefronts are currently operating without platform suspension."
          actionText="View All Labs"
          actionHref="/superadmin/labs"
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-950 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="px-4 py-3">Lab Name & Code</th>
                <th className="px-4 py-3">City & State</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Subscription</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {labs.map((lab) => (
                <tr key={lab.id} className="hover:bg-zinc-800/30 transition">
                  <td className="px-4 py-3 font-semibold text-white">
                    {lab.name}
                    <p className="text-[10px] text-zinc-500 font-mono">{lab.code}</p>
                  </td>
                  <td className="px-4 py-3">
                    {lab.city}, {lab.state}
                  </td>
                  <td className="px-4 py-3">
                    <SuperadminStatusBadge status={lab.status} />
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {lab.subscriptionPlan} ({lab.subscriptionStatus})
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/superadmin/labs/${lab.id}`}
                      className="inline-flex items-center rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition"
                    >
                      Inspect & Reactivate →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
