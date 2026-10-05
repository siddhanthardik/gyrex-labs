import React from "react";
import { Badge } from "@/components/ui/Badge";

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

  const badgeVariant = resolvedVariant === "default" ? "neutral" : resolvedVariant;
  const formatted = status.replace(/_/g, " ");

  return (
    <Badge
      variant={badgeVariant as "success" | "warning" | "danger" | "info" | "neutral"}
      className="uppercase font-semibold tracking-wide text-[11px]"
    >
      {formatted}
    </Badge>
  );
}
