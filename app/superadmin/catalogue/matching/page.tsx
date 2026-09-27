import React from "react";
import Link from "next/link";
import { getCatalogueMatchingOverview } from "@/services/superadmin/testmaster-service";

export const dynamic = "force-dynamic";

export default async function SuperadminCatalogueMatchingPage() {
  const data = await getCatalogueMatchingOverview();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Link href="/superadmin/catalogue/test-master" className="hover:text-white transition">
            ← Catalogue
          </Link>
          <span>/</span>
          <span className="text-zinc-200">Matching Oversight</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
          Catalogue Import & Master Matching Centre
        </h1>
        <p className="mt-1 text-xs text-zinc-400">
          Platform visibility into laboratory bulk test imports and mapping rates against the Gyrex Test Master.
        </p>
      </div>

      {/* Summary KPI Banner */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <span className="text-xs font-medium uppercase text-zinc-400">Standard Test Master Database</span>
          <p className="text-2xl font-bold text-white mt-2">{data.totalMasterTests} tests</p>
          <p className="text-xs text-zinc-500 mt-1">Available for partner lab catalogue adoption</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <span className="text-xs font-medium uppercase text-zinc-400">Partner Laboratories Inspected</span>
          <p className="text-2xl font-bold text-indigo-400 mt-2">{data.activeLabsCount} labs</p>
          <p className="text-xs text-zinc-500 mt-1">Live digital storefronts cataloguing tests</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <span className="text-xs font-medium uppercase text-zinc-400">Automated Match Engine</span>
          <p className="text-2xl font-bold text-emerald-400 mt-2">Active</p>
          <p className="text-xs text-zinc-500 mt-1">Normalized LOINC + fuzzy string match algorithms</p>
        </div>
      </div>

      {/* Laboratories Catalogue Health Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
          Laboratory Catalogue Coverage & Matching Health
        </h2>

        {data.labs.length === 0 ? (
          <p className="text-xs text-zinc-500 py-6 text-center">No partner laboratories catalogued yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 bg-zinc-900 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Laboratory</th>
                  <th className="px-4 py-3">Tests in Catalogue</th>
                  <th className="px-4 py-3">Master Coverage</th>
                  <th className="px-4 py-3">Matching Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {data.labs.map((lab) => (
                  <tr key={lab.labId} className="hover:bg-zinc-900/40 transition">
                    <td className="px-4 py-3 font-semibold text-white">
                      {lab.labName}
                      <p className="text-[10px] text-zinc-500 font-mono">/{lab.labSlug}</p>
                    </td>
                    <td className="px-4 py-3 font-mono">{lab.cataloguedTestsCount} active tests</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${lab.coveragePercentage}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-zinc-400">{lab.coveragePercentage}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-950/80 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-800/60">
                        ✓ SYNCHRONIZED
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/superadmin/labs/${lab.labId}`}
                        className="rounded border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[11px] font-medium text-zinc-200 hover:bg-zinc-700 transition"
                      >
                        Inspect Lab →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
