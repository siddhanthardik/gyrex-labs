import React from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";

export interface AlertProps {
  variant?: "success" | "warning" | "error" | "info";
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export function Alert({ variant = "info", title, children, onClose, className = "" }: AlertProps) {
  const config = {
    success: {
      style: "bg-emerald-50 border-emerald-200 text-emerald-800",
      icon: CheckCircle2,
      iconColor: "text-emerald-600",
    },
    warning: {
      style: "bg-amber-50 border-amber-200 text-amber-800",
      icon: AlertTriangle,
      iconColor: "text-amber-600",
    },
    error: {
      style: "bg-rose-50 border-rose-200 text-rose-800",
      icon: AlertCircle,
      iconColor: "text-rose-600",
    },
    info: {
      style: "bg-sky-50 border-sky-200 text-sky-800",
      icon: Info,
      iconColor: "text-sky-600",
    },
  }[variant];

  const Icon = config.icon;

  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 text-xs transition ${config.style} ${className}`}>
      <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${config.iconColor}`} />
      <div className="flex-1 min-w-0">
        {title && <h5 className="font-semibold text-slate-900 mb-0.5">{title}</h5>}
        <div className="leading-relaxed">{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
