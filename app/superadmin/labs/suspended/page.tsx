import React from "react";
import Link from "next/link";
import { getAllLabs } from "@/services/superadmin/labs-service";
import { SuperadminEmptyState } from "@/components/superadmin/SuperadminEmptyState";
import { SuperadminStatusBadge } from "@/components/superadmin/SuperadminStatusBadge";
import { LabStatus } from "@prisma/client";
import { ArrowLeft, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SuperadminSuspendedLabsPage() {
  const { labs, total } = await getAllLabs({
    status: LabStatus.SUSPENDED,
    pageSize: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/superadmin/labs" className="inline-flex items-center gap-1 hover:text-slate-900 transition">
            <ArrowLeft className="h-3.5 w-3.5" />
            Laboratories
          </Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">Suspended Laboratories</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          Suspended Laboratories ({total})
        </h1>
        <p className="mt-1 text-xs text-slate-500">
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
        <div className="space-y-4">
          {/* Mobile Card List */}
          <div className="grid grid-cols-1 gap-3 sm:hidden">
            {labs.map((lab) => (
              <div key={lab.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">{lab.name}</h3>
                    <p className="text-[10px] text-slate-400 font-mono">{lab.code}</p>
                  </div>
                  <SuperadminStatusBadge status={lab.status} />
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <p>{lab.city}, {lab.state}</p>
                  <p className="text-slate-500">Plan: {lab.subscriptionPlan} ({lab.subscriptionStatus})</p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                  <Link
                    href={`/superadmin/labs/${lab.id}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition shadow-2xs"
                  >
                    Inspect & Reactivate
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Lab Name & Code</th>
                    <th className="px-4 py-3">City & State</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Subscription</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {labs.map((lab) => (
                    <tr key={lab.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {lab.name}
                        <p className="text-[10px] text-slate-400 font-mono">{lab.code}</p>
                      </td>
                      <td className="px-4 py-3">
                        {lab.city}, {lab.state}
                      </td>
                      <td className="px-4 py-3">
                        <SuperadminStatusBadge status={lab.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {lab.subscriptionPlan} ({lab.subscriptionStatus})
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/superadmin/labs/${lab.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition shadow-2xs"
                        >
                          Inspect & Reactivate
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
