import React from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  badge?: string;
  badgeVariant?: "success" | "warning" | "danger" | "info" | "neutral";
  icon?: React.ReactNode;
}

export function SuperadminStatCard({
  title,
  value,
  subtitle,
  badge,
  badgeVariant = "neutral",
  icon,
}: StatCardProps) {
  return (
    <Card className="hover:border-slate-300">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{title}</span>
        {icon && <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-700">{icon}</span>}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-slate-900">{value}</span>
        {badge && (
          <Badge variant={badgeVariant} size="sm" className="text-[10px] px-1.5 py-0.5">
            {badge}
          </Badge>
        )}
      </div>

      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </Card>
  );
}
