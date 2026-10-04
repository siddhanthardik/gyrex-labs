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
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Platform Patient Directory ({total})</h1>
        <p className="mt-1 text-xs text-slate-500">
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
          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none shadow-sm"
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
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-600">
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
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {patients.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {p.fullName}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono text-slate-900">{p.phone}</p>
                    <p className="text-[10px] text-slate-500">{p.email || "No email"}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.gender} {p.ageYears ? `• ${p.ageYears} yrs` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.labsUsed.map((lu) => (
                        <Link
                          key={lu.labId}
                          href={`/superadmin/labs/${lu.labId}`}
                          className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-slate-100 transition"
                        >
                          {lu.labName} ({lu.ordersCount})
                        </Link>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                    {p.totalOrdersCount}
                  </td>
                  <td className="px-4 py-3 font-mono font-medium text-sky-700">
                    {p.totalReportsCount} released
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-[11px]">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-4 py-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-medium text-slate-900">{patients.length}</span> of{" "}
              <span className="font-medium text-slate-900">{total}</span> patients
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
