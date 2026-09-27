"use client";

import React, { useState, useEffect } from "react";
import { UserRole } from "@prisma/client";

interface StaffMember {
  labUserId: string;
  userId: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  joinedAt: string;
}

export default function LabStaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [formData, setFormData] = useState<{
    email: string;
    fullName: string;
    phone: string;
    role: UserRole;
  }>({
    email: "",
    fullName: "",
    phone: "",
    role: UserRole.LAB_STAFF,
  });

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lab/staff");
      if (res.ok) {
        const data = await res.json();
        setStaff(data.staff || []);
      }
    } catch (err) {
      console.error("Failed to load staff:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setNotification(null);

    try {
      const res = await fetch("/api/lab/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to invite staff member.");
      }

      setNotification({ type: "success", message: `Staff member ${formData.fullName} added successfully.` });
      setShowInviteModal(false);
      setFormData({ email: "", fullName: "", phone: "", role: UserRole.LAB_STAFF });
      fetchStaff();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Failed to add staff." });
    } finally {
      setInviting(false);
    }
  };

  const handleToggleStatus = async (labUserId: string, currentActive: boolean) => {
    try {
      const res = await fetch("/api/lab/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labUserId,
          isActive: !currentActive,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update staff status.");
      }

      setNotification({
        type: "success",
        message: currentActive ? "Staff member deactivated." : "Staff member reactivated.",
      });
      fetchStaff();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Failed to update staff status." });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Laboratory Staff & Roles</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Manage who has access to your diagnostic laboratory operations, catalogue, and reports.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-sky-500/20 hover:bg-sky-400 transition"
        >
          <span>+ Invite New Staff Member</span>
        </button>
      </div>

      {notification && (
        <div
          className={`rounded-xl p-4 text-xs font-medium border ${
            notification.type === "error"
              ? "bg-rose-500/10 border-rose-500/25 text-rose-400"
              : "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Staff Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-16 text-zinc-400">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
            <span className="ml-3 text-sm">Loading staff members...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/60 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {staff.map((s) => (
                  <tr key={s.labUserId} className="transition hover:bg-zinc-800/20">
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-white">{s.fullName}</p>
                    </td>

                    <td className="py-3.5 px-4 text-xs">
                      <p className="text-zinc-200">{s.email}</p>
                      {s.phone && <p className="text-zinc-400">{s.phone}</p>}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="rounded bg-sky-500/10 px-2.5 py-0.5 text-xs font-bold text-sky-400 border border-sky-500/20">
                        {s.role}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-zinc-400">
                      {new Date(s.joinedAt).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold border ${
                          s.isActive
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-zinc-800 text-zinc-400 border-zinc-700"
                        }`}
                      >
                        {s.isActive ? "Active" : "Deactivated"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {s.role !== UserRole.LAB_OWNER && (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(s.labUserId, s.isActive)}
                          className={`rounded px-2.5 py-1 text-xs font-medium border transition ${
                            s.isActive
                              ? "border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                              : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                          }`}
                        >
                          {s.isActive ? "Deactivate" : "Activate"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white">Add / Invite Staff Member</h3>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Dr. Ramesh Kumar"
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ramesh@sharmadiagnostics.com"
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">Phone Number</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">Assigned Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                >
                  <option value={UserRole.LAB_STAFF}>LAB_STAFF (Orders, Collections, Upload Reports)</option>
                  <option value={UserRole.LAB_ADMIN}>LAB_ADMIN (Full Operational & Catalogue Management)</option>
                  <option value={UserRole.LAB_OWNER}>LAB_OWNER (Full Laboratory Ownership)</option>
                </select>
                <p className="mt-1 text-[11px] text-zinc-400">
                  Platform administrator roles (SUPERADMIN) cannot be granted.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="rounded-lg bg-sky-500 px-5 py-2 text-xs font-semibold text-white hover:bg-sky-400 transition disabled:opacity-50"
                >
                  {inviting ? "Inviting..." : "Add Staff Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
