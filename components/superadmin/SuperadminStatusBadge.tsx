import React from "react";

interface StatusBadgeProps {
  status: string;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "neutral";
}

export function SuperadminStatusBadge({ status, variant }: StatusBadgeProps) {
  let resolvedVariant = variant;

  if (!resolvedVariant) {
    const s = status.toUpperCase();
    if (["ACTIVE", "VERIFIED", "PAID", "FINAL", "RESOLVED", "OPERATIONAL"].includes(s)) {
      resolvedVariant = "success";
    } else if (["PENDING", "PENDING_VERIFICATION", "TRIALING", "IN_PROGRESS", "OPEN", "ISSUED", "DRAFT"].includes(s)) {
      resolvedVariant = "warning";
    } else if (["SUSPENDED", "REJECTED", "FAILED", "CANCELLED", "VOID", "UNCOLLECTIBLE", "SECURITY_ALERT"].includes(s)) {
      resolvedVariant = "danger";
    } else if (["PAST_DUE", "AMENDED", "PROCESSING"].includes(s)) {
      resolvedVariant = "info";
    } else {
      resolvedVariant = "neutral";
    }
  }

  const styles = {
    success: "bg-emerald-950/80 text-emerald-400 border-emerald-800/60",
    warning: "bg-amber-950/80 text-amber-400 border-amber-800/60",
    danger: "bg-rose-950/80 text-rose-400 border-rose-800/60",
    info: "bg-indigo-950/80 text-indigo-400 border-indigo-800/60",
    neutral: "bg-zinc-900 text-zinc-400 border-zinc-800",
    default: "bg-zinc-900 text-zinc-300 border-zinc-800",
  }[resolvedVariant];

  const formatted = status.replace(/_/g, " ");

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide border uppercase ${styles}`}
    >
      {formatted}
    </span>
  );
}
