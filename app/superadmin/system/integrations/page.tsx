import React from "react";
import { getIntegrationsStatus } from "@/services/superadmin/system-service";

export const dynamic = "force-dynamic";

export default async function SuperadminIntegrationsPage() {
  const integrations = await getIntegrationsStatus();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">External Platform Integrations ({integrations.length})</h1>
        <p className="mt-1 text-xs text-zinc-400">
          Visibility into external API keys, storage backends, AI investigation extractors, and payment channels.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {integrations.map((item) => (
          <div key={item.name} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                {item.type}
              </span>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-bold border ${
                  item.configured
                    ? "bg-emerald-950/80 text-emerald-400 border-emerald-800/60"
                    : "bg-zinc-800 text-zinc-400 border-zinc-700"
                }`}
              >
                {item.configured ? "CONFIGURED" : "PENDING SETUP"}
              </span>
            </div>

            <h2 className="text-base font-bold text-white">{item.name}</h2>
            <p className="text-xs text-zinc-400">{item.description}</p>

            <div className="rounded-xl border border-zinc-900 bg-zinc-950 p-3 space-y-1 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-500">Environment:</span>
                <span className="text-zinc-300">{item.environment}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Masked Identifier:</span>
                <span className="text-zinc-300">{item.maskedKey}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
