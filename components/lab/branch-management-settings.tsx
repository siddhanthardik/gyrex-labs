"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  ShieldCheck,
  MapPin,
  Clock,
  Phone,
  Mail,
  Edit2,
  X,
  Users,
} from "lucide-react";

interface Branch {
  id: string;
  name: string;
  code: string;
  phone: string | null;
  email: string | null;
  addressLine1: string;
  locality: string | null;
  city: string;
  state: string;
  postalCode: string;
  homeCollectionAvailable: boolean;
  homeCollectionFee: number | null;
  freeHomeCollectionThreshold: number | null;
  maxDailyCapacity: number | null;
  priority: number;
  isActive: boolean;
  _count?: {
    serviceAreas: number;
    collections: number;
  };
}

export function BranchManagementSettings() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [canManageBranches, setCanManageBranches] = useState(false);
  const [assignmentMode, setAssignmentMode] = useState<"AUTOMATIC" | "PATIENT_CHOICE">("AUTOMATIC");
  const [loading, setLoading] = useState(true);
  const [savingMode, setSavingMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [locality, setLocality] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [homeCollectionAvailable, setHomeCollectionAvailable] = useState(true);
  const [homeCollectionFee, setHomeCollectionFee] = useState("");
  const [freeHomeCollectionThreshold, setFreeHomeCollectionThreshold] = useState("");
  const [maxDailyCapacity, setMaxDailyCapacity] = useState("");
  const [priority, setPriority] = useState("5");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lab/branches");
      if (res.ok) {
        const data = await res.json();
        setBranches(data.branches || []);
        setCanManageBranches(Boolean(data.canManageBranches));
        if (data.assignmentMode) {
          setAssignmentMode(data.assignmentMode);
        }
      }
    } catch {
      setNotification({
        type: "error",
        message: "Failed to load branch details.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingBranch(null);
    setName("");
    setCode("");
    setPhone("");
    setEmail("");
    setAddressLine1("");
    setLocality("");
    setCity("");
    setState("");
    setPostalCode("");
    setHomeCollectionAvailable(true);
    setHomeCollectionFee("");
    setFreeHomeCollectionThreshold("");
    setMaxDailyCapacity("50");
    setPriority("5");
    setModalOpen(true);
  };

  const openEditModal = (b: Branch) => {
    setEditingBranch(b);
    setName(b.name);
    setCode(b.code);
    setPhone(b.phone || "");
    setEmail(b.email || "");
    setAddressLine1(b.addressLine1);
    setLocality(b.locality || "");
    setCity(b.city);
    setState(b.state);
    setPostalCode(b.postalCode);
    setHomeCollectionAvailable(b.homeCollectionAvailable);
    setHomeCollectionFee(b.homeCollectionFee !== null ? String(b.homeCollectionFee) : "");
    setFreeHomeCollectionThreshold(
      b.freeHomeCollectionThreshold !== null ? String(b.freeHomeCollectionThreshold) : ""
    );
    setMaxDailyCapacity(b.maxDailyCapacity !== null ? String(b.maxDailyCapacity) : "");
    setPriority(String(b.priority));
    setModalOpen(true);
  };

  const handleAssignmentModeChange = async (newMode: "AUTOMATIC" | "PATIENT_CHOICE") => {
    setSavingMode(true);
    setNotification(null);
    try {
      const res = await fetch("/api/lab/branches/assignment-mode", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentMode: newMode }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update assignment mode.");
      }
      setAssignmentMode(newMode);
      setNotification({
        type: "success",
        message: `Branch assignment mode updated to ${
          newMode === "AUTOMATIC" ? "Automatic Routing" : "Patient Choice"
        }.`,
      });
    } catch (err: unknown) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to update assignment mode.",
      });
    } finally {
      setSavingMode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    if (!name.trim() || !code.trim() || !addressLine1.trim() || !city.trim() || !state.trim()) {
      setNotification({
        type: "error",
        message: "Branch name, code, address, city, and state are required.",
      });
      return;
    }

    if (!/^[1-9][0-9]{5}$/.test(postalCode.trim())) {
      setNotification({
        type: "error",
        message: "Please enter a valid 6-digit Indian PIN code.",
      });
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        addressLine1: addressLine1.trim(),
        locality: locality.trim() || undefined,
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim(),
        homeCollectionAvailable,
        homeCollectionFee: homeCollectionFee ? parseFloat(homeCollectionFee) : null,
        freeHomeCollectionThreshold: freeHomeCollectionThreshold
          ? parseFloat(freeHomeCollectionThreshold)
          : null,
        maxDailyCapacity: maxDailyCapacity ? parseInt(maxDailyCapacity, 10) : null,
        priority: parseInt(priority, 10) || 5,
      };

      const url = editingBranch ? `/api/lab/branches/${editingBranch.id}` : "/api/lab/branches";
      const method = editingBranch ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save branch.");
      }

      setModalOpen(false);
      setNotification({
        type: "success",
        message: editingBranch
          ? `Branch "${name}" updated successfully.`
          : `Branch "${name}" created successfully.`,
      });
      await loadData();
    } catch (err: unknown) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save branch.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (branch: Branch) => {
    if (
      !confirm(
        `Are you sure you want to delete branch "${branch.name}"? If historical orders exist, it will be safely deactivated.`
      )
    ) {
      return;
    }

    setActionLoading(true);
    setNotification(null);
    try {
      const res = await fetch(`/api/lab/branches/${branch.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete branch.");
      }
      setNotification({
        type: "success",
        message: data.message || `Branch "${branch.name}" removed successfully.`,
      });
      await loadData();
    } catch (err: unknown) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to delete branch.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Non-Enterprise Banner */}
      {!loading && !canManageBranches && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-6 sm:p-8 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <Lock className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-amber-950">
                Enterprise Multi-Location Management
              </h2>
              <p className="text-xs text-amber-900 leading-relaxed max-w-2xl">
                Multi-branch management enables diagnostic chains and hospital networks to run multiple physical collection centers, configure branch-level service areas, and automatically route phlebotomists or offer patient branch choice.
              </p>
              <div className="pt-3">
                <a
                  href="mailto:enterprise@gyrex.in?subject=Gyrex%20Labs%20Enterprise%20Upgrade"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-800 transition"
                >
                  <span>Inquire About Gyrex Enterprise</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Enterprise Management UI */}
      {canManageBranches && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-sky-600" />
                <h2 className="text-base font-semibold text-slate-900">
                  Branches &amp; Multi-Location Hubs
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Configure physical collection centers, set daily capacity, and choose sample allocation behavior.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-700 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Branch</span>
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

          {/* Assignment Mode Configuration */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Branch Assignment Mode
            </h3>
            <p className="text-xs text-slate-500">
              Determine how incoming patient orders are allocated among your branches.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label
                className={`flex cursor-pointer items-start gap-3 p-4 rounded-xl border-2 transition ${
                  assignmentMode === "AUTOMATIC"
                    ? "border-sky-600 bg-white shadow-xs"
                    : "border-slate-200 bg-white/70 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="assignmentMode"
                  value="AUTOMATIC"
                  checked={assignmentMode === "AUTOMATIC"}
                  onChange={() => handleAssignmentModeChange("AUTOMATIC")}
                  disabled={savingMode}
                  className="mt-0.5 text-sky-600"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900">Automatic Routing (Smart Mode)</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Gyrex automatically assigns incoming patient bookings to the highest-priority branch serving the patient&apos;s PIN code with available daily capacity.
                  </p>
                </div>
              </label>

              <label
                className={`flex cursor-pointer items-start gap-3 p-4 rounded-xl border-2 transition ${
                  assignmentMode === "PATIENT_CHOICE"
                    ? "border-sky-600 bg-white shadow-xs"
                    : "border-slate-200 bg-white/70 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="assignmentMode"
                  value="PATIENT_CHOICE"
                  checked={assignmentMode === "PATIENT_CHOICE"}
                  onChange={() => handleAssignmentModeChange("PATIENT_CHOICE")}
                  disabled={savingMode}
                  className="mt-0.5 text-sky-600"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900">Patient Choice Mode</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Patients select their preferred collection center during checkout from among all branches serving their postal PIN code.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Branches List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Configured Branches ({branches.length})
            </h3>

            {loading ? (
              <div className="text-center py-8 text-xs text-slate-500">
                Loading branches…
              </div>
            ) : branches.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                <Building2 className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-700">No branches added yet</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Click &quot;Add Branch&quot; to register your first regional collection center.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {branches.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 shadow-2xs hover:border-slate-300 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{b.name}</h4>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700">
                            {b.code}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>
                            {b.addressLine1}, {b.locality ? `${b.locality}, ` : ""}{b.city}, {b.postalCode}
                          </span>
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          b.isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {b.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50/70 p-2.5 rounded-lg">
                      <div>
                        <span className="text-slate-400">Daily Capacity: </span>
                        <span className="font-semibold text-slate-800">
                          {b.maxDailyCapacity ? `${b.maxDailyCapacity} orders/day` : "Unlimited"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Home Fee: </span>
                        <span className="font-semibold text-slate-800">
                          {b.homeCollectionFee !== null ? `₹${b.homeCollectionFee}` : "Lab Default"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Assigned PINs: </span>
                        <span className="font-semibold text-slate-800">
                          {b._count?.serviceAreas ?? 0} PINs
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Total Bookings: </span>
                        <span className="font-semibold text-slate-800">
                          {b._count?.collections ?? 0}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => openEditModal(b)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-sky-700 rounded transition"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(b)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-800 rounded transition"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal for Create/Edit Branch */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {editingBranch ? `Edit Branch: ${editingBranch.name}` : "Create New Branch"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Branch Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Koramangala Hub"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Branch Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. BLR-KOR"
                    className="w-full rounded-lg border border-slate-300 p-2 font-mono text-xs uppercase text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit phone"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="branch@lab.com"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Address Line 1 *
                </label>
                <input
                  type="text"
                  required
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="Street / Building"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Locality
                  </label>
                  <input
                    type="text"
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    placeholder="Area"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    PIN Code *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="6-digit PIN"
                    className="w-full rounded-lg border border-slate-300 p-2 font-mono text-xs text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  State *
                </label>
                <input
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Max Daily Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={maxDailyCapacity}
                    onChange={(e) => setMaxDailyCapacity(e.target.value)}
                    placeholder="e.g. 50 orders/day"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Routing Priority (1-10)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    placeholder="5 (Higher = Earlier)"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Collection Fee Override (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={homeCollectionFee}
                    onChange={(e) => setHomeCollectionFee(e.target.value)}
                    placeholder="Leave empty for default"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Free Threshold Override (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={freeHomeCollectionThreshold}
                    onChange={(e) => setFreeHomeCollectionThreshold(e.target.value)}
                    placeholder="Leave empty for default"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="homeCollectionAvailable"
                  checked={homeCollectionAvailable}
                  onChange={(e) => setHomeCollectionAvailable(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <label htmlFor="homeCollectionAvailable" className="text-xs font-semibold text-slate-700">
                  Enable Home Sample Collection for this Branch
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50 transition"
                >
                  {actionLoading ? "Saving…" : editingBranch ? "Save Changes" : "Create Branch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
