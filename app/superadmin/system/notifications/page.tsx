import React from "react";
import { getPlatformNotifications } from "@/services/superadmin/system-service";
import { SuperadminEmptyState } from "@/components/superadmin/SuperadminEmptyState";

export const dynamic = "force-dynamic";

export default async function SuperadminNotificationsPage() {
  const notifications = await getPlatformNotifications();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Platform System Notifications ({notifications.length})</h1>
        <p className="mt-1 text-xs text-slate-500">
          Automated transactional alerts, laboratory onboarding notifications, and subscription renewals.
        </p>
      </div>

      {notifications.length === 0 ? (
        <SuperadminEmptyState
          title="No Platform Notifications"
          description="There are currently no platform notifications dispatched."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div key={n.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 text-xs">{n.title}</span>
                <span className="text-[10px] font-mono text-slate-400">{new Date(n.sentAt).toLocaleString()}</span>
              </div>
              <p className="text-xs text-slate-600">{n.message}</p>
              <div className="flex items-center gap-2 pt-2 text-[10px] text-slate-500 font-mono">
                <span className="rounded bg-slate-100 text-slate-700 px-1.5 py-0.5 border border-slate-200 font-semibold">{n.channel}</span>
                <span>Recipient: {n.recipientType}</span>
                <span>• {n.labName}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
