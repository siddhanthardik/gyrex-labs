import React from "react";
import { getPlatformNotifications } from "@/services/superadmin/system-service";
import { SuperadminEmptyState } from "@/components/superadmin/SuperadminEmptyState";

export const dynamic = "force-dynamic";

export default async function SuperadminNotificationsPage() {
  const notifications = await getPlatformNotifications();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Platform System Notifications ({notifications.length})</h1>
        <p className="mt-1 text-xs text-zinc-400">
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
            <div key={n.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white text-xs">{n.title}</span>
                <span className="text-[10px] font-mono text-zinc-500">{new Date(n.sentAt).toLocaleString()}</span>
              </div>
              <p className="text-xs text-zinc-400">{n.message}</p>
              <div className="flex items-center gap-2 pt-2 text-[10px] text-zinc-500 font-mono">
                <span className="rounded bg-zinc-800 px-1.5 py-0.5">{n.channel}</span>
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
