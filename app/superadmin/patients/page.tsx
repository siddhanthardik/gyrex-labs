import React from "react";
import Link from "next/link";
import { getAllPlatformPatients } from "@/services/superadmin/patients-service";
import { SuperadminEmptyState } from "@/components/superadmin/SuperadminEmptyState";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    page?: string;
  }>;
}

export default async function SuperadminPatientsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.search;
  const page = params.page ? parseInt(params.page, 10) : 1;

  const { patients, total, totalPages } = await getAllPlatformPatients({
    search,
    page,
    pageSize: 20,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Platform Patient Directory ({total})</h1>
        <p className="mt-1 text-xs text-zinc-400">
          Cross-tenant operational view of registered diagnostic patients across all participating laboratories.
        </p>
      </div>

      {/* Search Input */}
      <form method="GET" className="max-w-md">
        <input
          type="text"
          name="search"
          defaultValue={search || ""}
          placeholder="Search by patient name, phone, or email..."
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900/80 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
        />
      </form>

      {/* Patients Table */}
      {patients.length === 0 ? (
        <SuperadminEmptyState
          title="No Patients Found"
          description="No patients match your search criteria."
          actionText="Clear Search"
          actionHref="/superadmin/patients"
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-950 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="px-4 py-3">Patient Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Demographics</th>
                <th className="px-4 py-3">Laboratories Used</th>
                <th className="px-4 py-3">Total Bookings</th>
                <th className="px-4 py-3">Reports</th>
                <th className="px-4 py-3">Member Since</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {patients.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-800/30 transition">
                  <td className="px-4 py-3 font-semibold text-white">
                    {p.fullName}
                  </td>
                  <td className="px-4 py-3">
                    <p>{p.phone}</p>
                    <p className="text-[10px] text-zinc-500">{p.email || "No email"}</p>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {p.gender} {p.ageYears ? `• ${p.ageYears} yrs` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.labsUsed.map((lu) => (
                        <Link
                          key={lu.labId}
                          href={`/superadmin/labs/${lu.labId}`}
                          className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-700 transition"
                        >
                          {lu.labName} ({lu.ordersCount})
                        </Link>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-white">
                    {p.totalOrdersCount}
                  </td>
                  <td className="px-4 py-3 font-mono text-indigo-400">
                    {p.totalReportsCount} released
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-[11px]">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950 px-4 py-3 text-xs text-zinc-400">
            <div>
              Showing <span className="font-medium text-white">{patients.length}</span> of{" "}
              <span className="font-medium text-white">{total}</span> patients
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <span>Page {page} of {totalPages}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
