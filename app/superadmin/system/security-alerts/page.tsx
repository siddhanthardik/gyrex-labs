import React from "react";
import Link from "next/link";
import { getSecurityAlerts } from "@/services/superadmin/system-service";
import { SuperadminEmptyState } from "@/components/superadmin/SuperadminEmptyState";

export const dynamic = "force-dynamic";

export default async function SuperadminSecurityAlertsPage() {
  const alerts = await getSecurityAlerts();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Link href="/superadmin/system/audit-logs" className="hover:text-white transition">
            ← Audit Logs
          </Link>
          <span>/</span>
          <span className="text-zinc-200">Security Alerts</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <span>🚨 Platform Security & Traversal Alerts ({alerts.length})</span>
        </h1>
        <p className="mt-1 text-xs text-zinc-400">
          Real-time intrusion detection capturing cross-tenant traversal attempts, unauthorized Superadmin access, and brute-force events.
        </p>
      </div>

      {alerts.length === 0 ? (
        <SuperadminEmptyState
          title="Security Perimeter Intact"
          description="Zero unauthorized cross-tenant traversal or brute force alerts recorded."
          icon="🛡️"
          actionText="View Audit Logs"
          actionHref="/superadmin/system/audit-logs"
        />
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="rounded-2xl border border-rose-900/60 bg-rose-950/20 p-5 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-rose-400">
                  {alert.action} • {alert.entityType}
                </span>
                <span className="text-[11px] text-zinc-500 font-mono">
                  {new Date(alert.createdAt).toLocaleString()}
                </span>
              </div>

              <div className="text-xs">
                <span className="text-zinc-400">Actor: </span>
                <span className="font-semibold text-white">{alert.actorName}</span>{" "}
                <span className="text-zinc-500 font-mono">({alert.actorRole})</span>
                {alert.labName && (
                  <span className="text-zinc-400 ml-2">
                    Tenant: <span className="text-zinc-200">{alert.labName}</span>
                  </span>
                )}
              </div>

              <div className="rounded-xl border border-zinc-900 bg-zinc-950 p-3 text-[11px] font-mono text-zinc-300">
                {alert.metadata ? JSON.stringify(alert.metadata, null, 2) : "No metadata recorded."}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
