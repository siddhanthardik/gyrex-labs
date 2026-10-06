import React from "react";
import Link from "next/link";
import { getCatalogueMatchingOverview } from "@/services/superadmin/testmaster-service";

export const dynamic = "force-dynamic";

export default async function SuperadminCatalogueMatchingPage() {
  const data = await getCatalogueMatchingOverview();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/superadmin/catalogue/test-master" className="hover:text-slate-900 transition">
            ← Catalogue
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-700 font-medium">Matching Oversight</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          Catalogue Import & Master Matching Centre
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Platform visibility into laboratory bulk test imports and mapping rates against the Gyrex Test Master.
        </p>
      </div>

      {/* Summary KPI Banner */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Standard Test Master Database</span>
          <p className="text-2xl font-bold text-slate-900 mt-2">{data.totalMasterTests} tests</p>
          <p className="text-xs text-slate-500 mt-1">Available for partner lab catalogue adoption</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Partner Laboratories Inspected</span>
          <p className="text-2xl font-bold text-sky-700 mt-2">{data.activeLabsCount} labs</p>
          <p className="text-xs text-slate-500 mt-1">Live digital storefronts cataloguing tests</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Automated Match Engine</span>
          <p className="text-2xl font-bold text-emerald-700 mt-2">Active</p>
          <p className="text-xs text-slate-500 mt-1">Normalized LOINC + fuzzy string match algorithms</p>
        </div>
      </div>

      {/* Laboratories Catalogue Health Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Laboratory Catalogue Coverage & Matching Health
        </h2>

        {data.labs.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">No partner laboratories catalogued yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Laboratory</th>
                  <th className="px-4 py-3">Tests in Catalogue</th>
                  <th className="px-4 py-3">Master Coverage</th>
                  <th className="px-4 py-3">Matching Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {data.labs.map((lab) => (
                  <tr key={lab.labId} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {lab.labName}
                      <p className="text-[10px] text-slate-500 font-mono">/{lab.labSlug}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-800">{lab.cataloguedTestsCount} active tests</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full bg-sky-500 rounded-full"
                            style={{ width: `${lab.coveragePercentage}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-slate-600">{lab.coveragePercentage}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                        ✓ SYNCHRONIZED
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/superadmin/labs/${lab.labId}`}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition shadow-2xs"
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
