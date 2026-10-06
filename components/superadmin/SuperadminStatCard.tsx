import React from "react";
import { Badge } from "@/components/ui/Badge";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  badge?: string;
  badgeVariant?: "success" | "warning" | "danger" | "info" | "neutral";
  icon?: React.ReactNode;
  iconBgColor?: string;
}

export function SuperadminStatCard({
  title,
  value,
  subtitle,
  badge,
  badgeVariant = "neutral",
  icon,
  iconBgColor = "bg-sky-50 text-sky-600 border border-sky-100",
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-slate-300 flex items-start gap-3.5">
      {icon && (
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBgColor}`}>
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900">{value}</span>
          {badge && (
            <Badge variant={badgeVariant} size="sm" className="text-[10px] px-1.5 py-0.5 font-semibold">
              {badge}
            </Badge>
          )}
        </div>
        {subtitle && <p className="mt-0.5 text-xs text-slate-400 truncate">{subtitle}</p>}
      </div>
    </div>
  );
}
