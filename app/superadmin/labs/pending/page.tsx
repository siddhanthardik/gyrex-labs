import React from "react";
import Link from "next/link";
import { getAllLabs } from "@/services/superadmin/labs-service";
import { SuperadminEmptyState } from "@/components/superadmin/SuperadminEmptyState";
import { LabStatus } from "@prisma/client";
import { ArrowLeft, Building2, ChevronRight, Phone } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SuperadminPendingLabsPage() {
  const { labs, total } = await getAllLabs({
    status: LabStatus.PENDING_VERIFICATION,
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
          <span className="text-slate-700 font-medium">Pending Verification</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          Laboratory Verification Queue ({total})
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Newly registered diagnostic laboratories requiring credential and operational verification before public launch.
        </p>
      </div>

      {labs.length === 0 ? (
        <SuperadminEmptyState
          title="Verification Queue Clear"
          description="There are currently no laboratories awaiting verification review."
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
                  <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                    Pending
                  </span>
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <p>{lab.city}, {lab.state}</p>
                  <p className="text-slate-500">{lab.phone} • {lab.email}</p>
                  <p className="font-mono text-slate-700">{lab.testsCount} tests ready</p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    {new Date(lab.createdAt).toLocaleDateString()}
                  </span>
                  <Link
                    href={`/superadmin/labs/${lab.id}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 transition shadow-xs"
                  >
                    Review & Verify
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
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Tests Ready</th>
                    <th className="px-4 py-3">Registered Date</th>
                    <th className="px-4 py-3 text-right">Review Action</th>
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
                        <p className="text-slate-800">{lab.phone}</p>
                        <p className="text-[10px] text-slate-400">{lab.email}</p>
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-slate-700">
                        {lab.testsCount} tests
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(lab.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/superadmin/labs/${lab.id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 transition shadow-xs"
                        >
                          Review & Verify
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
