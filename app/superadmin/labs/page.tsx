import React from "react";
import Link from "next/link";
import { getAllLabs } from "@/services/superadmin/labs-service";
import { SuperadminStatusBadge } from "@/components/superadmin/SuperadminStatusBadge";
import { SuperadminEmptyState } from "@/components/superadmin/SuperadminEmptyState";
import { LabStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    city?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function SuperadminLabsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.search;
  const city = params.city;
  const statusParam = params.status;
  const page = params.page ? parseInt(params.page, 10) : 1;

  let status: LabStatus | undefined;
  if (statusParam && Object.values(LabStatus).includes(statusParam as LabStatus)) {
    status = statusParam as LabStatus;
  }

  const { labs, total, totalPages } = await getAllLabs({
    search,
    city,
    status,
    page,
    pageSize: 20,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Diagnostic Laboratories</h1>
          <p className="mt-1 text-xs text-slate-500">
            Platform-wide governance directory of all registered diagnostic laboratory tenants.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/superadmin/labs/pending"
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition"
          >
            ⏳ Verification Queue
          </Link>
          <Link
            href="/superadmin/labs/suspended"
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 transition"
          >
            🚫 Suspended Labs
          </Link>
        </div>
      </div>

      {/* Filters Bar */}
      <form method="GET" className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-4 shadow-xs">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Search Laboratory
          </label>
          <input
            type="text"
            name="search"
            defaultValue={search || ""}
            placeholder="Name, city, code..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Filter by Status
          </label>
          <select
            name="status"
            defaultValue={status || ""}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="PENDING_VERIFICATION">PENDING_VERIFICATION</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            City
          </label>
          <input
            type="text"
            name="city"
            defaultValue={city || ""}
            placeholder="e.g. Mumbai, Delhi..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none"
          />
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-lg bg-sky-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-sky-600 transition shadow-xs"
          >
            Apply Filters
          </button>
        </div>
      </form>

      {/* Labs Table */}
      {labs.length === 0 ? (
        <SuperadminEmptyState
          title="No Laboratories Found"
          description="No laboratories matched your search parameters. Try adjusting your filters."
          actionText="Clear Filters"
          actionHref="/superadmin/labs"
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Lab Name & Code</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Store Status</th>
                <th className="px-4 py-3">Verification</th>
                <th className="px-4 py-3">Catalogue</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">SaaS Plan</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {labs.map((lab) => (
                <tr key={lab.id} className="hover:bg-slate-50/75 transition">
                  <td className="px-4 py-3">
                    <Link
                      href={`/superadmin/labs/${lab.id}`}
                      className="font-semibold text-slate-900 hover:text-sky-700 transition"
                    >
                      {lab.name}
                    </Link>
                    <p className="text-[11px] text-slate-500 font-mono">{lab.code} • {lab.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-800">{lab.city}</p>
                    <p className="text-[10px] text-slate-500">{lab.state}</p>
                  </td>
                  <td className="px-4 py-3">
                    <SuperadminStatusBadge status={lab.status} />
                  </td>
                  <td className="px-4 py-3">
                    {lab.isVerified ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                        ✓ Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                        ⏳ Unverified
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {lab.testsCount} tests
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {lab.ordersCount} orders
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-800">{lab.subscriptionPlan}</span>
                    <p className="text-[10px] text-slate-500">{lab.subscriptionStatus}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/superadmin/labs/${lab.id}`}
                      className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition"
                    >
                      Inspect →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-medium text-slate-900">{labs.length}</span> of{" "}
              <span className="font-medium text-slate-900">{total}</span> labs
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                {page > 1 && (
                  <Link
                    href={`/superadmin/labs?page=${page - 1}`}
                    className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    Previous
                  </Link>
                )}
                <span>Page {page} of {totalPages}</span>
                {page < totalPages && (
                  <Link
                    href={`/superadmin/labs?page=${page + 1}`}
                    className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    Next
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
