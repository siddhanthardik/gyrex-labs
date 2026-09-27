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
    success: "text-emerald-400 bg-emerald-950/60 border-emerald-800/40",
    warning: "text-amber-400 bg-amber-950/60 border-amber-800/40",
    danger: "text-rose-400 bg-rose-950/60 border-rose-800/40",
    info: "text-indigo-400 bg-indigo-950/60 border-indigo-800/40",
    neutral: "text-zinc-400 bg-zinc-800 border-zinc-700",
  }[badgeVariant];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-sm transition hover:border-zinc-700">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">{title}</span>
        {icon && <span className="text-lg">{icon}</span>}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-white">{value}</span>
        {badge && (
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${badgeStyles}`}>
            {badge}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>}
    </div>
  );
}
