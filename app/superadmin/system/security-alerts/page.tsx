import React from "react";
import Link from "next/link";
import { getSecurityAlerts } from "@/services/superadmin/system-service";
import { SuperadminEmptyState } from "@/components/superadmin/SuperadminEmptyState";
import { ArrowLeft, ShieldAlert, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SuperadminSecurityAlertsPage() {
  const alerts = await getSecurityAlerts();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/superadmin/system/audit-logs" className="inline-flex items-center gap-1 hover:text-slate-900 transition">
            <ArrowLeft className="h-3.5 w-3.5" />
            Audit Logs
          </Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">Security Alerts</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-rose-600" />
          <span>Platform Security & Traversal Alerts ({alerts.length})</span>
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Real-time intrusion detection capturing cross-tenant traversal attempts, unauthorized Superadmin access, and brute-force events.
        </p>
      </div>

      {alerts.length === 0 ? (
        <SuperadminEmptyState
          title="Security Perimeter Intact"
          description="Zero unauthorized cross-tenant traversal or brute force alerts recorded."
          icon={<ShieldCheck className="w-8 h-8 text-emerald-500" />}
          actionText="View Audit Logs"
          actionHref="/superadmin/system/audit-logs"
        />
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="rounded-xl border border-rose-200 bg-rose-50/50 p-5 space-y-2 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-rose-700">
                  {alert.action} • {alert.entityType}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {new Date(alert.createdAt).toLocaleString()}
                </span>
              </div>

              <div className="text-xs">
                <span className="text-slate-500">Actor: </span>
                <span className="font-semibold text-slate-900">{alert.actorName}</span>{" "}
                <span className="text-slate-500 font-mono">({alert.actorRole})</span>
                {alert.labName && (
                  <span className="text-slate-500 ml-2">
                    Tenant: <span className="text-slate-800 font-medium">{alert.labName}</span>
                  </span>
                )}
              </div>

              <div className="rounded-lg border border-rose-200 bg-white p-3 text-[11px] font-mono text-slate-800 shadow-2xs">
                {alert.metadata ? JSON.stringify(alert.metadata, null, 2) : "No metadata recorded."}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
