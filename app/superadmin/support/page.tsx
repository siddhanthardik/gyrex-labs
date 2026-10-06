"use client";

import React, { useEffect, useState } from "react";
import { SuperadminStatusBadge } from "@/components/superadmin/SuperadminStatusBadge";
import { SuperadminEmptyState } from "@/components/superadmin/SuperadminEmptyState";
import { TicketStatus, TicketPriority } from "@prisma/client";

interface TicketItem {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  labId: string | null;
  labName: string;
  createdByName: string;
  assignedToName: string;
  createdAt: string;
  closedAt: string | null;
}

export default function SuperadminSupportPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/superadmin/support?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load tickets");
      const json = await res.json();
      setTickets(json.tickets || []);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  const handleUpdateTicket = async (ticketId: string, status: TicketStatus) => {
    try {
      const res = await fetch("/api/superadmin/support", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, status }),
      });
      if (!res.ok) throw new Error("Failed to update ticket");
      fetchTickets();
    } catch {
      alert("Unable to update ticket status.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Platform Partner Support ({tickets.length})</h1>
        <p className="mt-1 text-xs text-slate-500">
          Operational inquiries and technical support tickets raised by diagnostic laboratories.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets by ticket ID, subject, or description..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </div>

        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </div>

        <button
          type="button"
          onClick={fetchTickets}
          className="rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-600 transition shadow-xs"
        >
          Search
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading support tickets...</div>
      ) : tickets.length === 0 ? (
        <SuperadminEmptyState
          title="No Open Support Tickets"
          description="There are currently no tickets matching your filter criteria."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Ticket ID</th>
                  <th className="px-4 py-3">Laboratory</th>
                  <th className="px-4 py-3">Subject & Category</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Assigned Operator</th>
                  <th className="px-4 py-3">Created Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {t.ticketNumber}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {t.labName}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{t.subject}</p>
                      <p className="text-[10px] text-slate-400">{t.category}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          t.priority === "URGENT" || t.priority === "HIGH"
                            ? "text-rose-600"
                            : "text-slate-500"
                        }`}
                      >
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <SuperadminStatusBadge status={t.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {t.assignedToName}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {t.status !== TicketStatus.RESOLVED && t.status !== TicketStatus.CLOSED ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateTicket(t.id, TicketStatus.RESOLVED)}
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 transition shadow-2xs"
                        >
                          Mark Resolved ✓
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUpdateTicket(t.id, TicketStatus.OPEN)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                        >
                          Reopen
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
