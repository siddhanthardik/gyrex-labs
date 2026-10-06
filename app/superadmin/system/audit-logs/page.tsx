import React from "react";
import Link from "next/link";
import { getAuditLogs } from "@/services/superadmin/system-service";
import { SuperadminStatusBadge } from "@/components/superadmin/SuperadminStatusBadge";
import { SuperadminEmptyState } from "@/components/superadmin/SuperadminEmptyState";
import { AuditAction } from "@prisma/client";
import { ShieldAlert } from "lucide-react";

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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Immutable Platform Audit Logs ({total})</h1>
          <p className="mt-1 text-xs text-slate-500">
            Append-only security and operational audit trail capturing all administrative mutations and security events.
          </p>
        </div>

        <Link
          href="/superadmin/system/security-alerts"
          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition shadow-2xs"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>View Security Alerts</span>
        </Link>
      </div>

      {/* Filters */}
      <form method="GET" className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:grid-cols-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Search Logs
          </label>
          <input
            type="text"
            name="search"
            defaultValue={search || ""}
            placeholder="Entity ID, role, type..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Action Type
          </label>
          <select
            name="action"
            defaultValue={action || ""}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
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
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Entity Type
          </label>
          <input
            type="text"
            name="entityType"
            defaultValue={entityType || ""}
            placeholder="e.g. Lab, Report, Order..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-lg bg-sky-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-sky-600 transition shadow-xs"
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
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Actor & Role</th>
                  <th className="px-4 py-3">Target Entity</th>
                  <th className="px-4 py-3">Lab Context</th>
                  <th className="px-4 py-3">Metadata Snapshot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <SuperadminStatusBadge status={log.action} />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{log.actorName}</p>
                      <p className="font-mono text-[10px] text-slate-400">{log.actorRole}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-800 font-medium">{log.entityType}</span>
                      <p className="font-mono text-[10px] text-slate-400">{log.entityId}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {log.labName ? (
                        <Link href={`/superadmin/labs/${log.labId}`} className="hover:text-sky-600 transition">
                          {log.labName}
                        </Link>
                      ) : (
                        <span className="text-slate-400">Global</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] text-slate-500 max-w-xs truncate">
                      {log.metadata ? JSON.stringify(log.metadata) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-800">{logs.length}</span> of{" "}
              <span className="font-semibold text-slate-800">{total}</span> events
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
