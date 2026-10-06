import React from "react";

export type StatCardVariant =
  | "default"
  | "sky"
  | "info"
  | "emerald"
  | "success"
  | "amber"
  | "warning"
  | "teal"
  | "rose";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  helperText?: string;
  badge?: React.ReactNode;
  variant?: StatCardVariant;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon,
  helperText,
  badge,
  variant = "default",
  className = "",
}: StatCardProps) {
  const iconContainerStyles: Record<StatCardVariant, string> = {
    default: "bg-slate-100 text-slate-700 border-slate-200",
    sky: "bg-sky-50 text-sky-600 border-sky-100",
    info: "bg-sky-50 text-sky-600 border-sky-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    success: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    warning: "bg-amber-50 text-amber-600 border-amber-100",
    teal: "bg-teal-50 text-teal-600 border-teal-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
  };

  return (
    <div
      className={`relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs transition-all hover:border-slate-300 ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        {icon && (
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
              iconContainerStyles[variant] || iconContainerStyles.default
            }`}
          >
            {icon}
          </span>
        )}
        {badge && <div className="shrink-0">{badge}</div>}
      </div>

      <div className="mt-3">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </span>
        </div>
      </div>

      {helperText && (
        <p className="mt-2 text-[11px] font-medium text-slate-400">
          {helperText}
        </p>
      )}
    </div>
  );
}
