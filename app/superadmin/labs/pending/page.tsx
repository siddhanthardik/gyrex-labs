import React from "react";
import Link from "next/link";
import { getAllLabs } from "@/services/superadmin/labs-service";
import { SuperadminEmptyState } from "@/components/superadmin/SuperadminEmptyState";
import { LabStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function SuperadminPendingLabsPage() {
  const { labs, total } = await getAllLabs({
    status: LabStatus.PENDING_VERIFICATION,
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
          <span className="text-zinc-200">Pending Verification</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
          Laboratory Verification Queue ({total})
        </h1>
        <p className="mt-1 text-xs text-zinc-400">
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
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-950 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="px-4 py-3">Lab Name & Code</th>
                <th className="px-4 py-3">City & State</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Tests Ready</th>
                <th className="px-4 py-3">Registered Date</th>
                <th className="px-4 py-3 text-right">Review Action</th>
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
                    <p>{lab.phone}</p>
                    <p className="text-[10px] text-zinc-500">{lab.email}</p>
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {lab.testsCount} tests
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {new Date(lab.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/superadmin/labs/${lab.id}`}
                      className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-sm"
                    >
                      Review & Verify →
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
