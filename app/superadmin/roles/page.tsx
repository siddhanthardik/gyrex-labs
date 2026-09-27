import React from "react";
import Link from "next/link";
import { getRolePermissionsMatrix } from "@/services/superadmin/users-service";

export const dynamic = "force-dynamic";

export default function SuperadminRolesPage() {
  const matrix = getRolePermissionsMatrix();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Link href="/superadmin/users" className="hover:text-white transition">
            ← Platform Users
          </Link>
          <span>/</span>
          <span className="text-zinc-200">Roles & Permissions Matrix</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
          Platform RBAC & Permissions Architecture
        </h1>
        <p className="mt-1 text-xs text-zinc-400">
          Formal system roles governing platform and laboratory operations. Permissions are strictly checked server-side.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {matrix.map((r) => (
          <div key={r.role} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-white">{r.role}</span>
                {r.isPlatform ? (
                  <span className="rounded bg-indigo-950/80 px-2 py-0.5 text-[10px] font-bold text-indigo-400 border border-indigo-800/60">
                    PLATFORM ROLE
                  </span>
                ) : (
                  <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-zinc-400 border border-zinc-700">
                    TENANT ROLE
                  </span>
                )}
              </div>

              <p className="mt-2 text-xs text-zinc-400">{r.description}</p>

              <div className="mt-4 pt-3 border-t border-zinc-800/80">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Default Granted Permissions
                </p>
                <div className="flex flex-wrap gap-1">
                  {r.permissions.map((p) => (
                    <span
                      key={p}
                      className="font-mono text-[10px] rounded bg-zinc-950 px-1.5 py-0.5 text-zinc-300 border border-zinc-800"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-zinc-800/60 text-[10px] text-zinc-500 flex items-center justify-between">
              <span>Tenant Scope: {r.isPlatform ? "Global Platform" : "Isolated to single lab"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
