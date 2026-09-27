import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: string;
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
    default: "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700",
    success: "border-emerald-500/20 bg-emerald-950/20 hover:border-emerald-500/30",
    warning: "border-amber-500/20 bg-amber-950/20 hover:border-amber-500/30",
    info: "border-sky-500/20 bg-sky-950/20 hover:border-sky-500/30",
  }[variant];

  return (
    <div
      className={`relative overflow-hidden rounded-xl border p-5 shadow-sm transition backdrop-blur-sm ${borderStyles}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400">{label}</span>
        {icon && <span className="text-xl opacity-80">{icon}</span>}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-white">{value}</span>
        {badge}
      </div>

      {helperText && <p className="mt-1 text-xs text-zinc-400">{helperText}</p>}
    </div>
  );
}
