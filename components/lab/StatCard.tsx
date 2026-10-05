import React from "react";
import { Card } from "@/components/ui/Card";

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
  const variantStyles = {
    default: "bg-white hover:border-slate-300",
    success: "border-emerald-200 bg-emerald-50/50 hover:border-emerald-300",
    warning: "border-amber-200 bg-amber-50/50 hover:border-amber-300",
    info: "border-sky-200 bg-sky-50/50 hover:border-sky-300",
  }[variant];

  return (
    <Card className={`relative overflow-hidden ${variantStyles}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        {icon && <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm">{icon}</span>}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-slate-900">{value}</span>
        {badge}
      </div>

      {helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
    </Card>
  );
}
