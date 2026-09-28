import React from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  badge?: string;
  badgeVariant?: "success" | "warning" | "danger" | "info" | "neutral";
  icon?: string;
}

export function SuperadminStatCard({
  title,
  value,
  subtitle,
  badge,
  badgeVariant = "neutral",
  icon,
}: StatCardProps) {
  const badgeStyles = {
    success: "text-emerald-700 bg-emerald-50 border-emerald-200",
    warning: "text-amber-700 bg-amber-50 border-amber-200",
    danger: "text-rose-700 bg-rose-50 border-rose-200",
    info: "text-blue-700 bg-blue-50 border-blue-200",
    neutral: "text-slate-600 bg-slate-100 border-slate-200",
  }[badgeVariant];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">{title}</span>
        {icon && <span className="text-lg">{icon}</span>}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-slate-900">{value}</span>
        {badge && (
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${badgeStyles}`}>
            {badge}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}
