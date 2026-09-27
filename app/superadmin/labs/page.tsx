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
          <h1 className="text-2xl font-bold tracking-tight text-white">Diagnostic Laboratories</h1>
          <p className="mt-1 text-xs text-zinc-400">
            Platform-wide governance directory of all registered diagnostic laboratory tenants.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/superadmin/labs/pending"
            className="rounded-lg border border-amber-800/80 bg-amber-950/40 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-900/40 transition"
          >
            ⏳ Verification Queue
          </Link>
          <Link
            href="/superadmin/labs/suspended"
            className="rounded-lg border border-rose-800/80 bg-rose-950/40 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-900/40 transition"
          >
            🚫 Suspended Labs
          </Link>
        </div>
      </div>

      {/* Filters Bar */}
      <form method="GET" className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 sm:grid-cols-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
            Search Laboratory
          </label>
          <input
            type="text"
            name="search"
            defaultValue={search || ""}
            placeholder="Name, city, code..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
            Filter by Status
          </label>
          <select
            name="status"
            defaultValue={status || ""}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="PENDING_VERIFICATION">PENDING_VERIFICATION</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
            City
          </label>
          <input
            type="text"
            name="city"
            defaultValue={city || ""}
            placeholder="e.g. Mumbai, Delhi..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-sm"
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
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-950 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
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
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {labs.map((lab) => (
                <tr key={lab.id} className="hover:bg-zinc-800/30 transition">
                  <td className="px-4 py-3">
                    <Link
                      href={`/superadmin/labs/${lab.id}`}
                      className="font-semibold text-white hover:text-indigo-400 transition"
                    >
                      {lab.name}
                    </Link>
                    <p className="text-[11px] text-zinc-500 font-mono">{lab.code} • {lab.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-zinc-200">{lab.city}</p>
                    <p className="text-[10px] text-zinc-500">{lab.state}</p>
                  </td>
                  <td className="px-4 py-3">
                    <SuperadminStatusBadge status={lab.status} />
                  </td>
                  <td className="px-4 py-3">
                    {lab.isVerified ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                        ✓ Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400">
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
                    <span className="font-semibold text-zinc-200">{lab.subscriptionPlan}</span>
                    <p className="text-[10px] text-zinc-500">{lab.subscriptionStatus}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/superadmin/labs/${lab.id}`}
                      className="inline-flex items-center rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[11px] font-medium text-zinc-200 hover:bg-zinc-700 transition"
                    >
                      Inspect →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950 px-4 py-3 text-xs text-zinc-400">
            <div>
              Showing <span className="font-medium text-white">{labs.length}</span> of{" "}
              <span className="font-medium text-white">{total}</span> labs
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                {page > 1 && (
                  <Link
                    href={`/superadmin/labs?page=${page - 1}`}
                    className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs hover:bg-zinc-800"
                  >
                    Previous
                  </Link>
                )}
                <span>Page {page} of {totalPages}</span>
                {page < totalPages && (
                  <Link
                    href={`/superadmin/labs?page=${page + 1}`}
                    className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs hover:bg-zinc-800"
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
