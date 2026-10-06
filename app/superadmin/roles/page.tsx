import React from "react";
import Link from "next/link";
import { getRolePermissionsMatrix } from "@/services/superadmin/users-service";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default function SuperadminRolesPage() {
  const matrix = getRolePermissionsMatrix();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/superadmin/users" className="inline-flex items-center gap-1 hover:text-slate-900 transition">
            <ArrowLeft className="h-3.5 w-3.5" />
            Platform Users
          </Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">Roles & Permissions Matrix</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          Platform RBAC & Permissions Architecture
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Formal system roles governing platform and laboratory operations. Permissions are strictly checked server-side.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {matrix.map((r) => (
          <div key={r.role} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-slate-900">{r.role}</span>
                {r.isPlatform ? (
                  <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700 border border-sky-200">
                    PLATFORM ROLE
                  </span>
                ) : (
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                    TENANT ROLE
                  </span>
                )}
              </div>

              <p className="mt-2 text-xs text-slate-600">{r.description}</p>

              <div className="mt-4 pt-3 border-t border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Default Granted Permissions
                </p>
                <div className="flex flex-wrap gap-1">
                  {r.permissions.map((p) => (
                    <span
                      key={p}
                      className="font-mono text-[10px] rounded bg-slate-50 px-1.5 py-0.5 text-slate-700 border border-slate-200"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
              <span>Tenant Scope: {r.isPlatform ? "Global Platform" : "Isolated to single lab"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
