"use client";

import React, { useState, useEffect } from "react";
import { UserRole } from "@prisma/client";
import {
  Users,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Shield,
  ShieldCheck,
  UserCheck,
  Mail,
  Phone,
  RefreshCw,
  X,
  MoreVertical,
} from "lucide-react";

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
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

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
    if (!formData.fullName.trim() || !formData.email.trim()) {
      setNotification({ type: "error", message: "Please provide both full name and email." });
      return;
    }

    setInviting(true);
    setNotification(null);

    try {
      const res = await fetch("/api/lab/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          role: formData.role,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to invite staff member.");
      }

      setNotification({
        type: "success",
        message: `Staff member ${formData.fullName} added successfully.`,
      });
      setShowInviteModal(false);
      setFormData({ email: "", fullName: "", phone: "", role: UserRole.LAB_STAFF });
      fetchStaff();
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to invite staff member.",
      });
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
      setNotification({
        type: "error",
        message: err.message || "Failed to update staff status.",
      });
    }
  };

  const totalStaff = staff.length;
  const activeStaff = staff.filter((s) => s.isActive).length;
  const pendingStaff = 0; // Since current staff records represent invited/active memberships

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.LAB_OWNER:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200">
            <ShieldCheck className="h-3 w-3" />
            <span>LAB_OWNER</span>
          </span>
        );
      case UserRole.LAB_ADMIN:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700 border border-sky-200">
            <Shield className="h-3 w-3" />
            <span>LAB_ADMIN</span>
          </span>
        );
      case UserRole.LAB_STAFF:
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
            <UserCheck className="h-3 w-3" />
            <span>LAB_STAFF</span>
          </span>
        );
    }
  };

  const getRoleAccessDescription = (role: UserRole) => {
    switch (role) {
      case UserRole.LAB_OWNER:
        return "Full Laboratory Ownership & Financial Authority";
      case UserRole.LAB_ADMIN:
        return "Full Operational, Staff & Catalogue Management";
      case UserRole.LAB_STAFF:
      default:
        return "Orders, Sample Collection & Report Upload";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Laboratory Staff & Roles
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage who can access your laboratory operations, catalogue, and diagnostic reports.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-600 transition cursor-pointer"
        >
          <UserPlus className="h-4 w-4" />
          <span>Invite Staff Member</span>
        </button>
      </div>

      {notification && (
        <div
          className={`rounded-xl p-4 text-xs font-medium border flex items-center gap-2.5 ${
            notification.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-700"
              : "bg-emerald-50 border-emerald-200 text-emerald-700"
          }`}
        >
          {notification.type === "error" ? (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Total Staff</span>
          <p className="mt-1 text-2xl font-bold text-slate-900">{totalStaff}</p>
          <p className="text-[11px] text-slate-400 mt-1">Configured laboratory team accounts</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-xs">
          <span className="text-xs font-medium text-emerald-800">Active</span>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{activeStaff}</p>
          <p className="text-[11px] text-emerald-600/80 mt-1">Authorized for operational login</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Pending Invitations</span>
          <p className="mt-1 text-2xl font-bold text-slate-900">{pendingStaff}</p>
          <p className="text-[11px] text-slate-400 mt-1">Awaiting acceptance</p>
        </div>
      </div>

      {/* Staff Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 text-slate-500">
            <RefreshCw className="h-6 w-6 animate-spin text-sky-500" />
            <span className="mt-3 text-sm">Loading staff members...</span>
          </div>
        ) : staff.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No staff members found. Click &quot;Invite Staff Member&quot; to add your first team account.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-600">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Email / Phone</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Access Level</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {staff.map((s) => (
                  <tr key={s.labUserId} className="transition hover:bg-slate-50/60">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {s.fullName}
                    </td>

                    <td className="py-3.5 px-4 text-xs">
                      <p className="text-slate-900 flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-slate-400" />
                        <span>{s.email}</span>
                      </p>
                      {s.phone && (
                        <p className="text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span>{s.phone}</span>
                        </p>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {getRoleBadge(s.role)}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs">
                      {getRoleAccessDescription(s.role)}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold border ${
                          s.isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {s.isActive ? "Active" : "Deactivated"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {new Date(s.joinedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {s.role !== UserRole.LAB_OWNER ? (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(s.labUserId, s.isActive)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-medium border transition cursor-pointer ${
                            s.isActive
                              ? "border-rose-200 bg-rose-50/50 text-rose-700 hover:bg-rose-100"
                              : "border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                        >
                          {s.isActive ? "Deactivate" : "Activate"}
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Primary Owner</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Invite Staff Member</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Grant operational access to your diagnostic laboratory.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Dr. Ramesh Kumar"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ramesh@sharmadiagnostics.com"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Phone Number</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Assigned Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                >
                  <option value={UserRole.LAB_STAFF}>
                    LAB_STAFF (Orders, Collections, Upload Reports)
                  </option>
                  <option value={UserRole.LAB_ADMIN}>
                    LAB_ADMIN (Full Operational & Catalogue Management)
                  </option>
                  <option value={UserRole.LAB_OWNER}>
                    LAB_OWNER (Full Laboratory Ownership)
                  </option>
                </select>
                <p className="mt-1 text-[11px] text-slate-500">
                  Platform administrator roles (SUPERADMIN) cannot be granted from this console.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="rounded-lg bg-sky-500 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-600 transition disabled:opacity-50"
                >
                  {inviting ? "Inviting..." : "Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
