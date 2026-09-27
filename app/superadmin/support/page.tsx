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
        <h1 className="text-2xl font-bold tracking-tight text-white">Platform Partner Support ({tickets.length})</h1>
        <p className="mt-1 text-xs text-zinc-400">
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
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/80 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
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
          className="rounded-lg bg-zinc-800 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-700 transition"
        >
          Search
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-zinc-500">Loading support tickets...</div>
      ) : tickets.length === 0 ? (
        <SuperadminEmptyState
          title="No Open Support Tickets"
          description="There are currently no tickets matching your filter criteria."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-950 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
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
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-800/30 transition">
                  <td className="px-4 py-3 font-mono font-bold text-white">
                    {t.ticketNumber}
                  </td>
                  <td className="px-4 py-3 font-semibold text-zinc-200">
                    {t.labName}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-white">{t.subject}</p>
                    <p className="text-[10px] text-zinc-500">{t.category}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] font-bold uppercase ${
                        t.priority === "URGENT" || t.priority === "HIGH"
                          ? "text-rose-400"
                          : "text-zinc-400"
                      }`}
                    >
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <SuperadminStatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {t.assignedToName}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {t.status !== TicketStatus.RESOLVED && t.status !== TicketStatus.CLOSED ? (
                      <button
                        type="button"
                        onClick={() => handleUpdateTicket(t.id, TicketStatus.RESOLVED)}
                        className="rounded border border-emerald-800 bg-emerald-950/60 px-2 py-1 text-[11px] font-medium text-emerald-400 hover:bg-emerald-900/60 transition"
                      >
                        Mark Resolved ✓
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUpdateTicket(t.id, TicketStatus.OPEN)}
                        className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] font-medium text-zinc-300 hover:bg-zinc-700 transition"
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
      )}
    </div>
  );
}
