import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  helperText?: string;
  badge?: React.ReactNode;
  variant?: "default" | "success" | "warning" | "info";
}

export function StatCard({
  label,
  value,
  icon,
  helperText,
  badge,
  variant = "default",
}: StatCardProps) {
  const borderStyles = {
    default: "border-slate-200 bg-white hover:border-blue-200",
    success: "border-emerald-200 bg-emerald-50 hover:border-emerald-300",
    warning: "border-amber-200 bg-amber-50 hover:border-amber-300",
    info: "border-blue-200 bg-blue-50 hover:border-blue-300",
  }[variant];

  return (
    <div
      className={`relative overflow-hidden rounded-xl border p-5 shadow-sm transition ${borderStyles}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        {icon && <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm">{icon}</span>}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-slate-900">{value}</span>
        {badge}
      </div>

      {helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
    </div>
  );
}
