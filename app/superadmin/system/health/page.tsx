import React from "react";
import { getSystemHealth } from "@/services/superadmin/system-service";
import { SuperadminStatusBadge } from "@/components/superadmin/SuperadminStatusBadge";

export const dynamic = "force-dynamic";

export default async function SuperadminHealthPage() {
  const { services } = await getSystemHealth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Platform System & Infrastructure Health</h1>
        <p className="mt-1 text-xs text-zinc-400">
          Real-time status monitoring for core services, database connections, and external communication gateways.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {services.map((svc) => (
          <div key={svc.name} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  {svc.category}
                </span>
                <SuperadminStatusBadge status={svc.status} />
              </div>

              <h2 className="text-sm font-bold text-white mt-3">{svc.name}</h2>
              <p className="text-xs text-zinc-400 mt-1">{svc.notes}</p>
            </div>

            {svc.latencyMs !== undefined && (
              <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
                <span className="text-zinc-500">Query Latency:</span>
                <span className="font-mono text-emerald-400">{svc.latencyMs} ms</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
