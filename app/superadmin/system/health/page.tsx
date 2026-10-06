import React from "react";
import { getSystemHealth } from "@/services/superadmin/system-service";
import { SuperadminStatusBadge } from "@/components/superadmin/SuperadminStatusBadge";

export const dynamic = "force-dynamic";

export default async function SuperadminHealthPage() {
  const { services } = await getSystemHealth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Platform System & Infrastructure Health</h1>
        <p className="mt-1 text-xs text-slate-500">
          Real-time status monitoring for core services, database connections, and external communication gateways.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {services.map((svc) => (
          <div key={svc.name} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {svc.category}
                </span>
                <SuperadminStatusBadge status={svc.status} />
              </div>

              <h2 className="text-sm font-bold text-slate-900 mt-3">{svc.name}</h2>
              <p className="text-xs text-slate-600 mt-1">{svc.notes}</p>
            </div>

            {svc.latencyMs !== undefined && (
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Query Latency:</span>
                <span className="font-semibold text-emerald-600">{svc.latencyMs} ms</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
