import React from "react";
import Link from "next/link";
import { getAuditLogs } from "@/services/superadmin/system-service";
import { SuperadminStatusBadge } from "@/components/superadmin/SuperadminStatusBadge";
import { SuperadminEmptyState } from "@/components/superadmin/SuperadminEmptyState";
import { AuditAction } from "@prisma/client";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    action?: string;
    entityType?: string;
    page?: string;
  }>;
}

export default async function SuperadminAuditLogsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.search;
  const actionParam = params.action;
  const entityType = params.entityType;
  const page = params.page ? parseInt(params.page, 10) : 1;

  let action: AuditAction | undefined;
  if (actionParam && Object.values(AuditAction).includes(actionParam as AuditAction)) {
    action = actionParam as AuditAction;
  }

  const { logs, total, totalPages } = await getAuditLogs({
    search,
    action,
    entityType,
    page,
    pageSize: 25,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Immutable Platform Audit Logs ({total})</h1>
          <p className="mt-1 text-xs text-zinc-400">
            Append-only security and operational audit trail capturing all administrative mutations and security events.
          </p>
        </div>

        <Link
          href="/superadmin/system/security-alerts"
          className="rounded-lg border border-rose-800/80 bg-rose-950/40 px-3.5 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-900/40 transition"
        >
          🚨 View Security Alerts
        </Link>
      </div>

      {/* Filters */}
      <form method="GET" className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 sm:grid-cols-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
            Search Logs
          </label>
          <input
            type="text"
            name="search"
            defaultValue={search || ""}
            placeholder="Entity ID, role, type..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
            Action Type
          </label>
          <select
            name="action"
            defaultValue={action || ""}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Actions</option>
            {Object.values(AuditAction).map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
            Entity Type
          </label>
          <input
            type="text"
            name="entityType"
            defaultValue={entityType || ""}
            placeholder="e.g. Lab, Report, Order..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-sm"
          >
            Filter Logs
          </button>
        </div>
      </form>

      {/* Logs Table */}
      {logs.length === 0 ? (
        <SuperadminEmptyState
          title="No Audit Logs Found"
          description="No audit records match your query."
          actionText="Clear Filters"
          actionHref="/superadmin/system/audit-logs"
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-950 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Actor & Role</th>
                <th className="px-4 py-3">Target Entity</th>
                <th className="px-4 py-3">Lab Context</th>
                <th className="px-4 py-3">Metadata Snapshot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-800/30 transition">
                  <td className="px-4 py-3 text-zinc-400 font-mono text-[11px]">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <SuperadminStatusBadge status={log.action} />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-white">{log.actorName}</p>
                    <p className="font-mono text-[10px] text-zinc-500">{log.actorRole}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-zinc-200">{log.entityType}</span>
                    <p className="font-mono text-[10px] text-zinc-500">{log.entityId}</p>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {log.labName ? (
                      <Link href={`/superadmin/labs/${log.labId}`} className="hover:text-indigo-400 transition">
                        {log.labName}
                      </Link>
                    ) : (
                      <span className="text-zinc-600">Global</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-zinc-400 max-w-xs truncate">
                    {log.metadata ? JSON.stringify(log.metadata) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950 px-4 py-3 text-xs text-zinc-400">
            <div>
              Showing <span className="font-medium text-white">{logs.length}</span> of{" "}
              <span className="font-medium text-white">{total}</span> events
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
