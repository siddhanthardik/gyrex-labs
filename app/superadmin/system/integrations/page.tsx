import React from "react";
import { getIntegrationsStatus } from "@/services/superadmin/system-service";

export const dynamic = "force-dynamic";

export default async function SuperadminIntegrationsPage() {
  const integrations = await getIntegrationsStatus();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">External Platform Integrations ({integrations.length})</h1>
        <p className="mt-1 text-xs text-slate-500">
          Visibility into external API keys, storage backends, prescription investigation extractors, and payment channels.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {integrations.map((item) => (
          <div key={item.name} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700">
                {item.type}
              </span>
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                  item.configured
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                {item.configured ? "CONFIGURED" : "PENDING SETUP"}
              </span>
            </div>

            <h2 className="text-base font-bold text-slate-900">
              {item.name.toLowerCase().includes("gemini") ? "Gemini Integration" : item.name}
            </h2>
            <p className="text-xs text-slate-600">{item.description}</p>

            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-1 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Environment:</span>
                <span className="text-slate-800 font-semibold">{item.environment}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Masked Identifier:</span>
                <span className="text-slate-800">{item.maskedKey}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
