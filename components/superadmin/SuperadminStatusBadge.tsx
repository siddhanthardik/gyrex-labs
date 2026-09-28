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
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
    neutral: "bg-slate-100 text-slate-600 border-slate-200",
    default: "bg-slate-100 text-slate-700 border-slate-200",
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
