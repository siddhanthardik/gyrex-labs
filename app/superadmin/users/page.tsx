"use client";

import React, { useEffect, useState } from "react";
import { SuperadminStatusBadge } from "@/components/superadmin/SuperadminStatusBadge";
import { UserRole } from "@prisma/client";

interface UserItem {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  isPlatformUser: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  labMemberships: Array<{
    labId: string;
    labName: string;
    role: string;
  }>;
}

export default function SuperadminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<{
    email: string;
    fullName: string;
    phone: string;
    role: UserRole;
    tempPassword: string;
  }>({
    email: "",
    fullName: "",
    phone: "",
    role: UserRole.PLATFORM_ADMIN,
    tempPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/superadmin/users");
      const json = await res.json();
      setUsers(json.users || []);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/superadmin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to provision user.");
      }
      setShowModal(false);
      setForm({
        email: "",
        fullName: "",
        phone: "",
        role: UserRole.PLATFORM_ADMIN,
        tempPassword: "",
      });
      fetchUsers();
    } catch (err: unknown) {
      const e = err as Error;
      alert(e.message || "Failed to create user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentActive: boolean) => {
    try {
      const res = await fetch("/api/superadmin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, isActive: !currentActive }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update status.");
      }
      fetchUsers();
    } catch (err: unknown) {
      const e = err as Error;
      alert(e.message || "Action failed.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Platform Users & Operators ({users.length})</h1>
          <p className="mt-1 text-xs text-slate-500">
            Internal Gyrex platform staff, operations teams, and cross-tenant laboratory administrators.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-600 transition"
        >
          + Provision Platform Operator
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading platform operators...</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Operator Name</th>
                  <th className="px-4 py-3">Email Address</th>
                  <th className="px-4 py-3">Role Type</th>
                  <th className="px-4 py-3">Assigned Role</th>
                  <th className="px-4 py-3">Lab Tenant Scoping</th>
                  <th className="px-4 py-3">Account Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900">{u.fullName}</td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3">
                      {u.isPlatformUser ? (
                        <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700 border border-sky-200">
                          PLATFORM
                        </span>
                      ) : (
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                          TENANT
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-800">{u.role}</td>
                    <td className="px-4 py-3">
                      {u.labMemberships.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {u.labMemberships.map((lm) => (
                            <span key={lm.labId} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700 border border-slate-200">
                              {lm.labName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">Global Platform Scope</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <SuperadminStatusBadge status={u.isActive ? "ACTIVE" : "SUSPENDED"} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(u.id, u.isActive)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                      >
                        {u.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-base font-bold text-slate-900">Provision Platform Operator</h2>
            <p className="mt-1 text-xs text-slate-500">
              Only platform administrator roles can be provisioned through Superadmin.
            </p>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 mb-1 font-medium">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Malhotra"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-medium">Work Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="v.malhotra@gyrex.in"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-medium">Platform Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                >
                  <option value={UserRole.PLATFORM_ADMIN}>PLATFORM_ADMIN</option>
                  <option value={UserRole.OPERATIONS_ADMIN}>OPERATIONS_ADMIN</option>
                  <option value={UserRole.FINANCE_ADMIN}>FINANCE_ADMIN</option>
                  <option value={UserRole.SUPPORT_ADMIN}>SUPPORT_ADMIN</option>
                  <option value={UserRole.CATALOGUE_ADMIN}>CATALOGUE_ADMIN</option>
                  <option value={UserRole.SUPERADMIN}>SUPERADMIN</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-medium">Initial Password (Optional)</label>
                <input
                  type="password"
                  placeholder="Leave blank for secure auto-generated temporary key"
                  value={form.tempPassword}
                  onChange={(e) => setForm({ ...form, tempPassword: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-sky-500 px-4 py-2 font-semibold text-white hover:bg-sky-600 transition shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Provisioning..." : "Provision Operator"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
